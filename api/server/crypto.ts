import crypto from "crypto";

const KEY = process.env.PRIVATE_FIELDS_KEY || "dev-private-key-change-me";

export function hashAnswer(answer: string) {
  return crypto.createHmac("sha256", KEY).update(String(answer).trim().toLowerCase()).digest("hex");
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
