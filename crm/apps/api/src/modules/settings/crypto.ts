import crypto from "crypto";
import { env } from "../../config/env";

function getKey() {
  return crypto.createHash("sha256").update(env.SECRET_KEY).digest();
}

export function encryptJson(input: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const json = JSON.stringify(input);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptJson<T = Record<string, unknown>>(payload: string): T {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as T;
}

export function maskSecrets(input: unknown): unknown {
  if (typeof input === "string") {
    if (input.length <= 4) return "****";
    return `${"*".repeat(Math.max(4, input.length - 4))}${input.slice(-4)}`;
  }
  if (Array.isArray(input)) return input.map(maskSecrets);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const sensitive = /(token|secret|key|auth|password)/i.test(key);
      out[key] = sensitive ? maskSecrets(String(value ?? "")) : maskSecrets(value);
    }
    return out;
  }
  return input;
}
