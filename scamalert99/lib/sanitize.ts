export function sanitizeText(input: string, maxLength = 8000): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function validateHttpUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = sanitizeText(input, 2048);

  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "Only HTTP and HTTPS URLs can be analyzed." };
    }

    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, error: "Enter a valid URL, including https:// or http://." };
  }
}

export function validateAnalysisText(input: unknown): { ok: true; content: string } | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "Content must be a string." };
  }

  const content = sanitizeText(input);

  if (content.length < 3) {
    return { ok: false, error: "Add at least 3 characters to analyze." };
  }

  return { ok: true, content };
}
