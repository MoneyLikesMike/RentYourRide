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

function normalizeDiditStatus(raw: string | undefined | null): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const key = s.toLowerCase().replace(/[_-]+/g, ' ');
  switch (key) {
    case 'approved':
      return 'Approved';
    case 'declined':
      return 'Declined';
    case 'in review':
      return 'In Review';
    case 'in progress':
      return 'In Progress';
    case 'awaiting user':
      return 'Awaiting User';
    case 'resubmitted':
      return 'Resubmitted';
    case 'expired':
      return 'Expired';
    case 'kyc expired':
      return 'Kyc Expired';
    case 'abandoned':
      return 'Abandoned';
    case 'not started':
      return 'Not Started';
    default:
      return s;
  }
}

type DiditIdVerification = {
  document_number?: string;
  address?: string;
  formatted_address?: string;
  issuing_state_name?: string;
  date_of_birth?: string;
  birth_date?: string;
  gender?: string;
  extra_fields?: Record<string, unknown>;
  parsed_address?: {
    street_1?: string | null;
    street_2?: string | null;
    city?: string | null;
    region?: string | null;
    state?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
    formatted_address?: string | null;
  };
};

type DiditDecision = {
  status?: string;
  date_of_birth?: string;
  id_verifications?: DiditIdVerification[];
};

type DiditWebhookPayload = {
  event_id: string;
  webhook_type: string;
  status: string;
  vendor_data: string | { id?: string } | null;
  session_id?: string;
  decision?: DiditDecision;
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

  async createLicenseSession(userId: string, callbackUrl?: string) {
    const apiKey = this.config.get<string>('DIDIT_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('License verification is not configured');
    }

    const callback = this.resolveCallbackUrl(callbackUrl);

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
        callback_method: 'both',
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.warn(`Didit session create failed (${res.status}): ${detail}`);
      throw new BadGatewayException({ error: 'session_create_failed', detail });
    }

    const session = (await res.json()) as DiditSessionResponse;
    await this.users.setDiditSession(userId, session.session_id, 'in_progress');
    if (normalizeDiditStatus(session.status) === 'Approved') {
      await this.applyDiditStatus(userId, 'Approved', {
        sessionId: session.session_id,
      });
    }

    return {
      session_id: session.session_id,
      session_token: session.session_token,
      url: session.url,
    };
  }

  /** Allow web apps to pass their origin callback; fall back to server default. */
  private resolveCallbackUrl(requested?: string): string {
    const fallback =
      this.config.get<string>('DIDIT_CALLBACK_URL') ||
      `${(this.config.get<string>('PUBLIC_BASE_URL') || 'https://bedev.rentyourride.ca').replace(/\/$/, '')}/didit/callback`;

    const candidate = String(requested || '').trim();
    if (!candidate) return fallback;

    try {
      const url = new URL(candidate);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return fallback;
      }
      const host = url.hostname.toLowerCase();
      const allowed =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.rentyourride.ca') ||
        host === 'rentyourride.ca';
      if (!allowed) {
        this.logger.warn(`Rejected Didit callback host: ${host}`);
        return fallback;
      }
      return candidate;
    } catch {
      return fallback;
    }
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

  /**
   * If Didit's webhook was missed, find this user's sessions and apply Approved
   * when Didit already decided. Looks up by vendor_data (user id), not only the
   * last stored session id — a later In Progress session must not hide an
   * earlier Approved one.
   */
  async reconcileUserLicense(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;
    if (
      user.licenseVerified &&
      user.licenseVerificationStatus === 'approved' &&
      user.addressLine &&
      user.addressPostalCode &&
      user.dateOfBirth &&
      user.gender
    ) {
      return;
    }

    const sessions = await this.listSessionsForVendor(userId);
    const approved = sessions.find((s) => normalizeDiditStatus(s.status) === 'Approved');
    const stored =
      sessions.find((s) => s.session_id === user.diditSessionId) ||
      (user.diditSessionId
        ? { session_id: user.diditSessionId, status: undefined as string | undefined }
        : undefined);
    const chosen = approved || stored;
    if (!chosen?.session_id) return;

    const full = await this.retrieveSession(chosen.session_id);
    const status = normalizeDiditStatus(full?.status || chosen.status);
    if (!status) return;
    await this.applyDiditStatus(userId, status, {
      sessionId: chosen.session_id,
      decision: full?.decision,
      notify: !user.licenseVerified && status === 'Approved',
    });
  }

  private async listSessionsForVendor(
    userId: string,
  ): Promise<Array<{ session_id?: string; status?: string }>> {
    const apiKey = this.config.get<string>('DIDIT_API_KEY');
    if (!apiKey || !userId) return [];
    try {
      const url = new URL(`${DIDIT_VERIFICATION_API}/v3/sessions/`);
      url.searchParams.set('vendor_data', userId);
      url.searchParams.set('page_size', '50');
      const res = await fetch(url.toString(), { headers: { 'x-api-key': apiKey } });
      if (!res.ok) {
        this.logger.warn(`Didit session list failed (${res.status}) for vendor ${userId}`);
        return [];
      }
      const body = (await res.json()) as {
        results?: Array<{ session_id?: string; status?: string }>;
      };
      return Array.isArray(body.results) ? body.results : [];
    } catch (err) {
      this.logger.warn(
        `Didit session list error: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  private async retrieveSession(sessionId: string): Promise<{
    status?: string;
    decision?: DiditDecision;
  } | null> {
    const apiKey = this.config.get<string>('DIDIT_API_KEY');
    if (!apiKey || !sessionId) return null;
    try {
      const res = await fetch(
        `${DIDIT_VERIFICATION_API}/v3/session/${encodeURIComponent(sessionId)}/decision/`,
        { headers: { 'x-api-key': apiKey } },
      );
      if (!res.ok) {
        this.logger.warn(`Didit session retrieve failed (${res.status}) for ${sessionId}`);
        return null;
      }
      const body = (await res.json()) as {
        status?: string;
        date_of_birth?: string;
        decision?: DiditDecision;
        id_verifications?: DiditDecision['id_verifications'];
      };
      return {
        status: body.status,
        decision: {
          ...(body.decision || {}),
          date_of_birth: body.decision?.date_of_birth ?? body.date_of_birth,
          id_verifications: body.decision?.id_verifications ?? body.id_verifications,
        },
      };
    } catch (err) {
      this.logger.warn(
        `Didit session retrieve error: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private vendorUserId(event: DiditWebhookPayload): string | null {
    const v = event.vendor_data;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object' && typeof v.id === 'string' && v.id.trim()) {
      return v.id.trim();
    }
    return null;
  }

  private async dispatchStatus(event: DiditWebhookPayload) {
    const userId = this.vendorUserId(event);
    if (!userId) return;
    const status = event.status || event.decision?.status;
    if (!status) return;
    await this.applyDiditStatus(userId, status, {
      sessionId: event.session_id,
      decision: event.decision,
      notify: true,
    });
  }

  private async applyDiditStatus(
    userId: string,
    statusRaw: string,
    opts: { sessionId?: string; decision?: DiditDecision; notify?: boolean } = {},
  ) {
    const status = normalizeDiditStatus(statusRaw);
    switch (status) {
      case 'Approved': {
        const already = await this.users.findById(userId);
        let decision = opts.decision;
        if (this.licenseDetailsIncomplete(decision) && opts.sessionId) {
          const full = await this.retrieveSession(opts.sessionId);
          if (full?.decision) decision = full.decision;
        }
        const docNumber = this.extractLicenseNumber(decision);
        const address = this.extractLicenseAddress(decision);
        await this.users.setLicenseVerified(userId, {
          licenseNumber: docNumber,
          sessionId: opts.sessionId,
          ...address,
        });
        if (opts.notify !== false && !already?.licenseVerified) {
          this.notifications.licenseApproved(userId);
        }
        break;
      }
      case 'Declined':
        await this.users.setLicenseVerificationStatus(userId, 'declined', opts.sessionId);
        if (opts.notify !== false) this.notifications.licenseDenied(userId);
        break;
      case 'In Review':
        await this.users.setLicenseVerificationStatus(userId, 'pending_review', opts.sessionId);
        break;
      case 'Resubmitted':
        await this.users.setLicenseVerificationStatus(userId, 'resubmitted', opts.sessionId);
        break;
      case 'Expired':
      case 'Kyc Expired':
        await this.users.setLicenseVerificationStatus(userId, 'expired', opts.sessionId);
        break;
      case 'In Progress':
        await this.users.setLicenseVerificationStatus(userId, 'in_progress', opts.sessionId);
        break;
      case 'Awaiting User':
        await this.users.setLicenseVerificationStatus(userId, 'awaiting_user', opts.sessionId);
        break;
      default:
        this.logger.debug(`Didit status noop: ${status}`);
        break;
    }
  }

  private licenseDetailsIncomplete(decision?: DiditDecision): boolean {
    const details = this.extractLicenseAddress(decision);
    return !details?.addressLine || !details.addressPostalCode || !details.dateOfBirth || !details.gender;
  }

  private extractLicenseNumber(decision?: DiditDecision): string | undefined {
    const entries = decision?.id_verifications;
    if (!Array.isArray(entries)) return undefined;
    for (const entry of entries) {
      const num = entry?.document_number?.trim();
      if (num) return num;
    }
    return undefined;
  }

  private extractLicenseAddress(decision?: DiditDecision): {
    addressLine?: string;
    addressCity?: string;
    addressCountry?: string;
    addressProvince?: string;
    addressPostalCode?: string;
    dateOfBirth?: string;
    gender?: string;
  } | undefined {
    const entries = decision?.id_verifications;
    if (!Array.isArray(entries) || !entries.length) return undefined;

    const details: {
      addressLine?: string;
      addressCity?: string;
      addressCountry?: string;
      addressProvince?: string;
      addressPostalCode?: string;
      dateOfBirth?: string;
      gender?: string;
    } = {};

    const take = (key: keyof typeof details, value: string | undefined) => {
      if (!details[key] && value) details[key] = value;
    };

    for (const entry of entries) {
      const parsed = entry?.parsed_address;
      const street = [parsed?.street_1, parsed?.street_2]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(', ');
      take(
        'addressLine',
        street ||
          (typeof entry?.address === 'string' ? entry.address.trim() : '') ||
          (typeof entry?.formatted_address === 'string' ? entry.formatted_address.trim() : '') ||
          undefined,
      );
      take('addressCity', typeof parsed?.city === 'string' ? parsed.city.trim() : undefined);
      take(
        'addressProvince',
        (typeof parsed?.region === 'string' && parsed.region.trim()) ||
          (typeof parsed?.province === 'string' && parsed.province.trim()) ||
          (typeof parsed?.state === 'string' && parsed.state.trim()) ||
          undefined,
      );
      take(
        'addressPostalCode',
        typeof parsed?.postal_code === 'string' ? parsed.postal_code.trim() : undefined,
      );
      take(
        'addressCountry',
        (typeof parsed?.country === 'string' && parsed.country.trim()) ||
          (typeof entry?.issuing_state_name === 'string' && entry.issuing_state_name.trim()) ||
          undefined,
      );
      const dobRaw =
        (typeof entry?.date_of_birth === 'string' && entry.date_of_birth.trim()) ||
        (typeof entry?.birth_date === 'string' && entry.birth_date.trim()) ||
        (typeof decision?.date_of_birth === 'string' && decision.date_of_birth.trim()) ||
        '';
      take('dateOfBirth', /^\d{4}-\d{2}-\d{2}/.test(dobRaw) ? dobRaw.slice(0, 10) : undefined);
      const genderRaw =
        (typeof entry?.gender === 'string' && entry.gender.trim()) ||
        extraFieldString(entry?.extra_fields, 'gender') ||
        extraFieldString(entry?.extra_fields, 'sex') ||
        '';
      take('gender', genderRaw || undefined);

      const freeform = [
        typeof parsed?.formatted_address === 'string' ? parsed.formatted_address : '',
        typeof entry?.formatted_address === 'string' ? entry.formatted_address : '',
        typeof entry?.address === 'string' ? entry.address : '',
      ]
        .filter(Boolean)
        .join(' | ');
      if (freeform) {
        take('addressPostalCode', parsePostalCode(freeform));
        take('addressProvince', parseProvince(freeform));
      }
    }

    if (!Object.values(details).some(Boolean)) return undefined;
    return details;
  }
}

function extraFieldString(
  extra: Record<string, unknown> | undefined,
  key: string,
): string {
  if (!extra) return '';
  const value = extra[key];
  return typeof value === 'string' ? value.trim() : '';
}

function parsePostalCode(text: string): string | undefined {
  const canadian = text.match(/\b([A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d)\b/);
  if (canadian) return canadian[1].toUpperCase().replace(/\s+/g, ' ');
  const us = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
  return us ? us[1] : undefined;
}

const PROVINCE_NAMES: Record<string, string> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

function parseProvince(text: string): string | undefined {
  const named = text.match(
    /\b(Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Northwest Territories|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon)\b/i,
  );
  if (named) return named[1];
  const coded = text.match(/\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/);
  if (coded) return PROVINCE_NAMES[coded[1]] || coded[1];
  return undefined;
}
