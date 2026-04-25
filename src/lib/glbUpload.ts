/**
 * glbUpload.ts
 *
 * Production-grade GLB upload library with hybrid routing:
 *   • files < 10 MB  → Path A (legacy /api/upload-model, unchanged)
 *   • files ≥ 10 MB  → Path B (direct presigned TUS upload to Supabase)
 *
 * If Path B fails for any reason, it automatically falls back to Path A.
 * No external UI dependencies — pure logic + callbacks.
 */

import * as tus from "tus-js-client";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIRECT_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE_BYTES    = 100 * 1024 * 1024; // 100 MB
const TUS_CHUNK_SIZE         = 6 * 1024 * 1024;   // 6 MB (Supabase minimum is 5 MB)
const ALLOWED_EXTENSION      = ".glb";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadMode   = "legacy" | "direct";
export type UploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

export interface UploadCallbacks {
  /** Called each time progress updates (0–100). Only fires for direct uploads. */
  onProgress?: (pct: number) => void;
  /** Called when the upload mode or retry attempt changes. */
  onStatus?: (status: UploadStatus, attempt?: number) => void;
  /** Called when a direct upload fails and we are falling back to legacy. */
  onFallback?: () => void;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates a GLB file before any network call.
 * Returns null if valid, or a user-facing Turkish error string.
 */
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

// ── Routing ───────────────────────────────────────────────────────────────────

/** Decides which upload path to use based purely on file size. */
export function chooseUploadMode(file: File): UploadMode {
  return file.size >= DIRECT_THRESHOLD_BYTES ? "direct" : "legacy";
}

// ── Path A: Legacy upload (UNCHANGED API call) ────────────────────────────────

/**
 * Thin wrapper around the existing POST /api/upload-model.
 * This function ONLY calls the legacy endpoint — no business logic changes.
 */
async function uploadLegacy(file: File, restaurantId: string): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("restaurantId", restaurantId);

  const res = await fetch("/api/upload-model", { method: "POST", body });

  if (!res.ok) {
    let errMsg = "Bilinmeyen hata";
    try {
      const json = await res.json();
      errMsg = json.error || errMsg;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errMsg);
  }

  const { url } = (await res.json()) as { url: string };
  return url;
}

// ── Path B: Direct TUS upload ─────────────────────────────────────────────────

interface UploadSession {
  signedUrl: string;
  path: string;
}

/** Step 1: Request a presigned upload session from our backend. */
async function getUploadSession(
  file: File,
  restaurantId: string
): Promise<UploadSession> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 15_000); // 15 s

  try {
    const res = await fetch("/api/upload-session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        restaurantId,
        filename: file.name,
        fileSize: file.size,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
    }

    return (await res.json()) as UploadSession;
  } finally {
    clearTimeout(timeout);
  }
}

/** Step 2: Upload the file directly to Supabase via TUS protocol. */
function uploadViaTus(
  file: File,
  session: UploadSession,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      uploadUrl: session.signedUrl,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: TUS_CHUNK_SIZE,
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "x-upsert":    "true",
      },
      metadata: {
        bucketName:   "models",
        objectName:   session.path,
        contentType:  "model/gltf-binary",
        cacheControl: "3600",
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (bytesTotal > 0) {
          onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess() {
        resolve();
      },
      onError(err) {
        reject(err);
      },
    });

    // Resume a previous upload if one exists (handles tab close mid-upload)
    upload.findPreviousUploads().then((prev) => {
      if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}

/** Step 3: Ask the backend to return the public URL of the uploaded file. */
async function confirmUpload(path: string): Promise<string> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 10_000); // 10 s

  try {
    const res = await fetch("/api/confirm-upload", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ path }),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
    }

    const { url } = (await res.json()) as { url: string };
    return url;
  } finally {
    clearTimeout(timeout);
  }
}

/** Full direct upload pipeline: session → TUS upload → confirm. */
async function uploadDirect(
  file: File,
  restaurantId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  console.log("[glbUpload] Starting direct upload for", file.name, `(${(file.size / 1024 / 1024).toFixed(1)} MB)`);

  const session = await getUploadSession(file, restaurantId);
  console.log("[glbUpload] Got upload session, path:", session.path);

  await uploadViaTus(file, session, onProgress);
  console.log("[glbUpload] TUS upload complete, confirming...");

  const url = await confirmUpload(session.path);
  console.log("[glbUpload] Upload confirmed. Public URL:", url);

  return url;
}

// ── Master Entry Point ────────────────────────────────────────────────────────

/**
 * uploadGlb — the single function AdminAR.tsx should call.
 *
 * Handles:
 *   • validation (throws with a user-facing Turkish message if invalid)
 *   • smart routing (legacy vs. direct based on file size)
 *   • automatic fallback from direct → legacy if direct fails
 *   • progress + status callbacks
 *
 * Returns the public URL of the uploaded model.
 * Throws only if BOTH paths have been exhausted.
 */
export async function uploadGlb(
  file: File,
  restaurantId: string,
  callbacks: UploadCallbacks = {}
): Promise<string> {
  const { onProgress, onStatus, onFallback } = callbacks;

  // ── 1. Validate ──
  const validationError = validateGlbFile(file);
  if (validationError) throw new Error(validationError);

  const mode = chooseUploadMode(file);
  console.log(`[glbUpload] Mode: ${mode} for ${file.name}`);

  // ── 2. Small file → legacy (no change at all) ──
  if (mode === "legacy") {
    onStatus?.("uploading", 1);
    const url = await uploadLegacy(file, restaurantId);
    onStatus?.("completed");
    return url;
  }

  // ── 3. Large file → direct (with auto-fallback) ──
  const MAX_DIRECT_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_DIRECT_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) onStatus?.("retrying", attempt);
      else             onStatus?.("uploading", attempt);

      const url = await uploadDirect(file, restaurantId, onProgress);
      onStatus?.("completed");
      return url;
    } catch (err) {
      console.warn(`[glbUpload] Direct upload attempt ${attempt} failed:`, err);
      if (attempt < MAX_DIRECT_ATTEMPTS) {
        // Wait 2 s before retrying
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // ── 4. Both direct attempts failed → fallback to legacy ──
  console.warn("[glbUpload] Direct upload exhausted. Falling back to legacy.");
  onFallback?.();
  onStatus?.("uploading", 1);

  try {
    const url = await uploadLegacy(file, restaurantId);
    onStatus?.("completed");
    return url;
  } catch (legacyErr) {
    onStatus?.("failed");
    console.error("[glbUpload] Legacy fallback also failed:", legacyErr);
    throw legacyErr;
  }
}
