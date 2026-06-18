import { NextResponse, type NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(
  request: NextRequest,
  options: { limit?: number; windowMs?: number } = {}
): NextResponse | null {
  const limit = options.limit ?? 20;
  const windowMs = options.windowMs ?? 60_000;
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "anonymous";
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((bucket.resetAt - now) / 1000).toString()
        }
      }
    );
  }

  return null;
}
