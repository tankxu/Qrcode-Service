import { ulid } from "ulid";

export function newId(): string {
  return ulid();
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz23456789"; // base32, no 0/1/o/l ambiguity
const SLUG_LEN = 8;

export function generateSlug(): string {
  const buf = new Uint8Array(SLUG_LEN);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < SLUG_LEN; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

const RESERVED = new Set([
  "admin", "api", "app", "assets", "auth", "dashboard", "help", "login",
  "logout", "new", "privacy", "q", "r", "static", "support", "terms", "tools",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}
