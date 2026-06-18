import { NextResponse, type NextRequest } from "next/server";
import { analyzeTextWithGemini } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { createReport } from "@/lib/reports";
import { validateHttpUrl } from "@/lib/sanitize";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const validation = validateHttpUrl(body.url);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const analysis = await analyzeTextWithGemini(`URL: ${validation.url}`, "url");
    const report = await createReport({
      content: validation.url,
      type: "url",
      analysis
    });

    return NextResponse.json({ analysis, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
