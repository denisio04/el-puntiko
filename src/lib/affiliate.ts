export function generateAffiliateCode(username: string): string {
  const clean = username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 6);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${timestamp}${random}`.substring(0, 16);
}

export function calculateCommission(total: number, rate: number): number {
  return Math.round(total * rate * 100) / 100;
}

export const REFERRAL_COOKIE_NAME = "referral_code";

export interface AffiliateStats {
  wallet: number;
  totalClicks: number;
  totalOrders: number;
  conversionRate: number;
}

export function formatAffiliateStats(data: {
  wallet: number;
  clicks: number;
  orders: number;
}): AffiliateStats {
  const conversionRate = data.clicks > 0 ? (data.orders / data.clicks) * 100 : 0;
  return {
    wallet: data.wallet,
    totalClicks: data.clicks,
    totalOrders: data.orders,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

export function generateReferralUrl(
  baseUrl: string,
  affiliateCode: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("ref", affiliateCode);
  return url.toString();
}