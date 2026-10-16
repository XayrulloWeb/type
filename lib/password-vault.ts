import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const secret = process.env.PASSWORD_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("PASSWORD_ENCRYPTION_KEY is not configured.");
  return createHash("sha256").update(secret).digest();
}

export function encryptPassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptPassword(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error("Stored password is not valid.");
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
