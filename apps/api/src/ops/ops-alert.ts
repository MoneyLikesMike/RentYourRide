import { Logger } from '@nestjs/common';

const log = new Logger('OpsAlert');

/**
 * Lightweight ops alert hook.
 * TODO(RYRA-460): route to the real alert channel (email/SMS/Slack).
 */
export function alertOps(
  alert: string,
  details: Record<string, unknown> = {},
): void {
  log.warn(
    JSON.stringify({
      event: 'ops_alert',
      alert,
      ...details,
    }),
  );
}
