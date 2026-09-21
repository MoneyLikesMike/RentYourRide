import { Injectable, Logger } from '@nestjs/common';

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export type ExpoPushSendResult = {
  sent: boolean;
  reason?: string;
};

@Injectable()
export class ExpoPushService {
  private readonly log = new Logger(ExpoPushService.name);
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  private isExpoToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  async send(messages: ExpoPushMessage[]): Promise<ExpoPushSendResult> {
    const valid = messages.filter((m) => m.to && this.isExpoToken(m.to));
    if (!valid.length) return { sent: false, reason: 'no_expo_token' };

    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < valid.length; i += 100) {
      chunks.push(valid.slice(i, i + 100));
    }

    let delivered = 0;
    let lastError = '';

    for (const chunk of chunks) {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            chunk.map((m) => ({
              to: m.to,
              title: m.title ?? 'Rent Your Ride',
              body: m.body,
              data: m.data ?? {},
              sound: m.sound ?? 'default',
              priority: m.priority ?? 'high',
              ...(m.channelId ? { channelId: m.channelId } : {}),
            })),
          ),
        });
        if (!res.ok) {
          lastError = `http_${res.status}`;
          this.log.warn(`Expo push HTTP ${res.status}: ${await res.text()}`);
          continue;
        }
        const payload = (await res.json()) as { data?: ExpoTicket[] };
        for (const ticket of payload.data ?? []) {
          if (ticket.status === 'error') {
            lastError = ticket.message ?? ticket.details?.error ?? 'push_ticket_error';
            this.log.warn(`Expo push ticket error: ${lastError}`);
          } else {
            delivered += 1;
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'push_provider_error';
        this.log.error('Expo push batch failed', lastError);
      }
    }

    if (delivered > 0) return { sent: true };
    return { sent: false, reason: lastError || 'push_provider_error' };
  }
}
