import { NextResponse, type NextRequest } from "next/server";
import { analyzeImageWithGemini } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { createReport } from "@/lib/reports";
import { sanitizeText } from "@/lib/sanitize";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const context = sanitizeText(String(formData.get("context") || ""), 1000);

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Upload an image file to analyze." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG, and WebP screenshots are supported." }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Screenshot must be 5MB or smaller." }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const analysis = await analyzeImageWithGemini({
      base64,
      mimeType: image.type,
      context
    });
    const content = context || `Screenshot upload: ${sanitizeText(image.name, 120) || "unnamed image"}`;
    const report = await createReport({
      content,
      type: "screenshot",
      analysis
    });

    return NextResponse.json({ analysis, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze screenshot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
