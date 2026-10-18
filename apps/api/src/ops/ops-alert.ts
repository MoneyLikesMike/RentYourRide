import { Logger } from '@nestjs/common';

const log = new Logger('OpsAlert');

/**
 * Lightweight ops alert (RYRA-460 pattern). Logs loudly; Pinpoint admin email
 * is optional when a sender is injected.
 */
export async function opsAlert(
  subject: string,
  body: string,
  sendAdminEmail?: (subject: string, body: string) => Promise<unknown>,
): Promise<void> {
  log.error(`${subject} — ${body}`);
  if (sendAdminEmail) {
    try {
      await sendAdminEmail(subject, body);
    } catch (err) {
      log.warn(
        `opsAlert email failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
