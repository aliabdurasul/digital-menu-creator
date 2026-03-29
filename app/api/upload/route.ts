import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import sharp from "sharp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface SizeSpec {
  suffix: string;
  width: number;
  quality: number;
}

const SIZES: SizeSpec[] = [
  { suffix: "_thumb", width: 300, quality: 70 },
  { suffix: "_md", width: 600, quality: 75 },
  { suffix: "_lg", width: 1024, quality: 80 },
];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

/**
 * POST /api/upload
 *
 * Accepts multipart form data with:
 *   - file: image file (jpeg/png/webp, max 5 MB)
 *   - restaurantId: UUID of the restaurant
 *
 * Returns:
 *   { url: string } — the large-size public URL (stored in image_url column)
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
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 5 MB limit" },
        { status: 400 }
      );
    }

    // ── Process with sharp ──
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const basePath = `${restaurantId}/products/${timestamp}`;

    const admin = getServiceClient();

    // Generate all three sizes in parallel
    const uploads = await Promise.all(
      SIZES.map(async ({ suffix, width, quality }) => {
        const webpBuffer = await sharp(buffer)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();

        const storagePath = `${basePath}${suffix}.webp`;
        const { error } = await admin.storage
          .from("images")
          .upload(storagePath, webpBuffer, {
            contentType: "image/webp",
            upsert: true,
          });

        if (error) throw new Error(`Upload failed (${suffix}): ${error.message}`);

        const { data } = admin.storage
          .from("images")
          .getPublicUrl(storagePath);

        return { suffix, url: data.publicUrl };
      })
    );

    // Return the large variant URL (the one stored in DB)
    const largeUrl = uploads.find((u) => u.suffix === "_lg")!.url;

    return NextResponse.json({ url: largeUrl });
  } catch (err: unknown) {
    console.error("[/api/upload]", err);
    const message =
      err instanceof Error ? err.message : "Image processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
