import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { AssistedLeadEntity } from '../entities/assisted-lead.entity';
import { AssistedBookingDraftEntity } from '../entities/assisted-booking-draft.entity';
import { AssistedInviteTokenEntity } from '../entities/assisted-invite-token.entity';
import { LegalAcceptanceEntity } from '../entities/legal-acceptance.entity';
import { AdminAuditLogEntity } from '../entities/admin-audit-log.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { hashOpaque } from '../common/crypto.util';
import { AuthService } from '../auth/auth.service';
import { BookingsService, QuoteInput } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { PinpointService } from '../notifications/pinpoint.service';
import { publicWebUrl } from '../common/public-web-origin';
import { ConfigService } from '@nestjs/config';
import {
  EMAIL_INVITE_TTL_MS,
  LEGAL_VERSIONS,
  MAX_INVITES_PER_LEAD_PER_DAY,
  MAX_INVITES_PER_STAFF_PER_HOUR,
  MS_PER_HOUR,
  type LegalDocument,
} from './assisted.constants';
import {
  checklistFromState,
  inviteTtlMs,
  nextIncompleteStep,
  quotesDifferCents,
  scrubAuditMetadata,
  shouldFallbackToEmail,
} from './assisted-progress';

const SUPPORT = 'support@rentyourride.ca';

@Injectable()
export class AssistedService {
  constructor(
    @InjectRepository(AssistedLeadEntity)
    private readonly leads: Repository<AssistedLeadEntity>,
    @InjectRepository(AssistedBookingDraftEntity)
    private readonly drafts: Repository<AssistedBookingDraftEntity>,
    @InjectRepository(AssistedInviteTokenEntity)
    private readonly tokens: Repository<AssistedInviteTokenEntity>,
    @InjectRepository(LegalAcceptanceEntity)
    private readonly legal: Repository<LegalAcceptanceEntity>,
    @InjectRepository(AdminAuditLogEntity)
    private readonly audit: Repository<AdminAuditLogEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly auth: AuthService,
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly pinpoint: PinpointService,
    private readonly config: ConfigService,
  ) {}

  async createLead(
    staffId: string,
    body: { name: string; email?: string; phone?: string; notes?: string },
    ip?: string | null,
    ua?: string | null,
  ) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    const email = body.email?.trim().toLowerCase() || null;
    const phone = body.phone?.trim() || null;
    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }
    const lead = await this.leads.save(
      this.leads.create({
        createdByStaffId: staffId,
        name,
        email,
        phone,
        notes: body.notes?.trim() || null,
        source: 'facebook_marketplace',
        status: 'open',
      }),
    );
    await this.writeAudit(staffId, 'lead.create', lead.id, { name, email: email ? 'set' : null, phone: phone ? 'set' : null }, ip, ua);
    return this.presentLead(lead.id);
  }

  async listLeads() {
    const rows = await this.leads.find({ order: { createdAt: 'DESC' }, take: 100 });
    return Promise.all(rows.map((row) => this.presentLead(row.id)));
  }

  async getLead(id: string) {
    return this.presentLead(id);
  }

  async updateLead(
    staffId: string,
    id: string,
    body: { name?: string; email?: string; phone?: string; notes?: string },
    ip?: string | null,
    ua?: string | null,
  ) {
    const lead = await this.requireLead(id);
    if (body.name?.trim()) lead.name = body.name.trim();
    if (body.email !== undefined) lead.email = body.email.trim().toLowerCase() || null;
    if (body.phone !== undefined) lead.phone = body.phone.trim() || null;
    if (body.notes !== undefined) lead.notes = body.notes.trim() || null;
    await this.leads.save(lead);
    await this.writeAudit(staffId, 'lead.update', lead.id, { fields: Object.keys(body) }, ip, ua);
    return this.presentLead(lead.id);
  }

  async saveDraft(
    staffId: string,
    leadId: string,
    body: {
      listingId: string;
      bookingDates: QuoteInput['bookingDates'];
      extraUnlimitedKm?: boolean;
      extraPrepaidFuel?: boolean;
      extraPrepaidClean?: boolean;
      deliveryEnabled?: boolean;
      introMessage?: string;
    },
    ip?: string | null,
    ua?: string | null,
  ) {
    await this.requireLead(leadId);
    const listing = await this.requireListing(body.listingId);
    const quote = this.bookings.quote(listing, {
      listingId: listing.id,
      bookingDates: body.bookingDates,
      extraUnlimitedKm: body.extraUnlimitedKm,
      extraPrepaidFuel: body.extraPrepaidFuel,
      extraPrepaidClean: body.extraPrepaidClean,
      deliveryEnabled: body.deliveryEnabled,
    });
    const extras = [
      body.extraPrepaidClean ? { key: 'clean', label: 'Pre paid clean' } : null,
      body.extraUnlimitedKm ? { key: 'kms', label: 'Unlimited kms' } : null,
      body.extraPrepaidFuel ? { key: 'fuel', label: 'Pre paid fuel' } : null,
    ].filter(Boolean);
    let draft = await this.drafts.findOne({ where: { leadId } });
    if (!draft) {
      draft = this.drafts.create({ leadId });
    }
    draft.listingId = listing.id;
    draft.bookingDates = { ...body.bookingDates };
    draft.extras = extras as unknown[];
    draft.deliveryEnabled = Boolean(body.deliveryEnabled);
    draft.introMessage = body.introMessage?.trim() || null;
    draft.quotedPricing = { ...quote };
    draft.quotedGrandTotalCents = Math.round(Number(quote.grandTotal) * 100);
    draft.quotedAt = new Date();
    await this.drafts.save(draft);
    await this.writeAudit(staffId, 'draft.save', leadId, { listingId: listing.id, grandTotalCents: draft.quotedGrandTotalCents }, ip, ua);
    return this.presentLead(leadId);
  }

  async sendInvite(
    staffId: string,
    leadId: string,
    requestedChannel: 'sms' | 'email',
    ip?: string | null,
    ua?: string | null,
  ) {
    const lead = await this.requireLead(leadId);
    const draft = await this.drafts.findOne({ where: { leadId } });
    if (!draft) throw new BadRequestException('Save a booking draft before sending a link');
    await this.assertSendLimits(staffId, leadId);

    if (requestedChannel === 'sms' && !lead.phone) {
      throw new BadRequestException('This lead has no phone number');
    }
    if (requestedChannel === 'email' && !lead.email) {
      throw new BadRequestException('This lead has no email');
    }

    await this.revokeOpenTokens(leadId);

    let channel: 'sms' | 'email' = requestedChannel;
    let smsFailure: string | null = null;
    let smsSent = false;

    const raw = randomBytes(32).toString('hex');
    const finishPath = `/finish/${raw}`;
    const url = publicWebUrl(finishPath, this.config);

    if (requestedChannel === 'sms' && lead.phone) {
      const sms = await this.pinpoint.sendSms(lead.phone, this.smsCopy(lead.name, url));
      smsSent = sms.sent;
      smsFailure = sms.failure ?? (sms.sent ? null : 'provider_error');
      if (
        shouldFallbackToEmail({
          requestedChannel,
          smsSent,
          smsFailure,
          hasEmail: Boolean(lead.email),
        })
      ) {
        channel = 'email';
      } else if (!smsSent) {
        throw new BadRequestException(
          'Could not send the SMS link. Add an email to send by email instead.',
        );
      }
    }

    const expiresAt = new Date(Date.now() + inviteTtlMs(channel));
    const row = await this.tokens.save(
      this.tokens.create({
        leadId,
        tokenHash: hashOpaque(raw),
        channel,
        expiresAt,
        createdByStaffId: staffId,
        deliveredVia: channel,
      }),
    );

    if (channel === 'email') {
      if (!lead.email) {
        throw new BadRequestException('Email fallback needs an email on the lead');
      }
      const hours = Math.round(EMAIL_INVITE_TTL_MS / MS_PER_HOUR);
      await this.pinpoint.sendSimpleEmail(
        lead.email,
        'Finish your Rent Your Ride booking',
        [
          `Hi ${lead.name},`,
          '',
          'You asked Rent Your Ride for help finishing a booking request from Facebook Marketplace. Use this secure link on your own device:',
          url,
          '',
          `This link expires in ${hours} hours and only works for you.`,
          '',
          `Questions? ${SUPPORT}`,
          'This is a transactional message about a booking you asked us to help with. Reply STOP by SMS or email support to opt out of texts.',
        ].join('\n'),
      );
    }

    await this.writeAudit(
      staffId,
      'invite.send',
      leadId,
      {
        requestedChannel,
        deliveredVia: channel,
        inviteId: row.id,
        smsFallback: requestedChannel === 'sms' && channel === 'email',
        smsFailure: smsFailure === 'spend_cap' ? 'spend_cap' : undefined,
      },
      ip,
      ua,
    );
    return {
      deliveredVia: channel,
      expiresAt: expiresAt.toISOString(),
      inviteId: row.id,
    };
  }

  async revokeInvites(staffId: string, leadId: string, ip?: string | null, ua?: string | null) {
    await this.requireLead(leadId);
    const n = await this.revokeOpenTokens(leadId);
    await this.writeAudit(staffId, 'invite.revoke', leadId, { count: n }, ip, ua);
    return { revoked: n };
  }

  async listAudit(leadId: string) {
    await this.requireLead(leadId);
    const rows = await this.audit.find({
      where: { entityType: 'assisted_lead', entityId: leadId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      metadata: scrubAuditMetadata(r.metadata ?? {}),
      createdAt: r.createdAt.toISOString(),
      staffUserId: r.staffUserId,
    }));
  }

  async getFinishSession(rawToken: string, userId: string | null) {
    const invite = await this.requireActiveInvite(rawToken);
    this.assertViewer(invite, userId);
    return this.presentSession(invite, userId);
  }

  async acceptLegal(
    rawToken: string,
    documents: LegalDocument[],
    userId: string | null,
    ip?: string | null,
    ua?: string | null,
  ) {
    const invite = await this.requireActiveInvite(rawToken);
    this.assertViewer(invite, userId);
    const allowed: LegalDocument[] = ['terms', 'privacy', 'rental_agreement'];
    for (const document of documents) {
      if (!allowed.includes(document)) {
        throw new BadRequestException('Unknown legal document');
      }
      await this.legal.save(
        this.legal.create({
          userId: invite.boundUserId ?? userId,
          leadId: invite.leadId,
          document,
          version: LEGAL_VERSIONS[document],
          acceptedAt: new Date(),
          ip: ip ?? null,
          userAgent: ua ?? null,
          context: { inviteId: invite.id },
        }),
      );
    }
    return this.presentSession(invite, userId ?? invite.boundUserId);
  }

  async authWithToken(
    rawToken: string,
    kind: 'register' | 'login' | 'google' | 'apple',
    body: Record<string, string>,
    ip?: string | null,
    ua?: string | null,
  ) {
    const invite = await this.requireActiveInvite(rawToken);
    if (invite.boundUserId) {
      throw new ForbiddenException('This link is already attached to an account. Sign in with that account.');
    }
    let payload: { user: { id: string } };
    try {
      if (kind === 'register') {
        payload = await this.auth.register({
          email: body.email,
          password: body.password,
          firstName: body.firstName,
          lastName: body.lastName,
        });
      } else if (kind === 'login') {
        payload = await this.auth.login(body.email, body.password);
      } else if (kind === 'google') {
        payload = await this.auth.loginWithGoogle({
          idToken: body.idToken,
          firstName: body.firstName,
          lastName: body.lastName,
        });
      } else {
        payload = await this.auth.loginWithApple({
          identityToken: body.identityToken,
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
        });
      }
    } catch (err) {
      if (err instanceof ConflictException) {
        throw new ConflictException({
          code: 'SIGN_IN_REQUIRED',
          message: 'An account with this email already exists. Sign in to continue.',
        });
      }
      throw err;
    }
    invite.boundUserId = payload.user.id;
    await this.tokens.save(invite);
    const lead = await this.requireLead(invite.leadId);
    lead.linkedUserId = payload.user.id;
    lead.status = 'linked';
    await this.leads.save(lead);
    await this.legal
      .createQueryBuilder()
      .update()
      .set({ userId: payload.user.id })
      .where('lead_id = :leadId AND user_id IS NULL', { leadId: invite.leadId })
      .execute();
    return payload;
  }

  async acceptBooking(
    rawToken: string,
    userId: string,
    ip?: string | null,
    ua?: string | null,
  ) {
    const invite = await this.requireActiveInvite(rawToken);
    this.assertViewer(invite, userId);
    if (!invite.boundUserId || invite.boundUserId !== userId) {
      throw new ForbiddenException('Sign in with the account attached to this link');
    }
    const draft = await this.drafts.findOne({ where: { leadId: invite.leadId } });
    if (!draft) throw new BadRequestException('No booking draft on this lead');
    if (draft.bookingId) {
      throw new ConflictException('This booking request was already created');
    }

    const rental = await this.hasLegal(userId, invite.leadId, 'rental_agreement');
    if (!rental) {
      throw new BadRequestException('Accept the rental agreement before finishing this booking');
    }

    const listing = await this.requireListing(draft.listingId);
    const quote = this.bookings.quote(listing, this.quoteInputFromDraft(draft));
    const nextCents = Math.round(Number(quote.grandTotal) * 100);
    if (quotesDifferCents(draft.quotedGrandTotalCents, nextCents)) {
      draft.quotedPricing = { ...quote };
      draft.quotedGrandTotalCents = nextCents;
      draft.quotedAt = new Date();
      await this.drafts.save(draft);
      throw new ConflictException({
        code: 'PRICE_CHANGED',
        message: 'The price changed. Review the new total and accept again.',
        quote,
      });
    }

    const methods = await this.payments.listMethods(userId);
    const selected = methods.find((m) => m.isDefault) ?? methods[0];
    if (!selected?.id) {
      throw new BadRequestException('Add a card before finishing this booking');
    }

    const booking = await this.bookings.createBooking(
      userId,
      {
        listingId: listing.id,
        listingSnapshot: listing.toDetailDto(listing.host),
        bookingDates: draft.bookingDates,
        extras: draft.extras ?? [],
        deliveryEnabled: draft.deliveryEnabled,
        introMessage: draft.introMessage ?? '',
        pricing: { ...quote },
        selectedPaymentMethod: {
          id: selected.id,
          brand: selected.brand,
          last4: selected.last4,
          funding: selected.funding,
        },
        instantBooking: listing.instantBooking === true,
      },
      `assisted:${invite.id}`,
    );

    await this.bookings.signAgreement(userId, booking.id, {
      role: 'guest',
      signature: 'accepted',
    });
    await this.legal.save(
      this.legal.create({
        userId,
        leadId: invite.leadId,
        document: 'rental_agreement',
        version: LEGAL_VERSIONS.rental_agreement,
        acceptedAt: new Date(),
        ip: ip ?? null,
        userAgent: ua ?? null,
        context: { bookingId: booking.id, inviteId: invite.id },
      }),
    );

    draft.bookingId = booking.id;
    await this.drafts.save(draft);
    const lead = await this.requireLead(invite.leadId);
    lead.status = 'booked';
    await this.leads.save(lead);
    return booking;
  }

  private quoteInputFromDraft(draft: AssistedBookingDraftEntity): QuoteInput {
    const extras = (draft.extras ?? []) as { key?: string }[];
    return {
      listingId: draft.listingId,
      bookingDates: draft.bookingDates as QuoteInput['bookingDates'],
      extraUnlimitedKm: extras.some((e) => e?.key === 'kms'),
      extraPrepaidFuel: extras.some((e) => e?.key === 'fuel'),
      extraPrepaidClean: extras.some((e) => e?.key === 'clean'),
      deliveryEnabled: draft.deliveryEnabled,
    };
  }

  private async presentLead(id: string) {
    const lead = await this.requireLead(id);
    const draft = await this.drafts.findOne({
      where: { leadId: id },
      relations: ['listing'],
    });
    const user = lead.linkedUserId
      ? await this.users.findOne({ where: { id: lead.linkedUserId } })
      : null;
    const hasCard = user ? (await this.payments.listMethods(user.id)).length > 0 : false;
    const terms = await this.hasLegal(user?.id ?? null, id, 'terms');
    const privacy = await this.hasLegal(user?.id ?? null, id, 'privacy');
    const check = checklistFromState({
      termsAccepted: terms,
      privacyAccepted: privacy,
      boundUserId: lead.linkedUserId,
      emailVerified: !!user?.emailVerified,
      phoneVerified: !!user?.phoneVerified,
      licenseVerified: !!user?.licenseVerified,
      hasCard,
      bookingId: draft?.bookingId ?? null,
    });
    const openInvite = await this.tokens.findOne({
      where: { leadId: id, revokedAt: null as unknown as Date },
      order: { createdAt: 'DESC' },
    });
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes,
      source: lead.source,
      status: lead.status,
      linkedUserId: lead.linkedUserId,
      createdAt: lead.createdAt.toISOString(),
      checklist: check,
      nextStep: nextIncompleteStep(check),
      draft: draft
        ? {
            listingId: draft.listingId,
            listingTitle: draft.listing?.title ?? null,
            bookingDates: draft.bookingDates,
            extras: draft.extras,
            deliveryEnabled: draft.deliveryEnabled,
            introMessage: draft.introMessage,
            quote: draft.quotedPricing,
            quotedGrandTotalCents: draft.quotedGrandTotalCents,
            bookingId: draft.bookingId,
          }
        : null,
      invite: openInvite
        ? {
            id: openInvite.id,
            channel: openInvite.channel,
            deliveredVia: openInvite.deliveredVia,
            expiresAt: openInvite.expiresAt.toISOString(),
            revoked: Boolean(openInvite.revokedAt),
            bound: Boolean(openInvite.boundUserId),
          }
        : null,
    };
  }

  private async presentSession(invite: AssistedInviteTokenEntity, userId: string | null) {
    const lead = await this.requireLead(invite.leadId);
    const draft = await this.drafts.findOne({
      where: { leadId: invite.leadId },
      relations: ['listing', 'listing.host'],
    });
    if (!draft?.listing) throw new BadRequestException('This link has no booking draft yet');
    const boundId = invite.boundUserId;
    if (boundId && userId && userId !== boundId) {
      throw new ForbiddenException('This link belongs to a different account');
    }
    const user = boundId
      ? await this.users.findOne({ where: { id: boundId } })
      : userId
        ? await this.users.findOne({ where: { id: userId } })
        : null;
    const viewerId = user?.id ?? null;
    const hasCard = viewerId ? (await this.payments.listMethods(viewerId)).length > 0 : false;
    const terms = await this.hasLegal(viewerId, lead.id, 'terms');
    const privacy = await this.hasLegal(viewerId, lead.id, 'privacy');
    const rental = await this.hasLegal(viewerId, lead.id, 'rental_agreement');
    const signedInAsBound = Boolean(boundId && viewerId && viewerId === boundId);
    const check = checklistFromState({
      termsAccepted: terms,
      privacyAccepted: privacy,
      boundUserId: signedInAsBound ? boundId : null,
      emailVerified: signedInAsBound ? !!user?.emailVerified : false,
      phoneVerified: signedInAsBound ? !!user?.phoneVerified : false,
      licenseVerified: signedInAsBound ? !!user?.licenseVerified : false,
      hasCard: signedInAsBound ? hasCard : false,
      bookingId: draft.bookingId,
    });
    const listing = draft.listing;
    return {
      leadFirstName: lead.name.split(' ')[0] || lead.name,
      expiresAt: invite.expiresAt.toISOString(),
      bound: Boolean(boundId),
      legalVersions: LEGAL_VERSIONS,
      legal: { terms, privacy, rentalAgreement: rental },
      checklist: check,
      nextStep: nextIncompleteStep(check),
      draft: {
        listingId: listing.id,
        title: listing.title,
        city: listing.city,
        bookingDates: draft.bookingDates,
        extras: draft.extras,
        deliveryEnabled: draft.deliveryEnabled,
        quote: draft.quotedPricing,
      },
      bookingId: draft.bookingId,
    };
  }

  private async requireActiveInvite(rawToken: string): Promise<AssistedInviteTokenEntity> {
    const token = rawToken?.trim();
    if (!token) throw new UnauthorizedException('Invalid link');
    const row = await this.tokens.findOne({ where: { tokenHash: hashOpaque(token) } });
    if (!row) throw new UnauthorizedException('Invalid link');
    if (row.revokedAt) throw new UnauthorizedException('This link was revoked');
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('This link has expired');
    }
    return row;
  }

  private assertViewer(invite: AssistedInviteTokenEntity, userId: string | null) {
    if (invite.boundUserId && userId && invite.boundUserId !== userId) {
      throw new ForbiddenException('This link belongs to a different account');
    }
  }

  private async hasLegal(
    userId: string | null,
    leadId: string,
    document: LegalDocument,
  ): Promise<boolean> {
    const version = LEGAL_VERSIONS[document];
    if (userId) {
      const row = await this.legal.findOne({
        where: { userId, document, version },
      });
      if (row) return true;
    }
    const leadRow = await this.legal.findOne({
      where: { leadId, document, version },
    });
    return Boolean(leadRow);
  }

  private async requireLead(id: string) {
    const lead = await this.leads.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private async requireListing(id: string) {
    const listing = await this.listings.findOne({
      where: { id },
      relations: ['host'],
    });
    if (!listing?.published || !listing.active) {
      throw new NotFoundException('Listing not available');
    }
    return listing;
  }

  private async revokeOpenTokens(leadId: string): Promise<number> {
    const open = await this.tokens.find({ where: { leadId } });
    let n = 0;
    const now = new Date();
    for (const row of open) {
      if (row.revokedAt) continue;
      if (row.expiresAt.getTime() <= now.getTime()) continue;
      row.revokedAt = now;
      await this.tokens.save(row);
      n += 1;
    }
    return n;
  }

  private async assertSendLimits(staffId: string, leadId: string) {
    const dayAgo = new Date(Date.now() - 24 * MS_PER_HOUR);
    const hourAgo = new Date(Date.now() - MS_PER_HOUR);
    const leadCount = await this.tokens.count({
      where: { leadId, createdAt: MoreThan(dayAgo) },
    });
    if (leadCount >= MAX_INVITES_PER_LEAD_PER_DAY) {
      throw new BadRequestException('Daily send limit reached for this lead');
    }
    const staffCount = await this.tokens.count({
      where: { createdByStaffId: staffId, createdAt: MoreThan(hourAgo) },
    });
    if (staffCount >= MAX_INVITES_PER_STAFF_PER_HOUR) {
      throw new BadRequestException('Hourly send limit reached. Try again later.');
    }
  }

  private smsCopy(name: string, url: string): string {
    const first = name.split(' ')[0] || name;
    return `Rent Your Ride: Hi ${first}, finish your booking request here (expires in 24 hours): ${url} Questions? ${SUPPORT}. Reply STOP to opt out.`;
  }

  private async writeAudit(
    staffId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
    ip?: string | null,
    ua?: string | null,
  ) {
    await this.audit.save(
      this.audit.create({
        staffUserId: staffId,
        action,
        entityType: 'assisted_lead',
        entityId,
        metadata: scrubAuditMetadata(metadata),
        ip: ip ?? null,
        userAgent: ua ?? null,
      }),
    );
  }
}
