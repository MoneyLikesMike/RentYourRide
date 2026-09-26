import { ConfigService } from '@nestjs/config';

export function adminBaseUrl(config: ConfigService): string {
  return (
    config.get<string>('ADMIN_BASE_URL')?.replace(/\/$/, '') ??
    'https://admindev.rentyourride.ca'
  );
}

export function publicApiBaseUrl(config: ConfigService): string {
  return (
    config.get<string>('PUBLIC_BASE_URL')?.replace(/\/$/, '') ??
    'https://bedev.rentyourride.ca'
  );
}

export function isProdApi(config: ConfigService): boolean {
  return publicApiBaseUrl(config).toLowerCase().includes('backend.rentyourride.ca');
}

/** Cross-env peer used so one API can detect the other being down. */
export function peerHealthUrl(config: ConfigService): string {
  const override = config.get<string>('OPS_PEER_HEALTH_URL')?.trim();
  if (override) return override.replace(/\/$/, '');
  return isProdApi(config)
    ? 'https://bedev.rentyourride.ca/v1/health'
    : 'https://backend.rentyourride.ca/v1/health';
}

export function lines(rows: Array<[string, string | number | boolean | null | undefined]>): string {
  return rows
    .map(([k, v]) => {
      if (v == null || v === '') return `${k}: (none)`;
      return `${k}: ${v}`;
    })
    .join('\n');
}

export function vehicleLabel(vd: Record<string, unknown> | null | undefined, fallback = ''): string {
  const year = String(vd?.year ?? '').trim();
  const make = String(vd?.make ?? '').trim();
  const model = String(vd?.model ?? '').trim();
  const parts = [year, make, model].filter(Boolean);
  return parts.length ? parts.join(' ') : fallback;
}

/** Midnight in `timeZone` for the calendar day containing `now`. */
export function startOfDayInTimeZone(timeZone: string, now = new Date()): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(now)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMs = asUtc - now.getTime();
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      0,
      0,
      0,
    ) - offsetMs,
  );
}

export function signupSource(user: {
  googleSub?: string | null;
  appleSub?: string | null;
  passwordHash?: string | null;
}): string {
  if (user.googleSub) return 'google';
  if (user.appleSub) return 'apple';
  if (user.passwordHash) return 'email';
  return 'unknown';
}
