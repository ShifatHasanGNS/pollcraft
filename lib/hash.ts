import { createHash, randomBytes } from "node:crypto";

export function createDefinitionHash(input: unknown): string {
  const payload = JSON.stringify(input);
  return createHash("sha256").update(payload).digest("hex");
}

export function hashWithSalt(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function generateDeviceToken(): string {
  return randomBytes(16).toString("hex");
}
