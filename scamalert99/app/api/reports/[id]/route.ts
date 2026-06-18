import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getReportById } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const report = await getReportById(id);

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
