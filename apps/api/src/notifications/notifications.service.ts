import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingNotificationContext, formatBookingEndDate } from './booking-context';
import { PinpointService } from './pinpoint.service';
import { TemplateName } from './template-names';
import { TemplateVariablesBuilder } from './template-variables.builder';
import { ExpoPushService } from './expo-push.service';
import { PushTokenService } from './push-token.service';
import { SmsCopy } from './sms-copy';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import {
  adminBaseUrl,
  lines,
  vehicleLabel,
} from '../ops/ops-report.util';

type Recipient = Pick<
  UserEntity,
  'id' | 'email' | 'phone' | 'firstName' | 'lastName' | 'notificationSettings'
>;

type NotifyOpts = {
  sms?: string;
  email?: { template: TemplateName; vars: Record<string, string[]> };
  /** Pass only when push should be sent. Body defaults to `sms` when omitted. */
  push?: { body?: string; data?: Record<string, unknown> };
  /** Auth / OTP — ignore user email/text/push toggles. */
  transactional?: boolean;
};

/** Unset settings default ON (legacy parity + onboarding). Explicit `false` opts out. */
export function resolveNotificationPrefs(settings?: Recipient['notificationSettings'] | null) {
  return {
    textNotif: settings?.textNotif !== false,
    emailNotif: settings?.emailNotif !== false,
    pushNotif: settings?.pushNotif !== false,
  };
}

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    private readonly pinpoint: PinpointService,
    private readonly expoPush: ExpoPushService,
    private readonly pushTokens: PushTokenService,
    private readonly config: ConfigService,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(BookingExtensionEntity)
    private readonly extensions: Repository<BookingExtensionEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  private wantsEmail(user: Recipient, transactional?: boolean): boolean {
    if (transactional) return true;
    return resolveNotificationPrefs(user.notificationSettings).emailNotif;
  }

  private wantsSms(user: Recipient, transactional?: boolean): boolean {
    if (transactional) return true;
    return resolveNotificationPrefs(user.notificationSettings).textNotif;
  }

  private wantsPush(user: Recipient, transactional?: boolean): boolean {
    if (transactional) return true;
    return resolveNotificationPrefs(user.notificationSettings).pushNotif;
  }

  private run(task: Promise<void>): void {
    task.catch((err) =>
      this.log.warn('Notification dispatch failed', err instanceof Error ? err.stack : err),
    );
  }

  private async notifyUser(user: Recipient, opts: NotifyOpts): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    const transactional = !!opts.transactional;

    if (opts.email && this.wantsEmail(user, transactional)) {
      jobs.push(
        this.pinpoint.sendTemplateEmail(user.email, opts.email.template, opts.email.vars),
      );
    }
    if (opts.sms && user.phone && this.wantsSms(user, transactional)) {
      jobs.push(this.pinpoint.sendSms(user.phone, opts.sms));
    }
    // Push only when explicitly requested — do not auto-mirror SMS (legacy channel rules).
    if (opts.push && this.wantsPush(user, transactional)) {
      const pushBody = opts.push.body ?? opts.sms;
      if (pushBody) {
        jobs.push(
          (async () => {
            const tokens = await this.pushTokens.tokensForUser(user.id);
            if (!tokens.length) return;
            await this.expoPush.send(
              tokens.map((to) => ({
                to,
                body: pushBody,
                data: opts.push?.data,
              })),
            );
          })(),
        );
      }
    }
    await Promise.allSettled(jobs);
  }

  private async loadBooking(bookingId: string): Promise<BookingNotificationContext | null> {
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: ['guest', 'host', 'listing'],
    });
    if (!booking) {
      this.log.warn(`loadBooking: booking not found id=${bookingId}`);
      return null;
    }
    const ctx = BookingNotificationContext.fromEntity(booking);
    if (!ctx) {
      this.log.warn(
        `loadBooking: missing guest/host relations id=${bookingId}`,
      );
    }
    return ctx;
  }

  /** Guest: email+sms+push. Host: email+push+sms. */
  bookingCreated(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const renterSms = SmsCopy.bookingCreatedGuest();
        const hostSms = SmsCopy.bookingCreatedHost(ctx.guest.firstName ?? 'Guest');
        // Isolate channels so one Pinpoint failure cannot skip the other party.
        try {
          await this.notifyUser(ctx.guest, {
            sms: renterSms,
            email: {
              template: TemplateName.YouSentAReservationRequest,
              vars: ctx.createRequestGuestVars(),
            },
            push: { body: renterSms },
          });
        } catch (err) {
          this.log.warn(
            `bookingCreated guest notify failed id=${bookingId}`,
            err instanceof Error ? err.stack : err,
          );
        }
        try {
          await this.notifyUser(ctx.host, {
            sms: hostSms,
            email: {
              template: TemplateName.BookingRequest,
              vars: ctx.createRequestHostVars(),
            },
            push: {},
          });
        } catch (err) {
          this.log.warn(
            `bookingCreated host notify failed id=${bookingId}`,
            err instanceof Error ? err.stack : err,
          );
        }
      })(),
    );
  }

  /** Guest + host: email+sms+push. */
  bookingApproved(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const renterSms = SmsCopy.bookingApprovedGuest(
          ctx.host.firstName ?? 'Host',
          ctx.startLabel(),
          ctx.endLabel(),
        );
        const hostSms = SmsCopy.bookingApprovedHost(
          ctx.guest.firstName ?? 'Guest',
          ctx.startLabel(),
          ctx.endLabel(),
        );
        await this.notifyUser(ctx.guest, {
          sms: renterSms,
          email: {
            template: TemplateName.BookingRequestConfirmedGuest,
            vars: ctx.approveGuestVars(),
          },
          push: {},
        });
        await this.notifyUser(ctx.host, {
          sms: hostSms,
          email: {
            template: TemplateName.ConfirmedBookingRequestHost,
            vars: ctx.approveHostVars(),
          },
          push: {},
        });
      })(),
    );
  }

  /** Guest: email+sms+push. Host: email+sms+push. */
  bookingDenied(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const guestSms = SmsCopy.bookingDeniedGuest(ctx.host.firstName ?? 'Host');
        const hostSms = SmsCopy.bookingDeniedHost(ctx.guest.firstName ?? 'Guest');
        try {
          await this.notifyUser(ctx.guest, {
            sms: guestSms,
            email: {
              template: TemplateName.YourBookingRequestWasDenied,
              vars: ctx.baseBookingVars(),
            },
            push: {},
          });
        } catch (err) {
          this.log.warn(
            `bookingDenied guest notify failed id=${bookingId}`,
            err instanceof Error ? err.stack : err,
          );
        }
        try {
          await this.notifyUser(ctx.host, {
            sms: hostSms,
            email: {
              template: TemplateName.YouDeniedABookingRequest,
              vars: ctx.baseBookingVars(),
            },
            push: {},
          });
        } catch (err) {
          this.log.warn(
            `bookingDenied host notify failed id=${bookingId}`,
            err instanceof Error ? err.stack : err,
          );
        }
      })(),
    );
  }

  /** Guest: email+sms. Host: email+sms+push. */
  bookingCheckedIn(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.guest, {
          sms: SmsCopy.bookingCheckedInGuest(ctx.host.firstName ?? 'Host'),
          email: {
            template: TemplateName.YoureCheckedInGuest,
            vars: ctx.checkInGuestVars(),
          },
        });
        await this.notifyUser(ctx.host, {
          sms: SmsCopy.bookingCheckedInHost(ctx.guest.firstName ?? 'Guest'),
          email: {
            template: TemplateName.GuestHasCheckedInUsingYourRide,
            vars: ctx.checkInHostVars(),
          },
          push: {},
        });
      })(),
    );
  }

  /** Guest: email+sms. Host: email+sms+push. */
  bookingCheckedOut(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.guest, {
          sms: SmsCopy.bookingCheckedOutGuest(ctx.host.firstName ?? 'Host'),
          email: {
            template: TemplateName.YoureCheckedOutGuest,
            vars: ctx.baseBookingVars(),
          },
        });
        await this.notifyUser(ctx.host, {
          sms: SmsCopy.bookingCheckedOutHost(ctx.guest.firstName ?? 'Guest'),
          email: {
            template: TemplateName.GuestCheckedOutOfYourRide,
            vars: ctx.checkOutHostVars(),
          },
          push: {},
        });
      })(),
    );
  }

  /** Guest + host: email only. */
  reviewReminder(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const hostVars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Renter.FirstName', ctx.guest.firstName ?? '')
          .setVariable('Renter.Avatar', ctx.guest.avatarUrl ?? '')
          .build();
        const guestVars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Host.FirstName', ctx.host.firstName ?? '')
          .setVariable('Host.Avatar', ctx.host.avatarUrl ?? '')
          .build();
        await this.notifyUser(ctx.host, {
          email: { template: TemplateName.WriteAReviewForGuestName, vars: hostVars },
        });
        await this.notifyUser(ctx.guest, {
          email: { template: TemplateName.WriteAReviewGuest, vars: guestVars },
        });
      })(),
    );
  }

  /** Host: email only (legacy review templates). */
  reviewByGuest(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Renter.FirstName', ctx.guest.firstName ?? '')
          .setVariable('Host.FirstName', ctx.host.firstName ?? '')
          .build();
        await this.notifyUser(ctx.host, {
          email: { template: TemplateName.GuestNameWroteAReview, vars },
        });
      })(),
    );
  }

  /** Guest: email only. */
  reviewByHost(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Host.FirstName', ctx.host.firstName ?? '')
          .setVariable('Renter.FirstName', ctx.guest.firstName ?? '')
          .build();
        await this.notifyUser(ctx.guest, {
          email: { template: TemplateName.HostWroteYouAReview, vars },
        });
      })(),
    );
  }

  /** Guest + host: email+sms+push. */
  tripBeginningSoon(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const guestSms = SmsCopy.tripBeginningSoonGuest();
        const hostSms = SmsCopy.tripBeginningSoonHost();
        await this.notifyUser(ctx.guest, {
          sms: guestSms,
          email: {
            template: TemplateName.YourTripIsBeginningSoonGuest,
            vars: ctx.tripReminderGuestVars(),
          },
          push: { body: guestSms },
        });
        await this.notifyUser(ctx.host, {
          sms: hostSms,
          email: {
            template: TemplateName.TripBeginningSoonHost,
            vars: ctx.tripReminderHostVars(),
          },
          push: { body: hostSms },
        });
      })(),
    );
  }

  /** Guest + host: email+sms+push. */
  tripEndingSoon(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const guestSms = SmsCopy.tripEndingSoonGuest(ctx.host.firstName ?? 'Host');
        const hostSms = SmsCopy.tripEndingSoonHost(ctx.guest.firstName ?? 'Guest');
        await this.notifyUser(ctx.guest, {
          sms: guestSms,
          email: {
            template: TemplateName.YourTripIsEndingSoonGuest,
            vars: ctx.tripEndingGuestVars(),
          },
          push: {},
        });
        await this.notifyUser(ctx.host, {
          sms: hostSms,
          email: {
            template: TemplateName.YourTripIsEndingSoonHost,
            vars: ctx.tripEndingHostVars(),
          },
          push: {},
        });
      })(),
    );
  }

  /** Guest: email+sms+push. */
  newMessageFromHost(bookingId: string, message: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.guest, {
          sms: SmsCopy.newMessageFromHost(ctx.host.firstName ?? 'Host', message),
          email: {
            template: TemplateName.NewMessageFromHost,
            vars: ctx.newMessageGuestVars(message),
          },
          push: {},
        });
      })(),
    );
  }

  /** Host: email+sms+push. */
  newMessageFromGuest(bookingId: string, message: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.host, {
          sms: SmsCopy.newMessageFromGuest(ctx.guest.firstName ?? 'Guest', message),
          email: {
            template: TemplateName.NewMessageFromGuest,
            vars: ctx.newMessageHostVars(message),
          },
          push: {},
        });
      })(),
    );
  }

  /** License outcome — always email/SMS/push (legacy auth notifications ignored prefs). */
  licenseApproved(userId: string): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('User.FirstName', user.firstName ?? '')
          .setVariable('Url.BookARide', `${this.webOrigin()}/`)
          .setVariable('Url.ListARide', `${this.webOrigin()}/list-your-ride`)
          .build();
        await this.notifyUser(user, {
          sms: SmsCopy.licenseApproved(),
          email: { template: TemplateName.LicenseApproved, vars },
          push: {},
          transactional: true,
        });
      })(),
    );
  }

  /** License outcome — always email/SMS/push (legacy auth notifications ignored prefs). */
  licenseDenied(userId: string): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('User.FirstName', user.firstName ?? '')
          .build();
        await this.notifyUser(user, {
          sms: SmsCopy.licenseDenied(),
          email: { template: TemplateName.LicenseDenied, vars },
          push: {},
          transactional: true,
        });
      })(),
    );
  }

  listingApproved(hostUserId: string): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: hostUserId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Host.FirstName', user.firstName ?? '')
          .build();
        await this.notifyUser(user, {
          sms: SmsCopy.listingApproved(),
          email: { template: TemplateName.ListingApproved, vars },
          push: {},
        });
      })(),
    );
  }

  listingDenied(hostUserId: string): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: hostUserId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Host.FirstName', user.firstName ?? '')
          .build();
        await this.notifyUser(user, {
          sms: SmsCopy.listingDenied(),
          email: { template: TemplateName.ListingDenied, vars },
          push: {},
        });
      })(),
    );
  }

  newListingCreated(listingId: string): void {
    this.run(
      (async () => {
        const listing = await this.listings.findOne({
          where: { id: listingId },
          relations: ['host'],
        });
        if (!listing?.host) return;
        const host = listing.host;
        const adminBase = adminBaseUrl(this.config);
        const vd = (listing.vehicleData ?? {}) as Record<string, unknown>;
        const vehicle = vehicleLabel(vd, listing.title);
        const photoCount = Array.isArray(listing.photos) ? listing.photos.length : 0;
        const features = Array.isArray(listing.carFeatures)
          ? listing.carFeatures.join(', ')
          : '';
        const body = [
          `${host.firstName} wants to list a vehicle`,
          '',
          'Host',
          lines([
            ['first name', host.firstName],
            ['last name', host.lastName],
            ['email', host.email],
            ['phone', host.phone],
            [
              'address',
              [
                host.addressLine,
                host.addressCity,
                host.addressProvince,
                host.addressCountry,
              ]
                .filter(Boolean)
                .join(', '),
            ],
            ['profile link', `${adminBase}/members/profile/info/${host.id}`],
          ]),
          '',
          'Listing',
          lines([
            ['listing id', listing.id],
            ['title', listing.title],
            ['vehicle', vehicle],
            ['year', vd.year as string | undefined],
            ['make', vd.make as string | undefined],
            ['model', vd.model as string | undefined],
            ['trim', vd.trim as string | undefined],
            ['vehicle type', listing.vehicleType],
            ['VIN', listing.vin],
            ['license plate', listing.licensePlate],
            ['license province', listing.licenseProvince],
            ['city', listing.city],
            ['pickup address', listing.pickupAddress],
            ['price per day', `$${listing.pricePerDay}`],
            ['weekly discount', listing.weeklyDiscount],
            ['monthly discount', listing.monthlyDiscount],
            ['delivery price', listing.deliveryPrice != null ? `$${listing.deliveryPrice}` : null],
            ['daily km', listing.dailyKm],
            ['instant booking', listing.instantBooking],
            ['published', listing.published],
            ['active', listing.active],
            ['photos', photoCount],
            ['features', features],
            ['listing link', `${adminBase}/members/profile/car/info/${listing.id}`],
            ['created at', listing.createdAt?.toISOString?.() ?? String(listing.createdAt)],
          ]),
        ].join('\n');
        await this.pinpoint.sendSimpleAdminEmail(
          `new listing — ${vehicle || listing.title}`,
          body.trim(),
        );
      })(),
    );
  }

  /**
   * Transactional — always email.
   * Link opens the website reset page (same pattern as verify-email). Branch
   * deep links are retired — they only showed the "Get the App" download screen.
   */
  passwordRecovery(user: Recipient, token: string): void {
    this.run(
      (async () => {
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('User.FirstName', user.firstName ?? '')
          .setVariable(
            'Auth.PasswordRecoveryLink',
            `${this.webOrigin()}/reset-password?token=${encodeURIComponent(token)}`,
          )
          .build();
        await this.notifyUser(user, {
          email: { template: TemplateName.PasswordRecovery, vars },
          transactional: true,
        });
      })(),
    );
  }

  newPaymentMethod(
    userId: string,
    card?: {
      brand?: string;
      createdAt?: string;
      creationLocation?: string;
      fromDevice?: string;
    },
  ): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('User.FirstName', user.firstName ?? '')
          .setVariable('Card.Brand', card?.brand ?? 'Card')
          .setVariable('Card.CreatedAt', card?.createdAt ?? new Date().toUTCString())
          .setVariable(
            'Card.CreationLocation',
            card?.creationLocation ?? 'Rent Your Ride',
          )
          .setVariable('Card.FromDevice', card?.fromDevice ?? 'Mobile App')
          .build();
        await this.notifyUser(user, {
          sms: SmsCopy.paymentMethodAdded(),
          email: { template: TemplateName.AccountActivityNewPaymentMethod, vars },
          push: {},
        });
      })(),
    );
  }

  /** Public marketing / customer website origin (no trailing slash). */
  private webOrigin(): string {
    const raw =
      this.config.get<string>('PUBLIC_WEB_ORIGIN')?.trim() ||
      this.config.get<string>('WEB_PUBLIC_ORIGIN')?.trim() ||
      '';
    if (raw) return raw.replace(/\/$/, '');
    // Customer SPA hosts (password reset / verify-email links).
    return 'https://app.rentyourride.ca';
  }

  /**
   * Transactional — always email. Auth awaits this result so registration no
   * longer loses delivery failures inside the generic background dispatcher.
   *
   * Link opens the website verify page (Airbnb/Turo-style one-click). Mobile
   * still benefits: verifying in the browser marks the account verified for the app too.
   */
  async verifyEmail(
    user: Recipient,
    token: string,
    code?: string,
  ): Promise<boolean> {
    const vars = new TemplateVariablesBuilder()
      .init()
      .setVariable('User.FirstName', user.firstName ?? '')
      .setVariable('User.Email', user.email)
      .setVariable(
        'Auth.EmailVerificationLink',
        `${this.webOrigin()}/verify-email?token=${encodeURIComponent(token)}`,
      )
      .setVariable('Auth.EmailVerificationCode', code ?? '')
      .build();
    return this.pinpoint.sendTemplateEmail(
      user.email,
      TemplateName.VerifyEmail,
      vars,
    );
  }

  /**
   * Transactional — confirm a pending email change.
   * Reuses VerifyEmail Pinpoint template; link opens the change-confirm page
   * (web + custom-scheme deep link into the app).
   */
  async confirmEmailChange(
    user: Recipient,
    newEmail: string,
    token: string,
  ): Promise<boolean> {
    const vars = new TemplateVariablesBuilder()
      .init()
      .setVariable('User.FirstName', user.firstName ?? '')
      .setVariable('User.Email', newEmail)
      .setVariable(
        'Auth.EmailVerificationLink',
        `${this.webOrigin()}/confirm-email-change?token=${encodeURIComponent(token)}`,
      )
      .setVariable('Auth.EmailVerificationCode', '')
      .build();
    return this.pinpoint.sendTemplateEmail(
      newEmail,
      TemplateName.VerifyEmail,
      vars,
    );
  }

  /**
   * Transactional — sent once, right after the user verifies their email.
   * Matches legacy timing: signup sends VerifyEmail, verification sends Welcome.
   */
  async emailVerifiedWelcome(user: Recipient): Promise<boolean> {
    const vars = new TemplateVariablesBuilder()
      .init()
      .setVariable('User.FirstName', user.firstName ?? '')
      .setVariable('Url.SearchYourCity', 'https://rentyourride.ca/find-your-car')
      .setVariable(
        'Url.ListYourRide',
        'https://rentyourride.ca/profile/list-your-ride',
      )
      .build();
    return this.pinpoint.sendTemplateEmail(
      user.email,
      TemplateName.Welcome,
      vars,
    );
  }

  /** Guest + host: email+sms+push. */
  extensionCreated(extensionId: string): void {
    this.run(
      (async () => {
        const ext = await this.loadExtension(extensionId);
        if (!ext) return;
        const ctx = BookingNotificationContext.fromEntity(ext.booking);
        if (!ctx) return;
        const startLabel = formatBookingEndDate(Number(ext.previousEndMs));
        const endLabel = formatBookingEndDate(Number(ext.newEndMs));
        const guestSms = SmsCopy.extensionCreatedGuest();
        const hostSms = SmsCopy.extensionCreatedHost(ctx.guest.firstName ?? 'Guest');
        const guestVars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Renter.FirstName', ctx.guest.firstName ?? '')
          .setVariable('Vehicle.Model', ctx.baseBookingVars()['Vehicle.Model']?.[0] ?? '')
          .setVariable('Vehicle.CoverImage', ctx.baseBookingVars()['Vehicle.CoverImage']?.[0] ?? '')
          .setVariable('Extension.StartDate', startLabel)
          .setVariable('Extension.EndDate', endLabel)
          .build();
        const hostVars = new TemplateVariablesBuilder()
          .init()
          .mergeWith(guestVars)
          .setVariable('Renter.Avatar', ctx.guest.avatarUrl ?? '')
          .setVariable('Renter.RequestMessage', ext.guestMessage ?? '')
          .setVariable('Extension.PaymentDetails', this.extensionPaymentDetails(ext))
          .build();
        await this.notifyUser(ctx.guest, {
          sms: guestSms,
          email: { template: TemplateName.YouRequestedATripExtension, vars: guestVars },
          push: { data: { type: 'extension', bookingId: ext.bookingId, extensionId } },
        });
        await this.notifyUser(ctx.host, {
          sms: hostSms,
          email: { template: TemplateName.TripExtensionRequestHost, vars: hostVars },
          push: { data: { type: 'extension', bookingId: ext.bookingId, extensionId } },
        });
      })(),
    );
  }

  /** Guest: email+sms. Host: email only. No push. */
  extensionApproved(extensionId: string): void {
    this.run(
      (async () => {
        const ext = await this.loadExtension(extensionId);
        if (!ext) return;
        const ctx = BookingNotificationContext.fromEntity(ext.booking);
        if (!ctx) return;
        const guestSms = SmsCopy.extensionApprovedGuest(
          formatBookingEndDate(Number(ext.newEndMs)),
        );
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Renter.FirstName', ctx.guest.firstName ?? '')
          .setVariable('Host.FirstName', ctx.host.firstName ?? '')
          .setVariable('Extension.EndDate', formatBookingEndDate(Number(ext.newEndMs)))
          .build();
        await this.notifyUser(ctx.guest, {
          sms: guestSms,
          email: { template: TemplateName.YourTripExtensionIsConfirmedGuest, vars },
        });
        await this.notifyUser(ctx.host, {
          email: { template: TemplateName.YouConfirmedATripExtension, vars },
        });
      })(),
    );
  }

  /** Guest: email+sms. Host: email+sms. */
  extensionDenied(extensionId: string): void {
    this.run(
      (async () => {
        const ext = await this.loadExtension(extensionId);
        if (!ext) return;
        const ctx = BookingNotificationContext.fromEntity(ext.booking);
        if (!ctx) return;
        const startLabel = formatBookingEndDate(Number(ext.previousEndMs));
        const endLabel = formatBookingEndDate(Number(ext.newEndMs));
        const guestVars = new TemplateVariablesBuilder()
          .init()
          .mergeWith(ctx.baseBookingVars())
          .setVariable('Extension.StartDate', startLabel)
          .setVariable('Extension.EndDate', endLabel)
          .build();
        const hostVars = new TemplateVariablesBuilder()
          .init()
          .mergeWith(ctx.createRequestHostVars())
          .setVariable('Extension.StartDate', startLabel)
          .setVariable('Extension.EndDate', endLabel)
          .build();
        await this.notifyUser(ctx.guest, {
          sms: SmsCopy.extensionDeniedGuest(ctx.host.firstName ?? 'Host'),
          email: {
            template: TemplateName.YourTripExtensionRequestWasDenied,
            vars: guestVars,
          },
        });
        await this.notifyUser(ctx.host, {
          sms: SmsCopy.extensionDeniedHost(ctx.guest.firstName ?? 'Guest'),
          email: { template: TemplateName.YouHaveDeniedATripExtenison, vars: hostVars },
        });
      })(),
    );
  }

  private async loadExtension(extensionId: string): Promise<BookingExtensionEntity | null> {
    return this.extensions.findOne({
      where: { id: extensionId },
      relations: ['booking', 'booking.guest', 'booking.host', 'booking.listing'],
    });
  }

  private extensionPaymentDetails(ext: BookingExtensionEntity): string {
    const p = ext.pricing as Record<string, unknown>;
    const tripDays = Number(p.tripDays ?? 0);
    const hostTotal = Number(p.hostReceiveTotal ?? p.subtotal ?? 0);
    const tripFee = Number(p.tripFee ?? 0);
    return `Trip days: ${tripDays}\nYour earnings: $${hostTotal}\nService Fee: $${tripFee}`;
  }

  async markTripReminderSent(
    bookingId: string,
    field: 'beginningSoonNotifiedAt' | 'endingSoonNotifiedAt',
  ): Promise<void> {
    const booking = await this.bookings.findOne({ where: { id: bookingId } });
    if (!booking) return;
    booking.lifecycle = { ...(booking.lifecycle ?? {}), [field]: Date.now() };
    await this.bookings.save(booking);
  }
}
