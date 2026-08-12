import { createHmac } from "node:crypto";

export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function firstHeaderEntry(value: string | null): string | undefined {
  const entry = value?.split(",", 1)[0]?.trim();
  return entry || undefined;
}

export function getRateLimitIdentity(headers: Pick<Headers, "get">): string {
  return (
    firstHeaderEntry(headers.get("cf-connecting-ip")) ??
    firstHeaderEntry(headers.get("x-forwarded-for")) ??
    firstHeaderEntry(headers.get("x-real-ip")) ??
    "anonymous"
  );
}

export function hashRateLimitIdentity(identity: string, secret: string): string {
  return createHmac("sha256", secret).update(identity).digest("hex");
}
