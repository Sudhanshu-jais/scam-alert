import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { createReport, getReportStats, listReports } from "@/lib/reports";
import { sanitizeText, validateAnalysisText } from "@/lib/sanitize";
import type { AnalysisType, RiskLevel, ScamAnalysis } from "@/lib/types";

export const runtime = "nodejs";

const analysisTypes = new Set<AnalysisType>(["message", "url", "screenshot"]);
const riskLevels = new Set<RiskLevel>(["Low", "Medium", "High", "Critical"]);

function validateManualReport(body: Record<string, unknown>):
  | { ok: true; content: string; type: AnalysisType; analysis: ScamAnalysis }
  | { ok: false; error: string } {
  const contentValidation = validateAnalysisText(body.content);
  if (!contentValidation.ok) return contentValidation;

  if (!analysisTypes.has(body.type as AnalysisType)) {
    return { ok: false, error: "Report type must be message, url, or screenshot." };
  }

  const scamScore = Number(body.scamScore);
  if (!Number.isFinite(scamScore) || scamScore < 0 || scamScore > 100) {
    return { ok: false, error: "scamScore must be a number from 0 to 100." };
  }

  if (!riskLevels.has(body.riskLevel as RiskLevel)) {
    return { ok: false, error: "riskLevel must be Low, Medium, High, or Critical." };
  }

  return {
    ok: true,
    content: contentValidation.content,
    type: body.type as AnalysisType,
    analysis: {
      scamScore: Math.round(scamScore),
      riskLevel: body.riskLevel as RiskLevel,
      category: sanitizeText(String(body.category || "Manual report"), 80),
      redFlags: Array.isArray(body.redFlags)
        ? body.redFlags.map((item) => sanitizeText(String(item), 160)).filter(Boolean).slice(0, 10)
        : [],
      explanation: sanitizeText(String(body.explanation || ""), 1200),
      recommendation: sanitizeText(String(body.recommendation || ""), 1200)
    }
  };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 50);
    const [reports, stats] = await Promise.all([listReports(limit), getReportStats()]);
    return NextResponse.json({ reports, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load reports.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const validation = validateManualReport(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const report = await createReport(validation);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
