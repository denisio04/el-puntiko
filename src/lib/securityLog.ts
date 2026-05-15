export function logSecurityEvent(
  eventType: string,
  details: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    type: eventType,
    ...details,
  };
  console.warn("[SECURITY]", JSON.stringify(entry));
}
