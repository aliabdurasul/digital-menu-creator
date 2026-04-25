import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

/**
 * POST /api/confirm-upload
 *
 * Called after a successful direct (TUS) upload to Supabase Storage.
 * Resolves the permanent public URL for the uploaded GLB file.
 *
 * Request body: { path: string }
 * Response:     { url: string }
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
    let body: { path?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { path } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    // Basic sanity check — path must look like a models bucket path
    if (!path.includes("/models/") || !path.toLowerCase().endsWith(".glb")) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    // ── Resolve public URL ──
    const admin      = getServiceClient();
    const { data }   = admin.storage.from("models").getPublicUrl(path);

    if (!data?.publicUrl) {
      return NextResponse.json({ error: "Could not resolve public URL" }, { status: 500 });
    }

    console.log("[/api/confirm-upload] Confirmed path:", path);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err: unknown) {
    console.error("[/api/confirm-upload] FULL ERROR:", JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : {})), err);
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "object" && err !== null && "message" in err) {
      message = String((err as { message: unknown }).message);
    } else {
      message = JSON.stringify(err) || "Upload confirmation failed (unknown)";
    }
    return NextResponse.json(
      { error: message, step: "confirm-upload" },
      { status: 500 }
    );
  }
}
