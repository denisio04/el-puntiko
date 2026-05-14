import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export function validateCSRF(request: NextRequest): { valid: boolean; reason?: string } {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const source = origin || referer;
  if (!source) {
    return { valid: true };
  }

  const isAllowed = ALLOWED_ORIGINS.some((allowed) => source.startsWith(allowed));
  if (!isAllowed) {
    return { valid: false, reason: `Origin ${source} not allowed` };
  }
  return { valid: true };
}
