import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type UpsertSubscriberInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

/**
 * MailerLite (new) API: https://developers.mailerlite.com/docs/subscribers
 * Env:
 *   MAILERLITE_API_TOKEN — Bearer token from Integrations → Developers → API
 *   MAILERLITE_GROUP_ID  — optional group id to add new signups into
 */
@Injectable()
export class MailerliteService {
  private readonly log = new Logger(MailerliteService.name);
  private readonly baseUrl = 'https://connect.mailerlite.com/api';

  constructor(private readonly config: ConfigService) {}

  private apiToken(): string {
    return (
      this.config.get<string>('MAILERLITE_API_TOKEN')?.trim() ||
      this.config.get<string>('MAILERLITE_API_KEY')?.trim() ||
      ''
    );
  }

  private groupId(): string {
    return this.config.get<string>('MAILERLITE_GROUP_ID')?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiToken());
  }

  /** Fire-and-forget upsert so signup never blocks on MailerLite. */
  upsertSubscriberAsync(input: UpsertSubscriberInput): void {
    void this.upsertSubscriber(input).catch((err) => {
      this.log.warn(
        `MailerLite upsert failed for ${input.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  async upsertSubscriber(input: UpsertSubscriberInput): Promise<void> {
    const token = this.apiToken();
    if (!token) return;

    const email = input.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    const fields: Record<string, string> = {};
    const first = input.firstName?.trim();
    const last = input.lastName?.trim();
    if (first) fields.name = first;
    if (last) fields.last_name = last;

    const body: Record<string, unknown> = {
      email,
      status: 'active',
    };
    if (Object.keys(fields).length) body.fields = fields;

    const groupId = this.groupId();
    if (groupId) body.groups = [groupId];

    const res = await fetch(`${this.baseUrl}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
  }
}
