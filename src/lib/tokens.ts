import { createHash, randomBytes } from "crypto"

export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(6).toString("base64url") // 8 URL-safe chars, 48 bits entropy
  const hash = hashToken(raw)
  return { raw, hash }
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function generateAdminToken(): string {
  return randomBytes(32).toString("base64url")
}
