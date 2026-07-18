import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiditWebhookEventEntity } from '../entities/didit-webhook-event.entity';
import { UsersService } from '../users/users.service';
import { DIDIT_LICENSE_WORKFLOW_ID, DIDIT_VERIFICATION_API } from './didit.constants';
import { verifyDiditWebhookSignature } from './didit-webhook.utils';
import { NotificationsService } from '../notifications/notifications.service';

type DiditSessionResponse = {
  session_id: string;
  session_token: string;
  url: string;
  status: string;
};

type DiditWebhookPayload = {
  event_id: string;
  webhook_type: string;
  status: string;
  vendor_data: string;
  session_id?: string;
  decision?: {
    id_verifications?: Array<{ document_number?: string }>;
  };
  resubmit_info?: { nodes_to_resubmit?: unknown };
};

@Injectable()
export class DiditService {
  private readonly logger = new Logger(DiditService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    @InjectRepository(DiditWebhookEventEntity)
    private readonly webhookEvents: Repository<DiditWebhookEventEntity>,
  ) {}

  async createLicenseSession(userId: string) {
    const apiKey = this.config.get<string>('DIDIT_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('License verification is not configured');
    }

    const callback =
      this.config.get<string>('DIDIT_CALLBACK_URL') ||
      `${(this.config.get<string>('PUBLIC_BASE_URL') || 'https://bedev.rentyourride.ca').replace(/\/$/, '')}/didit/callback`;

    const res = await fetch(`${DIDIT_VERIFICATION_API}/v3/session/`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: DIDIT_LICENSE_WORKFLOW_ID,
        vendor_data: userId,
        callback,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.warn(`Didit session create failed (${res.status}): ${detail}`);
      throw new BadGatewayException({ error: 'session_create_failed', detail });
    }

    const session = (await res.json()) as DiditSessionResponse;
    await this.users.setDiditSession(userId, session.session_id, 'in_progress');

    return {
      session_id: session.session_id,
      session_token: session.session_token,
      url: session.url,
    };
  }

  async handleWebhook(rawBody: string, signature: string, timestampHeader: string) {
    const secret = this.config.get<string>('DIDIT_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Webhook not configured');
    }

    let parsed: DiditWebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as DiditWebhookPayload;
    } catch {
      throw new UnauthorizedException('invalid json');
    }

    const ts = Number(timestampHeader);
    if (!verifyDiditWebhookSignature(parsed, signature, ts, secret)) {
      throw new UnauthorizedException('bad sig');
    }

    if (!parsed.event_id) {
      return { ok: true };
    }

    const existing = await this.webhookEvents.findOne({
      where: { eventId: parsed.event_id },
    });
    if (existing) {
      return { ok: true };
    }

    await this.dispatchStatus(parsed);

    await this.webhookEvents.save(
      this.webhookEvents.create({ eventId: parsed.event_id }),
    );

    return { ok: true };
  }

  private async dispatchStatus(event: DiditWebhookPayload) {
    const userId = event.vendor_data;
    if (!userId) return;

    switch (event.status) {
      case 'Approved': {
        const docNumber = this.extractLicenseNumber(event.decision);
        await this.users.setLicenseVerified(userId, {
          licenseNumber: docNumber,
          sessionId: event.session_id,
        });
        this.notifications.licenseApproved(userId);
        break;
      }
      case 'Declined':
        await this.users.setLicenseVerificationStatus(userId, 'declined', event.session_id);
        this.notifications.licenseDenied(userId);
        break;
      case 'In Review':
        await this.users.setLicenseVerificationStatus(userId, 'pending_review', event.session_id);
        break;
      case 'Resubmitted':
        await this.users.setLicenseVerificationStatus(userId, 'resubmitted', event.session_id);
        break;
      case 'Kyc Expired':
        await this.users.setLicenseVerificationStatus(userId, 'expired', event.session_id);
        break;
      case 'In Progress':
        await this.users.setLicenseVerificationStatus(userId, 'in_progress', event.session_id);
        break;
      case 'Awaiting User':
        await this.users.setLicenseVerificationStatus(userId, 'awaiting_user', event.session_id);
        break;
      default:
        this.logger.debug(`Didit webhook status noop: ${event.status}`);
        break;
    }
  }

  private extractLicenseNumber(decision?: DiditWebhookPayload['decision']): string | undefined {
    const entries = decision?.id_verifications;
    if (!Array.isArray(entries)) return undefined;
    for (const entry of entries) {
      const num = entry?.document_number?.trim();
      if (num) return num;
    }
    return undefined;
  }
}
