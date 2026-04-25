import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

/**
 * POST /api/upload-session
 *
 * Creates a presigned TUS upload session for direct browser → Supabase upload.
 * The file itself NEVER passes through this server.
 *
 * Request body: { restaurantId: string, filename: string, fileSize: number }
 * Response:     { signedUrl: string, path: string, mode: "direct" }
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

    // ── Parse + validate request body ──
    let body: { restaurantId?: string; filename?: string; fileSize?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { restaurantId, filename, fileSize } = body;

    if (!restaurantId || typeof restaurantId !== "string") {
      return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
    }
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }
    if (!filename.toLowerCase().endsWith(".glb")) {
      return NextResponse.json({ error: "Only .glb files are allowed" }, { status: 400 });
    }
    if (typeof fileSize === "number" && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 100 MB limit" }, { status: 400 });
    }

    // ── Generate storage path ──
    const timestamp   = Date.now();
    const safeName    = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${restaurantId}/models/${timestamp}_${safeName}`;

    // ── Create signed upload URL (service-role, bypasses RLS) ──
    const admin = getServiceClient();
    const { data, error } = await admin.storage
      .from("models")
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (error || !data?.signedUrl) {
      console.error("[/api/upload-session] Supabase error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create upload session" },
        { status: 500 }
      );
    }

    console.log("[/api/upload-session] Created session for:", storagePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path:      storagePath,
      mode:      "direct",
    });
  } catch (err: unknown) {
    console.error("[/api/upload-session] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Upload session creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
