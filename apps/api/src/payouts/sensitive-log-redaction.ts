const SENSITIVE_KEYS =
  /^(id_number|ssn|sin|account_number|routing_number|individual\.id_number)$/i;

/** Deep-clone and redact sensitive Connect fields before logging. */
export function redactSensitive(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length >= 9 && /^\d[\d\s-]{7,}\d$/.test(value)) return '[redacted]';
    return value;
  }
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k) || /id_number|account_number|sin\b/i.test(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = redactSensitive(v);
      }
    }
    return out;
  }
  return value;
}

export function redactLogMessage(message: string): string {
  return message
    .replace(/id_number["']?\s*[:=]\s*["']?[\d\s-]+/gi, 'id_number=[redacted]')
    .replace(/account_number["']?\s*[:=]\s*["']?[\d\s-]+/gi, 'account_number=[redacted]')
    .replace(/\bsin["']?\s*[:=]\s*["']?[\d\s-]+/gi, 'sin=[redacted]');
}
