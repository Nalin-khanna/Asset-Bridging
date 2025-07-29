import { createHash } from "crypto";

export function hashSeed(input: string) {
  return createHash("sha256").update(input).digest().slice(0, 32);
}