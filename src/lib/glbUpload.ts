/**
 * glbUpload.ts
 *
 * Production-grade GLB upload library:
 *   • Direct browser -> Supabase upload (Bypasses Vercel 4.5MB limit entirely)
 *   • No backend endpoints involved
 *   • Fake progress tracking (Supabase standard upload doesn't expose progress natively)
 *   • Max 3 retries
 */

import { createClient } from "@/lib/supabase/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_EXTENSION = ".glb";
const MAX_DIRECT_ATTEMPTS = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

export interface UploadCallbacks {
  onProgress?: (pct: number) => void;
  onStatus?: (status: UploadStatus, attempt?: number) => void;
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateGlbFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(ALLOWED_EXTENSION)) {
    return "Yalnızca .glb dosyaları desteklenir";
  }
  if (file.size < 12) {
    return "Dosya bozuk görünüyor";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `Dosya çok büyük: ${mb} MB (maks 100 MB)`;
  }
  return null;
}

// ── Master Entry Point ────────────────────────────────────────────────────────

export async function uploadGlb(
  file: File,
  restaurantId: string,
  callbacks: UploadCallbacks = {}
): Promise<string> {
  const { onProgress, onStatus } = callbacks;

  const validationError = validateGlbFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  // Ensure path is unique and safe
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, "");
  const path = `${restaurantId}/${Date.now()}_${safeName}`;
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);

  console.log(`[glbUpload] Starting direct upload for ${file.name} (${sizeMb}MB) -> ${path}`);

  for (let attempt = 1; attempt <= MAX_DIRECT_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) onStatus?.("retrying", attempt);
      else onStatus?.("uploading", attempt);

      // Start fake progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90; // cap at 90 until complete
        onProgress?.(Math.round(progress));
      }, 500);

      const { data, error } = await supabase.storage
        .from("models")
        .upload(path, file, {
          contentType: "model/gltf-binary",
          upsert: true,
        });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message);
      }

      // Finish progress
      onProgress?.(100);
      onStatus?.("completed");

      const { data: publicUrlData } = supabase.storage
        .from("models")
        .getPublicUrl(path);

      console.log("[glbUpload] Upload confirmed. Public URL:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
      
    } catch (err: any) {
      console.warn(`[glbUpload] Direct upload attempt ${attempt}/${MAX_DIRECT_ATTEMPTS} failed:`, err);
      
      if (attempt === MAX_DIRECT_ATTEMPTS) {
        onStatus?.("failed");
        console.error("UPLOAD_ERROR", err);
        throw new Error(err?.message || "Yükleme başarısız oldu");
      }

      // Exponential backoff before retry: 2s, 4s
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  throw new Error("Bilinmeyen bir yükleme hatası oluştu.");
}
