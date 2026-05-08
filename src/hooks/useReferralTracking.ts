"use client";

import { useEffect, useState } from "react";

const REFERRAL_COOKIE_NAME = "referral_code";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(
  name: string,
  value: string,
  days: number = 30
): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie =
    name +
    "=" +
    encodeURIComponent(value) +
    ";expires=" +
    expires.toUTCString() +
    ";path=/;SameSite=Lax;httpOnly";
}

function sanitizeRefCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 20);
}

export function useReferralTracking() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const clean = sanitizeRefCode(ref);
      setCookie(REFERRAL_COOKIE_NAME, clean, 30);
      setReferralCode(clean);
    } else {
      const existing = getCookie(REFERRAL_COOKIE_NAME);
      if (existing) {
        setReferralCode(existing);
      }
    }
  }, []);

  return referralCode;
}