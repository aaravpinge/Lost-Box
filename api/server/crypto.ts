import crypto from "crypto";

// Enforce env behavior:
// - CRYPTO_SECRET is required in production.
// - In non-production we allow PRIVATE_FIELDS_KEY legacy fallback and a dev fallback.
const CRYPTO_SECRET = process.env.CRYPTO_SECRET;
const LEGACY_KEY = process.env.PRIVATE_FIELDS_KEY;
const DEV_FALLBACK = "dev-private-key-change-me";

if (process.env.NODE_ENV === "production" && !CRYPTO_SECRET) {
  throw new Error("CRYPTO_SECRET environment variable is required in production");
}

const SECRET =
  CRYPTO_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : LEGACY_KEY || DEV_FALLBACK);

function normalizeAnswer(answer: string) {
  return String(answer).trim().toLowerCase();
}

export function hashAnswer(answer: string) {
  if (!SECRET) throw new Error("Crypto secret not configured");
  return crypto.createHmac("sha256", SECRET).update(normalizeAnswer(answer)).digest("hex");
}

export function verifyAnswer(answer: string, storedHexHash: string) {
  if (!storedHexHash || typeof storedHexHash !== "string") return false;
  try {
    const computed = hashAnswer(answer);
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(storedHexHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

export function preparePrivateFields(rawPrivate: any) {
  if (!rawPrivate) return rawPrivate;
  const copy = { ...rawPrivate } as any;
  if (Array.isArray(copy.verificationQuestions)) {
    copy.verificationQuestions = copy.verificationQuestions.map((q: any) => ({
      q: q.q,
      aHash: hashAnswer(q.a),
    }));
  }
  return copy;
}
