import { createHmac } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";

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

export async function reserveAIRateLimit(options: {
  db: Firestore;
  digest: string;
  now?: Date;
}): Promise<boolean> {
  const now = options.now ?? new Date();
  const nowTimestamp = Timestamp.fromDate(now);
  const reference = options.db.collection("ai_rate_limits").doc(options.digest);

  return options.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);

    if (!snapshot.exists) {
      transaction.create(reference, {
        windowStartedAt: nowTimestamp,
        count: 1,
        updatedAt: nowTimestamp,
      });
      return true;
    }

    const data = snapshot.data() as {
      windowStartedAt: Timestamp;
      count: number;
    };
    const windowIsActive =
      now.getTime() - data.windowStartedAt.toDate().getTime() < RATE_LIMIT_WINDOW_MS;

    if (windowIsActive && data.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    transaction.update(reference, {
      windowStartedAt: windowIsActive ? data.windowStartedAt : nowTimestamp,
      count: windowIsActive ? data.count + 1 : 1,
      updatedAt: nowTimestamp,
    });
    return true;
  });
}
