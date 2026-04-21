import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const ALLOWED_EXTENSION = ".glb";
const ALLOWED_MIME = "model/gltf-binary";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

/**
 * POST /api/upload-model
 *
 * Accepts multipart form data with:
 *   - file: GLB file (model/gltf-binary or .glb extension, max 50 MB)
 *   - restaurantId: UUID of the restaurant
 *
 * Returns:
 *   { url: string } — the public URL of the uploaded model
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth check ──
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse form data ──
    const formData = await req.formData();
    const file = formData.get("file");
    const restaurantId = formData.get("restaurantId");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!restaurantId || typeof restaurantId !== "string") {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    // ── Validate file type ──
    // Accept by MIME type or by filename extension
    const fileName =
      file instanceof File ? file.name : "model.glb";
    const isGlbMime = file.type === ALLOWED_MIME || file.type === "application/octet-stream";
    const isGlbExt = fileName.toLowerCase().endsWith(ALLOWED_EXTENSION);

    if (!isGlbMime && !isGlbExt) {
      return NextResponse.json(
        { error: "Only GLB (3D model) files are allowed" },
        { status: 400 }
      );
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 50 MB limit" },
        { status: 400 }
      );
    }

    // ── Upload to Supabase Storage "models" bucket ──
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const storagePath = `${restaurantId}/models/${timestamp}.glb`;

    const admin = getServiceClient();
    const { error: uploadError } = await admin.storage
      .from("models")
      .upload(storagePath, buffer, {
        contentType: ALLOWED_MIME,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = admin.storage
      .from("models")
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err: unknown) {
    console.error("[/api/upload-model]", err);
    const message =
      err instanceof Error ? err.message : "Model upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
