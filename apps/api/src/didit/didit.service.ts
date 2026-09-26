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

type DiditParsedAddress = {
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

type DiditIdVerification = {
  document_number?: string;
  first_name?: string;
  last_name?: string;
  given_name?: string;
  family_name?: string;
  full_name?: string;
  name?: string;
  name_on_document?: string;
  address?: string;
  formatted_address?: string;
  issuing_state_name?: string;
  date_of_birth?: string;
  birth_date?: string;
  gender?: string;
  extra_fields?: Record<string, unknown>;
  parsed_address?: DiditParsedAddress;
};

type DiditPoaVerification = {
  address?: string;
  formatted_address?: string;
  parsed_address?: DiditParsedAddress;
};

type DiditDecision = {
  status?: string;
  date_of_birth?: string;
  id_verifications?: DiditIdVerification[];
  poa_verifications?: DiditPoaVerification[];
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

  /**
   * User cancelled Didit mid-flow (or abandoned before submit).
   * Clears sticky in_progress / awaiting_user so they can start again.
   * Does not change true pending_review (docs already submitted).
   */
  async abandonIncompleteLicenseSession(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      return { ok: true, licenseVerificationStatus: '' };
    }
    const status = (user.licenseVerificationStatus || '').trim();
    if (status !== 'in_progress' && status !== 'awaiting_user') {
      return {
        ok: true,
        licenseVerificationStatus: status,
        licenseVerified: !!user.licenseVerified,
      };
    }
    const next = user.licenseVerified ? 'approved' : '';
    const dto = await this.users.setLicenseVerificationStatus(userId, next);
    return {
      ok: true,
      licenseVerificationStatus: dto.licenseVerificationStatus ?? next,
      licenseVerified: !!dto.licenseVerified,
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
   * Sync our stored license flags with Didit's current decision for this user.
   * Prefer the session id we last stored; otherwise the newest Didit session.
   * Never prefer an older Approved over a newer Declined (that left users
   * looking verified after Didit declined them).
   */
  async reconcileUserLicense(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;

    let sessionId = user.diditSessionId || undefined;
    let listStatus: string | undefined;

    if (!sessionId) {
      const sessions = await this.listSessionsForVendor(userId);
      const newest = sessions[0];
      sessionId = newest?.session_id;
      listStatus = newest?.status;
    }

    if (!sessionId) return;

    const full = await this.retrieveSession(sessionId);
    const status = normalizeDiditStatus(full?.status || listStatus);
    if (!status) return;

    await this.applyDiditStatus(userId, status, {
      sessionId,
      decision: full?.decision,
      // Notify only when applyDiditStatus detects a real approve/deny transition
      // (covers webhook misses; no-ops when already in that terminal state).
      notify: true,
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
        poa_verifications?: DiditDecision['poa_verifications'];
      };
      return {
        status: body.status,
        decision: {
          ...(body.decision || {}),
          date_of_birth: body.decision?.date_of_birth ?? body.date_of_birth,
          id_verifications: body.decision?.id_verifications ?? body.id_verifications,
          poa_verifications: body.decision?.poa_verifications ?? body.poa_verifications,
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
    const before = await this.users.findById(userId);
    const prevStatus = (before?.licenseVerificationStatus || '').trim().toLowerCase();
    const wasVerified = !!before?.licenseVerified;
    // Already in the terminal approved state (avoid duplicate Approved webhooks / reconcile).
    const alreadyApproved = wasVerified && (prevStatus === 'approved' || prevStatus === '');
    const alreadyDeclined = prevStatus === 'declined';

    switch (status) {
      case 'Approved': {
        // Webhooks often omit OCR details — always pull the full decision when we can.
        let decision = opts.decision;
        if (opts.sessionId) {
          const full = await this.retrieveSession(opts.sessionId);
          if (full?.decision) {
            decision = {
              ...(decision || {}),
              ...full.decision,
              id_verifications:
                full.decision.id_verifications?.length
                  ? full.decision.id_verifications
                  : decision?.id_verifications,
              poa_verifications:
                full.decision.poa_verifications?.length
                  ? full.decision.poa_verifications
                  : decision?.poa_verifications,
              date_of_birth:
                full.decision.date_of_birth || decision?.date_of_birth,
            };
          }
        } else if (this.licenseDetailsIncomplete(decision)) {
          this.logger.warn(
            `Approved Didit status for ${userId} without session id — address may be incomplete`,
          );
        }
        const docNumber = this.extractLicenseNumber(decision);
        const address = this.extractLicenseAddress(decision);
        const legalName = this.extractLicenseName(decision);
        if (!address?.addressLine) {
          this.logger.warn(
            `Didit Approved for ${userId} but no address extracted (session=${opts.sessionId || 'none'})`,
          );
        }
        await this.users.setLicenseVerified(userId, {
          licenseNumber: docNumber,
          sessionId: opts.sessionId,
          ...address,
          ...legalName,
        });
        // Every transition into approved (incl. re-verify after deny / in-review / expiry).
        if (opts.notify !== false && !alreadyApproved) {
          this.notifications.licenseApproved(userId);
        }
        break;
      }
      case 'Declined':
        await this.users.setLicenseVerificationStatus(userId, 'declined', opts.sessionId);
        // Every transition into declined (incl. after a prior approval).
        if (opts.notify !== false && !alreadyDeclined) {
          this.notifications.licenseDenied(userId);
        }
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
      case 'Abandoned':
      case 'Not Started': {
        // User quit mid-flow before submitting — clear sticky in_progress so they can retry.
        if (wasVerified) {
          await this.users.setLicenseVerificationStatus(userId, 'approved', opts.sessionId);
        } else {
          await this.users.setLicenseVerificationStatus(userId, '', opts.sessionId);
        }
        break;
      }
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
    const idEntries = Array.isArray(decision?.id_verifications)
      ? decision!.id_verifications!
      : [];
    const poaEntries = Array.isArray(decision?.poa_verifications)
      ? decision!.poa_verifications!
      : [];

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

    const ingestAddress = (entry: {
      address?: string;
      formatted_address?: string;
      issuing_state_name?: string;
      parsed_address?: DiditParsedAddress;
    }) => {
      const parsed = entry?.parsed_address;
      const street = [parsed?.street_1, parsed?.street_2]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(', ');
      const freeform =
        street ||
        (typeof parsed?.formatted_address === 'string'
          ? parsed.formatted_address.trim()
          : '') ||
        (typeof entry?.formatted_address === 'string'
          ? entry.formatted_address.trim()
          : '') ||
        (typeof entry?.address === 'string' ? entry.address.trim() : '') ||
        '';

      // Prefer structured street for addressLine; otherwise keep the full freeform.
      take('addressLine', street || freeform || undefined);
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
          (typeof entry?.issuing_state_name === 'string' &&
            entry.issuing_state_name.trim()) ||
          undefined,
      );

      if (freeform) {
        take('addressPostalCode', parsePostalCode(freeform));
        take('addressProvince', parseProvince(freeform));
        take('addressCountry', parseCountry(freeform));
        // Only guess city from freeform when it looks like a full address.
        if (
          !details.addressCity &&
          (details.addressPostalCode ||
            details.addressProvince ||
            /,/.test(freeform))
        ) {
          take('addressCity', parseCity(freeform, details));
        }
      }
    };

    for (const entry of idEntries) {
      ingestAddress(entry);
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
    }

    // Proof-of-address step is a fallback when the license OCR lacked a street.
    for (const entry of poaEntries) {
      ingestAddress(entry);
    }

    // Normalize ISO country codes we commonly see from Didit.
    if (details.addressCountry) {
      const c = details.addressCountry.trim().toUpperCase();
      if (c === 'CA' || c === 'CAN') details.addressCountry = 'Canada';
      else if (c === 'US' || c === 'USA') details.addressCountry = 'United States';
    } else if (details.addressProvince && parseProvince(details.addressProvince)) {
      details.addressCountry = 'Canada';
    }

    if (!Object.values(details).some(Boolean)) return undefined;
    return details;
  }

  private extractLicenseName(decision?: DiditDecision): {
    licenseFirstName?: string;
    licenseLastName?: string;
  } | undefined {
    const entries = decision?.id_verifications;
    if (!Array.isArray(entries) || !entries.length) return undefined;

    for (const entry of entries) {
      const firstRaw =
        (typeof entry?.first_name === 'string' && entry.first_name.trim()) ||
        (typeof entry?.given_name === 'string' && entry.given_name.trim()) ||
        extraFieldString(entry?.extra_fields, 'first_name') ||
        extraFieldString(entry?.extra_fields, 'given_name') ||
        '';
      const lastRaw =
        (typeof entry?.last_name === 'string' && entry.last_name.trim()) ||
        (typeof entry?.family_name === 'string' && entry.family_name.trim()) ||
        extraFieldString(entry?.extra_fields, 'last_name') ||
        extraFieldString(entry?.extra_fields, 'family_name') ||
        '';
      if (firstRaw && lastRaw) {
        return {
          licenseFirstName: firstRaw.slice(0, 120),
          licenseLastName: lastRaw.slice(0, 120),
        };
      }

      const fullRaw =
        (typeof entry?.full_name === 'string' && entry.full_name.trim()) ||
        (typeof entry?.name === 'string' && entry.name.trim()) ||
        (typeof entry?.name_on_document === 'string' && entry.name_on_document.trim()) ||
        extraFieldString(entry?.extra_fields, 'full_name') ||
        '';
      const parsed = splitDocumentFullName(fullRaw);
      if (parsed) return parsed;
    }

    return undefined;
  }
}

function splitDocumentFullName(fullRaw: string): {
  licenseFirstName: string;
  licenseLastName: string;
} | undefined {
  const tokens = fullRaw
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.length < 2) return undefined;
  return {
    licenseFirstName: tokens[0].slice(0, 120),
    licenseLastName: tokens[tokens.length - 1].slice(0, 120),
  };
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

function parseCountry(text: string): string | undefined {
  if (/\b(Canada|CAN)\b/i.test(text)) return 'Canada';
  if (/\b(United States|USA|U\.S\.A\.)\b/i.test(text)) return 'United States';
  return undefined;
}

/** Best-effort city from a freeform Canadian/US address string. */
function parseCity(
  text: string,
  known: { addressProvince?: string; addressPostalCode?: string },
): string | undefined {
  let working = text.replace(/\s+/g, ' ').trim();
  const postal = known.addressPostalCode || parsePostalCode(working);
  if (postal) {
    working = working.replace(new RegExp(postal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
  }
  const province = known.addressProvince || parseProvince(working);
  if (province) {
    working = working.replace(new RegExp(`\\b${province}\\b`, 'i'), ' ');
    const code = Object.entries(PROVINCE_NAMES).find(
      ([, name]) => name.toLowerCase() === province.toLowerCase(),
    )?.[0];
    if (code) working = working.replace(new RegExp(`\\b${code}\\b`, 'i'), ' ');
  }
  working = working
    .replace(/\b(Canada|United States|USA|CAN)\b/i, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Take the last remaining token group as city (street usually comes first).
  const parts = working.split(/\s{2,}|\s-\s/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const city = parts[parts.length - 1];
    if (city && /[A-Za-z]/.test(city) && city.length < 80) return city;
  }
  // Fallback: last 1–3 words that look like a place name.
  const words = working.split(' ').filter(Boolean);
  if (words.length >= 2) {
    const city = words.slice(-2).join(' ');
    // Avoid returning street numbers as city.
    if (!/^\d/.test(city) && city.length < 80) return city;
  }
  return undefined;
}
