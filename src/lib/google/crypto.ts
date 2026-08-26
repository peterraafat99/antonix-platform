import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getGoogleEnv } from "@/lib/env";

interface Envelope { v:1; iv:string; tag:string; data:string }

function key() {
  const value = Buffer.from(getGoogleEnv().GOOGLE_TOKEN_ENCRYPTION_KEY, "base64");
  if (value.length !== 32) throw new Error("Google token encryption key must be 32 bytes");
  return value;
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const envelope: Envelope = { v:1, iv:iv.toString("base64"), tag:cipher.getAuthTag().toString("base64"), data:encrypted.toString("base64") };
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

export function decryptSecret(value: string): string {
  const envelope = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Envelope;
  if (envelope.v !== 1) throw new Error("Unsupported encrypted token version");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]).toString("utf8");
}
