import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import type { ScamAnalysis } from "@/lib/types";
import { sanitizeText } from "@/lib/sanitize";

const apiKey = process.env.GEMINI_API_KEY;
const defaultModelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const fallbackModelNames = ["gemini-2.5-flash", "gemini-flash-latest"];

function getModel(modelName: string): GenerativeModel {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      responseMimeType: "application/json"
    }
  });
}

function getCandidateModelNames(): string[] {
  return Array.from(new Set([defaultModelName, ...fallbackModelNames]));
}

function isModelAvailabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /404|not found|not supported for generateContent|ListModels/i.test(error.message);
}

async function generateWithAvailableModel<T>(
  generate: (model: GenerativeModel) => Promise<T>
): Promise<T> {
  const modelNames = getCandidateModelNames();
  const errors: string[] = [];

  for (const modelName of modelNames) {
    try {
      return await generate(getModel(modelName));
    } catch (error) {
      if (!isModelAvailabilityError(error)) {
        throw error;
      }

      errors.push(`${modelName}: ${error instanceof Error ? error.message : "unavailable"}`);
    }
  }

  throw new Error(
    `No configured Gemini model is available for generateContent. Tried: ${modelNames.join(", ")}. ${errors.join(" ")}`
  );
}

function promptFor(content: string, mode: "message" | "url" | "screenshot"): string {
  const detectorFocus = {
    message: "SMS, email, WhatsApp, and chat-message scam patterns",
    url: "phishing, fake domains, typosquatting, suspicious URL keywords, and impersonation",
    screenshot: "visual scam evidence, extracted text, fake bank messages, OTP scams, lottery scams, job scams, and fake offers"
  }[mode];

  return `You are a cybersecurity scam detection expert.

Analyze the provided content for ${detectorFocus}.

Return ONLY valid JSON:

{
  "scamScore": number,
  "riskLevel": "Low|Medium|High|Critical",
  "category": "",
  "redFlags": [],
  "explanation": "",
  "recommendation": "",
  "coach": {
    "manipulationTechniques": [],
    "safetySteps": [],
    "reportingSuggestions": []
  }
}

Scoring guide:
- 0-24 Low
- 25-54 Medium
- 55-79 High
- 80-100 Critical

Be specific, concise, and avoid alarmism when evidence is weak.

Content:
${content}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Gemini did not return valid JSON.");
    }

    return JSON.parse(withoutFence.slice(start, end + 1));
  }
}

function normalizeAnalysis(value: unknown): ScamAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini returned an invalid analysis object.");
  }

  const record = value as Record<string, unknown>;
  const rawScore = Number(record.scamScore);
  const scamScore = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, Math.round(rawScore))) : 0;
  const allowedRiskLevels = ["Low", "Medium", "High", "Critical"] as const;
  const riskLevel = allowedRiskLevels.includes(record.riskLevel as ScamAnalysis["riskLevel"])
    ? (record.riskLevel as ScamAnalysis["riskLevel"])
    : scamScore >= 80
      ? "Critical"
      : scamScore >= 55
        ? "High"
        : scamScore >= 25
          ? "Medium"
          : "Low";

  const coach = record.coach && typeof record.coach === "object" ? (record.coach as Record<string, unknown>) : {};

  return {
    scamScore,
    riskLevel,
    category: sanitizeText(String(record.category || "Uncategorized"), 80),
    redFlags: Array.isArray(record.redFlags)
      ? record.redFlags.map((item) => sanitizeText(String(item), 160)).filter(Boolean).slice(0, 10)
      : [],
    explanation: sanitizeText(String(record.explanation || "No explanation returned."), 1200),
    recommendation: sanitizeText(String(record.recommendation || "Verify through official channels before responding."), 1200),
    coach: {
      manipulationTechniques: Array.isArray(coach.manipulationTechniques)
        ? coach.manipulationTechniques.map((item) => sanitizeText(String(item), 180)).filter(Boolean).slice(0, 8)
        : [],
      safetySteps: Array.isArray(coach.safetySteps)
        ? coach.safetySteps.map((item) => sanitizeText(String(item), 180)).filter(Boolean).slice(0, 8)
        : [],
      reportingSuggestions: Array.isArray(coach.reportingSuggestions)
        ? coach.reportingSuggestions.map((item) => sanitizeText(String(item), 180)).filter(Boolean).slice(0, 8)
        : []
    }
  };
}

export async function analyzeTextWithGemini(
  content: string,
  mode: "message" | "url"
): Promise<ScamAnalysis> {
  const result = await generateWithAvailableModel((model) =>
    model.generateContent(promptFor(sanitizeText(content), mode))
  );
  const text = result.response.text();
  return normalizeAnalysis(extractJson(text));
}

export async function analyzeImageWithGemini(input: {
  base64: string;
  mimeType: string;
  context?: string;
}): Promise<ScamAnalysis> {
  const result = await generateWithAvailableModel((model) =>
    model.generateContent([
      promptFor(
        input.context || "Analyze this screenshot for scam signals. Extract visible text first, then assess risk.",
        "screenshot"
      ),
      {
        inlineData: {
          data: input.base64,
          mimeType: input.mimeType
        }
      }
    ])
  );
  const text = result.response.text();
  return normalizeAnalysis(extractJson(text));
}
