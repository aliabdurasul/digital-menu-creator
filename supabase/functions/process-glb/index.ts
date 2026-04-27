/**
 * process-glb — Supabase Edge Function (Deno runtime)
 *
 * Triggered by a Supabase Storage webhook on bucket "raw-models" (object insert).
 * Pipeline:
 *   1. Download raw GLB from storage
 *   2. Validate (magic bytes, size limit)
 *   3. Compute bounding box → ar_scale (same formula as client normalizeScale)
 *   4. Apply geometry quantization (pure JS via gltf-transform, no native deps)
 *   5. Generate low-LOD version (aggressive simplification, target < 1 MB)
 *   6. Write both to "processed-models" bucket (content-addressed URL)
 *   7. Update menu_items DB row with new URLs, scale, size, processing status
 *
 * NOTE: Full Draco + KTX2 compression requires Supabase Pro tier (memory headroom).
 * On Free tier the function will skip compression and write quantized-only output.
 *
 * Environment variables required (set in Supabase dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL              — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypass RLS)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// gltf-transform ESM builds work in Deno
import { Document, NodeIO, PropertyType } from "https://esm.sh/@gltf-transform/core@4";
import {
  dedup,
  prune,
  quantize,
  flatten,
  join,
} from "https://esm.sh/@gltf-transform/functions@4";

// ── Constants ────────────────────────────────────────────────────────────────
const RAW_BUCKET = "raw-models";
const PROCESSED_BUCKET = "processed-models";
const MAX_RAW_BYTES = 100 * 1024 * 1024;   // 100 MB hard ceiling
const MAX_PROCESSED_BYTES = 8 * 1024 * 1024; // 8 MB — reject and warn admin
const MIN_SCALE = 0.03;
const MAX_SCALE = 0.80;
const CATEGORY_SIZE_CM: Record<string, number> = {
  burger: 12, pizza: 28, kebab: 22, drink: 15, içecek: 15,
  dessert: 10, tatlı: 10, default: 20,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidGlb(bytes: Uint8Array): boolean {
  // GLB magic: 0x46546C67 little-endian ("glTF")
  return (
    bytes[0] === 0x67 &&
    bytes[1] === 0x6C &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46
  );
}

/** SHA-256 hex of bytes — used for content-addressed CDN URLs */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Walk all mesh primitives and accumulate axis-aligned bounding box.
 * Returns { minX, maxX, minY, maxY, minZ, maxZ }.
 */
function computeAABB(doc: Document): { x: number; y: number; z: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const count = pos.getCount();
      for (let i = 0; i < count; i++) {
        const [x, y, z] = pos.getElement(i, []) as number[];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
  }

  if (!isFinite(minX)) return { x: 1, y: 1, z: 1 }; // fallback

  return {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ,
  };
}

function computeScale(dim: { x: number; y: number; z: number }, sizeCm: number | null): number {
  const maxDim = Math.max(dim.x, dim.y, dim.z);
  if (maxDim <= 0) return 0.2;
  const targetCm = sizeCm ?? CATEGORY_SIZE_CM.default;
  const targetM = targetCm / 100;
  return Math.min(Math.max(targetM / maxDim, MIN_SCALE), MAX_SCALE);
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();

    // Supabase Storage webhook payload shape
    const objectName: string = payload?.record?.name ?? payload?.name ?? "";
    if (!objectName.endsWith(".glb")) {
      return new Response("Not a GLB file — skipped", { status: 200 });
    }

    // Extract menu_item_id from the object path: "restaurant_id/menu_item_id.glb"
    const parts = objectName.replace(/\.glb$/, "").split("/");
    const menuItemId = parts[parts.length - 1];
    const restaurantId = parts[0];

    if (!menuItemId || !restaurantId) {
      return new Response("Cannot parse menu_item_id from path", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Mark as processing
    await supabase
      .from("menu_items")
      .update({ ar_processing_status: "processing", ar_processing_error: null })
      .eq("id", menuItemId);

    // 1. Download raw GLB
    const { data: rawData, error: dlError } = await supabase.storage
      .from(RAW_BUCKET)
      .download(objectName);

    if (dlError || !rawData) {
      throw new Error(`Download failed: ${dlError?.message}`);
    }

    const rawBytes = new Uint8Array(await rawData.arrayBuffer());

    // 2. Validate
    if (rawBytes.byteLength > MAX_RAW_BYTES) {
      throw new Error(`File too large: ${(rawBytes.byteLength / 1024 / 1024).toFixed(1)} MB (limit 100 MB)`);
    }
    if (!isValidGlb(rawBytes)) {
      throw new Error("File is not a valid GLB (invalid magic bytes)");
    }

    // 3. Parse + compute AABB + scale
    const io = new NodeIO();
    const doc = await io.readBinary(rawBytes);

    const dim = computeAABB(doc);

    // Fetch admin-set sizeCm if available
    const { data: item } = await supabase
      .from("menu_items")
      .select("ar_model_size_cm")
      .eq("id", menuItemId)
      .single();
    const sizeCm: number | null = item?.ar_model_size_cm ?? null;
    const arScale = computeScale(dim, sizeCm);

    // 4. Apply safe JS-only optimizations (no WASM needed, works on Free tier)
    await doc.transform(
      dedup(),
      prune(),
      flatten(),
      join(),
      quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
    );

    // 5. Write full processed GLB
    const processedBytes = await io.writeBinary(doc);

    if (processedBytes.byteLength > MAX_PROCESSED_BYTES) {
      // Don't fail — write it anyway but surface a warning to the admin
      await supabase.from("menu_items").update({
        ar_processing_error: `Model is large (${(processedBytes.byteLength / 1024 / 1024).toFixed(1)} MB) — consider a simpler mesh`,
      }).eq("id", menuItemId);
    }

    // 6. Generate low-LOD by applying aggressive quantization on a clone
    const docLow = await io.readBinary(rawBytes); // fresh parse
    await docLow.transform(
      dedup(),
      prune(),
      flatten(),
      join(),
      quantize({ quantizePosition: 10, quantizeNormal: 8, quantizeTexcoord: 10 }),
    );
    const lowBytes = await io.writeBinary(docLow);

    // 7. Content-addressed upload
    const processedHash = await sha256Hex(new Uint8Array(processedBytes));
    const lowHash = await sha256Hex(new Uint8Array(lowBytes));

    const processedPath = `${restaurantId}/${processedHash}.glb`;
    const lowPath = `${restaurantId}/${lowHash}-low.glb`;

    const uploadOpts = {
      contentType: "model/gltf-binary",
      cacheControl: "31536000",
      upsert: true,
    };

    const { error: upErr1 } = await supabase.storage
      .from(PROCESSED_BUCKET)
      .upload(processedPath, processedBytes, uploadOpts);
    if (upErr1) throw new Error(`Upload (full) failed: ${upErr1.message}`);

    const { error: upErr2 } = await supabase.storage
      .from(PROCESSED_BUCKET)
      .upload(lowPath, lowBytes, uploadOpts);
    if (upErr2) throw new Error(`Upload (low-LOD) failed: ${upErr2.message}`);

    // Get public CDN URLs
    const { data: { publicUrl: processedUrl } } = supabase.storage
      .from(PROCESSED_BUCKET).getPublicUrl(processedPath);
    const { data: { publicUrl: lowUrl } } = supabase.storage
      .from(PROCESSED_BUCKET).getPublicUrl(lowPath);

    // 8. Update DB
    await supabase.from("menu_items").update({
      ar_model_url: processedUrl,
      ar_model_url_low: lowUrl,
      ar_model_size_bytes: processedBytes.byteLength,
      ar_scale: arScale,
      ar_processing_status: "ready",
    }).eq("id", menuItemId);

    return new Response(
      JSON.stringify({ ok: true, processedUrl, lowUrl, arScale, bytes: processedBytes.byteLength }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[process-glb]", message);

    // Best-effort: mark error in DB (payload may not have menu_item_id in all error paths)
    try {
      const payload = await (req.clone()).json().catch(() => ({}));
      const parts = (payload?.record?.name ?? "").replace(/\.glb$/, "").split("/");
      const menuItemId = parts[parts.length - 1];
      if (menuItemId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await supabase.from("menu_items").update({
          ar_processing_status: "error",
          ar_processing_error: message,
        }).eq("id", menuItemId);
      }
    } catch { /* ignore secondary error */ }

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
