import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingNotificationContext, formatBookingEndDate } from './booking-context';
import { PinpointService } from './pinpoint.service';
import { TemplateName } from './template-names';
import { TemplateVariablesBuilder } from './template-variables.builder';
import { ExpoPushService } from './expo-push.service';
import { PushTokenService } from './push-token.service';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import { InAppNotificationEntity } from '../entities/in-app-notification.entity';
import { NotificationDispatchClaimEntity } from '../entities/notification-dispatch-claim.entity';
import { NotificationDispatchLogEntity } from '../entities/notification-dispatch-log.entity';
import { SmsOutboxEntity } from '../entities/sms-outbox.entity';
import {
  HOST_CANCEL_CHANNELS,
  HOST_CANCEL_EMAIL_IS_TRANSACTIONAL,
  HOST_CANCEL_NOTIFY_EVENT,
  HostCancelChannel,
  buildHostCancelCopy,
  dispatchIndependentChannels,
  inAppDedupeKey,
  isConfirmedTripStatus,
  nextSmsRetryDelayMs,
  planHostCancelNotify,
  resolveHostCancelAttempt,
  smsFailureShouldQueue,
  smsOutboxDedupeKey,
} from './host-cancel-notify';

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
    @InjectRepository(InAppNotificationEntity)
    private readonly inApp: Repository<InAppNotificationEntity>,
    @InjectRepository(NotificationDispatchLogEntity)
    private readonly dispatchLogs: Repository<NotificationDispatchLogEntity>,
    @InjectRepository(NotificationDispatchClaimEntity)
    private readonly dispatchClaims: Repository<NotificationDispatchClaimEntity>,
    @InjectRepository(SmsOutboxEntity)
    private readonly smsOutbox: Repository<SmsOutboxEntity>,
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
    await Promise.all(jobs);
  }

  private async loadBooking(bookingId: string): Promise<BookingNotificationContext | null> {
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: ['guest', 'host', 'listing'],
    });
    if (!booking) return null;
    return BookingNotificationContext.fromEntity(booking);
  }

  /** Guest: email+push. Host: email+push+sms. */
  bookingCreated(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const renterSms =
          "You sent a reservation request. This is not a confirmed booking yet. You'll get a response within 24 hours";
        const hostSms = `${ctx.guest.firstName} would like to book your ride. Let them know if it works for you.`;
        await this.notifyUser(ctx.guest, {
          email: {
            template: TemplateName.YouSentAReservationRequest,
            vars: ctx.createRequestGuestVars(),
          },
          push: { body: renterSms },
        });
        await this.notifyUser(ctx.host, {
          sms: hostSms,
          email: {
            template: TemplateName.BookingRequest,
            vars: ctx.createRequestHostVars(),
          },
          push: {},
        });
      })(),
    );
  }

  /** Guest + host: email+sms+push. */
  bookingApproved(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const renterSms =
          `You have successfully confirmed a booking with ${ctx.host.firstName} booking request for ${ctx.startLabel()} - ${ctx.endLabel()}. Get ready to experience Rent Your Ride!`;
        const hostSms =
          `You have successfully confirmed ${ctx.guest.firstName} booking request for ${ctx.startLabel()} - ${ctx.endLabel()}`;
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

  /** Guest: email+sms+push. Host: email only. */
  bookingDenied(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.guest, {
          sms: `Your booking request doesn't work for the host`,
          email: {
            template: TemplateName.YourBookingRequestWasDenied,
            vars: ctx.baseBookingVars(),
          },
          push: {},
        });
        await this.notifyUser(ctx.host, {
          email: {
            template: TemplateName.YouDeniedABookingRequest,
            vars: ctx.baseBookingVars(),
          },
        });
      })(),
    );
  }

  /** Guest: email only. Host: email+sms+push. */
  bookingCheckedIn(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.guest, {
          email: {
            template: TemplateName.YoureCheckedInGuest,
            vars: ctx.checkInGuestVars(),
          },
        });
        await this.notifyUser(ctx.host, {
          sms: `${ctx.guest.firstName} has successfully checked in for their trip with your ride`,
          email: {
            template: TemplateName.GuestHasCheckedInUsingYourRide,
            vars: ctx.checkInHostVars(),
          },
          push: {},
        });
      })(),
    );
  }

  /** Guest: email only. Host: email+sms+push. */
  bookingCheckedOut(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        await this.notifyUser(ctx.guest, {
          email: {
            template: TemplateName.YoureCheckedOutGuest,
            vars: ctx.baseBookingVars(),
          },
        });
        await this.notifyUser(ctx.host, {
          sms: `${ctx.guest.firstName} has successfully checked out and has ended their trip using your vehicle`,
          email: {
            template: TemplateName.GuestCheckedOutOfYourRide,
            vars: ctx.baseBookingVars(),
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

  /** Guest + host: email+push (no SMS). */
  tripBeginningSoon(bookingId: string): void {
    this.run(
      (async () => {
        const ctx = await this.loadBooking(bookingId);
        if (!ctx) return;
        const guestSms =
          `Your trip is beginning soon. Don't forget to confirm any trip details with your host!`;
        const hostSms =
          `Your trip is beginning soon. Don't forget to confirm any trip details with your guest!`;
        await this.notifyUser(ctx.guest, {
          email: {
            template: TemplateName.YourTripIsBeginningSoonGuest,
            vars: ctx.tripReminderGuestVars(),
          },
          push: { body: guestSms },
        });
        await this.notifyUser(ctx.host, {
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
        const guestSms = `Your trip is ending soon. Don't forget to coordinate the drop off location and time with ${ctx.host.firstName}.`;
        const hostSms = `Your trip is ending soon. Don't forget to coordinate the drop off location and time with ${ctx.guest.firstName}.`;
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
          sms: message,
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
          sms: message,
          email: {
            template: TemplateName.NewMessageFromGuest,
            vars: ctx.newMessageHostVars(message),
          },
          push: {},
        });
      })(),
    );
  }

  licenseApproved(userId: string): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('User.FirstName', user.firstName ?? '')
          .build();
        await this.notifyUser(user, {
          sms: 'We approved your license and ID. You can book or list a ride.',
          email: { template: TemplateName.LicenseApproved, vars },
          push: {},
        });
      })(),
    );
  }

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
          sms: 'We have declined your license and ID. Please make sure your license is valid and the image is clear before you upload it.',
          email: { template: TemplateName.LicenseDenied, vars },
          push: {},
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
          sms: 'We approved your listing. You can now start earning extra cash from your ride.',
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
          sms: 'We have declined your listing. Please make sure your vehicle fits within our guidelines.',
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
        const adminBase =
          this.config.get<string>('ADMIN_BASE_URL')?.replace(/\/$/, '') ??
          'https://admindev.rentyourride.ca';
        const body = `
${host.firstName} want to lease his vehicle
      info:
  first name: ${host.firstName},
  last name: ${host.lastName},
  address: ${host.addressCountry ?? ''} ${host.addressCity ?? ''} ${host.addressLine ?? ''},
  email: ${host.email},
  phone number: ${host.phone ?? ''},
  profile link: ${adminBase}/members/profile/info/${host.id},
`;
        await this.pinpoint.sendSimpleAdminEmail('new listing', body.trim());
      })(),
    );
  }

  /** Transactional — always email. */
  passwordRecovery(user: Recipient, token: string): void {
    this.run(
      (async () => {
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('User.FirstName', user.firstName ?? '')
          .setVariable(
            'Auth.PasswordRecoveryLink',
            `https://rentyourride.app.link?passwordRecoveryVerificationToken=${token}`,
          )
          .build();
        await this.notifyUser(user, {
          email: { template: TemplateName.PasswordRecovery, vars },
          transactional: true,
        });
      })(),
    );
  }

  newPaymentMethod(userId: string): void {
    this.run(
      (async () => {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Renter.FirstName', user.firstName ?? '')
          .build();
        await this.notifyUser(user, {
          sms: 'We noticed a new payment method was added to your account.',
          email: { template: TemplateName.AccountActivityNewPaymentMethod, vars },
          push: {},
        });
      })(),
    );
  }

  /**
   * Transactional — always email. Auth awaits this result so registration no
   * longer loses delivery failures inside the generic background dispatcher.
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
        `https://rentyourride.app.link?emailVerificationToken=${token}`,
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
        const guestSms =
          "You sent a trip extension request. This is not a confirmed booking yet. You'll get a response within 24 hours";
        const hostSms = `${ctx.guest.firstName} likes your ride and would like to extend their booking with you. Let them know if it works for you`;
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
        const guestSms = `Your trip extension is confirmed through ${formatBookingEndDate(Number(ext.newEndMs))}`;
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

  /** Host: email only. */
  extensionDenied(extensionId: string): void {
    this.run(
      (async () => {
        const ext = await this.loadExtension(extensionId);
        if (!ext) return;
        const ctx = BookingNotificationContext.fromEntity(ext.booking);
        if (!ctx) return;
        const vars = new TemplateVariablesBuilder()
          .init()
          .setVariable('Renter.FirstName', ctx.guest.firstName ?? '')
          .setVariable('Host.FirstName', ctx.host.firstName ?? '')
          .build();
        await this.notifyUser(ctx.host, {
          email: { template: TemplateName.YouHaveDeniedATripExtenison, vars },
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

  /**
   * Host notify after a confirmed trip is cancelled (guest, host, or any other actor).
   * Channels run independently. Safe to call twice.
   */
  async notifyHostConfirmedTripCancelled(
    bookingId: string,
    meta: {
      previousStatus: string;
      cancelledBy: string;
      stripeRefundId?: string | null;
    },
  ): Promise<void> {
    if (!isConfirmedTripStatus(meta.previousStatus)) return;
    const ctx = await this.loadBooking(bookingId);
    if (!ctx) {
      this.log.warn(`Host cancel notify skipped; booking missing ${bookingId}`);
      return;
    }
    const copy = buildHostCancelCopy({
      hostFirstName: ctx.host.firstName ?? '',
      guestFirstName: ctx.guest.firstName ?? '',
      vehicle: ctx.vehicleLabel(),
      startLabel: ctx.startLabel(),
      endLabel: ctx.endLabel(),
      listingId: ctx.booking.listingId,
      cancelledBy: meta.cancelledBy,
      stripeRefundId: meta.stripeRefundId,
    });
    const auditBase = {
      bookingId,
      listingId: ctx.booking.listingId,
      hostMemberId: ctx.host.id,
      guestMemberId: ctx.guest.id,
      stripeRefundId: meta.stripeRefundId ?? null,
      detail: {
        cancelledBy: meta.cancelledBy,
        previousStatus: meta.previousStatus,
        stripePaymentIntentId: ctx.booking.stripePaymentIntentId,
        vehicle: ctx.vehicleLabel(),
        tripStart: ctx.startLabel(),
        tripEnd: ctx.endLabel(),
        emailTransactional: HOST_CANCEL_EMAIL_IS_TRANSACTIONAL,
      },
    };

    await dispatchIndependentChannels(HOST_CANCEL_CHANNELS, async (channel) => {
      const gate = await this.acquireHostCancelClaim(bookingId, channel);
      if (gate.action === 'skip') {
        await this.appendDispatchLog({
          ...auditBase,
          channel,
          status: 'skipped',
          reason: gate.reason ?? 'skipped',
        });
        return;
      }
      try {
        const outcome = await this.sendHostCancelChannel(channel, ctx, copy, auditBase);
        await this.finishHostCancelClaim(bookingId, channel, outcome.status, outcome.reason ?? null);
        await this.appendDispatchLog({
          ...auditBase,
          channel,
          status: outcome.status,
          reason: outcome.reason ?? null,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'channel_error';
        this.log.error(`Host cancel notify ${channel} threw for ${bookingId}`, reason);
        await this.finishHostCancelClaim(bookingId, channel, 'failed', reason);
        await this.appendDispatchLog({
          ...auditBase,
          channel,
          status: 'failed',
          reason,
        });
      }
    });
  }

  async listInAppForUser(userId: string) {
    const rows = await this.inApp.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      bookingId: row.bookingId,
      listingId: row.listingId,
      readAt: row.readAt ? row.readAt.getTime() : null,
      createdAt: row.createdAt.getTime(),
    }));
  }

  async listDispatchLogForBooking(bookingId: string) {
    const rows = await this.dispatchLogs.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      event: row.event,
      channel: row.channel,
      status: row.status,
      reason: row.reason,
      listingId: row.listingId,
      hostMemberId: row.hostMemberId,
      guestMemberId: row.guestMemberId,
      bookingId: row.bookingId,
      stripeRefundId: row.stripeRefundId,
      detail: row.detail,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryQueuedSms(): Promise<void> {
    let due: SmsOutboxEntity[] = [];
    try {
      due = await this.smsOutbox.find({
        where: { status: 'queued', nextRetryAt: LessThanOrEqual(new Date()) },
        take: 25,
        order: { nextRetryAt: 'ASC' },
      });
    } catch (err) {
      this.log.warn('SMS outbox poll failed', err instanceof Error ? err.message : err);
      return;
    }
    for (const row of due) {
      try {
        await this.retryOneSms(row);
      } catch (err) {
        this.log.error(
          `SMS retry failed for booking ${row.bookingId}`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  private async sendHostCancelChannel(
    channel: HostCancelChannel,
    ctx: BookingNotificationContext,
    copy: ReturnType<typeof buildHostCancelCopy>,
    auditBase: {
      bookingId: string;
      listingId: string;
      hostMemberId: string;
      guestMemberId: string;
      stripeRefundId: string | null;
    },
  ): Promise<{ status: 'sent' | 'failed' | 'skipped'; reason?: string }> {
    const tokens = channel === 'push' ? await this.pushTokens.tokensForUser(ctx.host.id) : [];
    const plan = planHostCancelNotify({
      hasEmail: !!ctx.host.email?.trim(),
      hasPhone: !!ctx.host.phone?.trim(),
      pushTokenCount: tokens.length,
    }).find((row) => row.channel === channel);
    if (plan?.action === 'skip') {
      return { status: 'skipped', reason: plan.reason };
    }

    if (channel === 'in_app') {
      await this.insertInApp(ctx, copy);
      return { status: 'sent' };
    }

    if (channel === 'push') {
      const push = await this.expoPush.send(
        tokens.map((to) => ({
          to,
          title: copy.pushTitle,
          body: copy.pushBody,
          data: {
            type: 'trip_cancelled',
            bookingId: ctx.booking.id,
            listingId: ctx.booking.listingId,
          },
        })),
      );
      return push.sent
        ? { status: 'sent' }
        : { status: 'failed', reason: push.reason ?? 'push_provider_error' };
    }

    if (channel === 'email') {
      // Transactional: HOST_CANCEL_EMAIL_IS_TRANSACTIONAL. Do not consult emailNotif.
      const ok = await this.pinpoint.sendSimpleEmail(
        ctx.host.email,
        copy.emailSubject,
        copy.emailBody,
      );
      return ok
        ? { status: 'sent' }
        : { status: 'failed', reason: 'email_provider_error' };
    }

    const sms = await this.pinpoint.sendSms(ctx.host.phone ?? '', copy.sms);
    if (sms.sent) return { status: 'sent' };
    const failure = sms.failure ?? 'provider_error';
    const errorMessage = sms.errorMessage ?? failure;
    if (smsFailureShouldQueue(failure, errorMessage)) {
      await this.enqueueHostCancelSms(ctx, copy.sms, failure, errorMessage, auditBase);
    }
    this.log.error(
      `Host cancel SMS ${failure} booking=${ctx.booking.id} listingId=${ctx.booking.listingId} hostMemberId=${ctx.host.id} guestMemberId=${ctx.guest.id} stripeRefundId=${auditBase.stripeRefundId ?? ''} ${errorMessage}`,
    );
    return { status: 'failed', reason: failure };
  }

  private async insertInApp(
    ctx: BookingNotificationContext,
    copy: ReturnType<typeof buildHostCancelCopy>,
  ): Promise<void> {
    try {
      await this.inApp.insert({
        userId: ctx.host.id,
        type: HOST_CANCEL_NOTIFY_EVENT,
        title: copy.inAppTitle,
        body: copy.inAppBody,
        bookingId: ctx.booking.id,
        listingId: ctx.booking.listingId,
        dedupeKey: inAppDedupeKey(ctx.booking.id, ctx.host.id),
        readAt: null,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  private async enqueueHostCancelSms(
    ctx: BookingNotificationContext,
    body: string,
    failureKind: string,
    errorMessage: string,
    auditBase: { stripeRefundId: string | null },
  ): Promise<void> {
    const delay = nextSmsRetryDelayMs(1);
    const nextRetryAt = new Date(Date.now() + (delay ?? 15 * 60 * 1000));
    const dedupeKey = smsOutboxDedupeKey(ctx.booking.id);
    const existing = await this.smsOutbox.findOne({ where: { dedupeKey } });
    if (existing) {
      if (existing.status === 'sent') return;
      return;
    }
    try {
      await this.smsOutbox.insert({
        dedupeKey,
        phone: ctx.host.phone ?? '',
        body,
        bookingId: ctx.booking.id,
        event: HOST_CANCEL_NOTIFY_EVENT,
        failureKind,
        status: 'queued',
        attempts: 1,
        lastError: errorMessage,
        nextRetryAt,
        listingId: ctx.booking.listingId,
        hostMemberId: ctx.host.id,
        guestMemberId: ctx.guest.id,
        stripeRefundId: auditBase.stripeRefundId,
        adminAlertedAt: null,
        exhaustedAlertedAt: null,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      return;
    }
    await this.alertSmsFailure(ctx, failureKind, errorMessage, auditBase.stripeRefundId, false);
    await this.smsOutbox.update({ dedupeKey }, { adminAlertedAt: new Date() });
  }

  private async alertSmsFailure(
    ctx: BookingNotificationContext,
    failureKind: string,
    errorMessage: string,
    stripeRefundId: string | null,
    exhausted: boolean,
  ): Promise<void> {
    const subject = exhausted
      ? 'SMS retries exhausted: host trip-cancel notify'
      : `SMS failed: host trip-cancel notify (${failureKind})`;
    const body = [
      exhausted
        ? 'Queued SMS retries for a confirmed-trip cancellation are exhausted.'
        : 'SMS for a confirmed-trip cancellation failed and was queued for retry.',
      'The SMS spend cap was not changed (RYRA-408).',
      `bookingId: ${ctx.booking.id}`,
      `listingId: ${ctx.booking.listingId}`,
      `hostMemberId: ${ctx.host.id}`,
      `guestMemberId: ${ctx.guest.id}`,
      `stripeRefundId: ${stripeRefundId ?? ''}`,
      `failure: ${failureKind}`,
      `error: ${errorMessage}`,
    ].join('\n');
    try {
      await this.pinpoint.sendSimpleAdminEmail(subject, body);
    } catch (err) {
      this.log.error('Admin SMS-failure email threw', err instanceof Error ? err.message : err);
    }
  }

  private async retryOneSms(row: SmsOutboxEntity): Promise<void> {
    const result = await this.pinpoint.sendSms(row.phone, row.body);
    if (result.sent) {
      row.status = 'sent';
      row.lastError = null;
      await this.smsOutbox.save(row);
      await this.finishHostCancelClaim(row.bookingId, 'sms', 'sent', null);
      await this.appendDispatchLog({
        bookingId: row.bookingId,
        listingId: row.listingId,
        hostMemberId: row.hostMemberId,
        guestMemberId: row.guestMemberId,
        stripeRefundId: row.stripeRefundId,
        channel: 'sms',
        status: 'sent',
        reason: 'retry',
        detail: { outboxId: row.id, attempts: row.attempts },
      });
      this.log.log(
        `Host cancel SMS retry sent booking=${row.bookingId} listingId=${row.listingId ?? ''} hostMemberId=${row.hostMemberId ?? ''}`,
      );
      return;
    }
    const errorMessage = result.errorMessage ?? result.failure ?? 'provider_error';
    row.attempts += 1;
    row.lastError = errorMessage;
    const delay = nextSmsRetryDelayMs(row.attempts);
    if (delay == null) {
      row.status = 'failed';
      await this.smsOutbox.save(row);
      await this.finishHostCancelClaim(row.bookingId, 'sms', 'failed', 'retries_exhausted');
      await this.appendDispatchLog({
        bookingId: row.bookingId,
        listingId: row.listingId,
        hostMemberId: row.hostMemberId,
        guestMemberId: row.guestMemberId,
        stripeRefundId: row.stripeRefundId,
        channel: 'sms',
        status: 'failed',
        reason: 'retries_exhausted',
        detail: { outboxId: row.id, attempts: row.attempts, error: errorMessage },
      });
      if (!row.exhaustedAlertedAt) {
        const booking = await this.loadBooking(row.bookingId);
        if (booking) {
          await this.alertSmsFailure(
            booking,
            row.failureKind,
            errorMessage,
            row.stripeRefundId,
            true,
          );
        }
        row.exhaustedAlertedAt = new Date();
        await this.smsOutbox.save(row);
      }
      this.log.error(
        `Host cancel SMS retries exhausted booking=${row.bookingId} listingId=${row.listingId ?? ''} hostMemberId=${row.hostMemberId ?? ''} guestMemberId=${row.guestMemberId ?? ''} stripeRefundId=${row.stripeRefundId ?? ''} ${errorMessage}`,
      );
      return;
    }
    row.nextRetryAt = new Date(Date.now() + delay);
    await this.smsOutbox.save(row);
    await this.appendDispatchLog({
      bookingId: row.bookingId,
      listingId: row.listingId,
      hostMemberId: row.hostMemberId,
      guestMemberId: row.guestMemberId,
      stripeRefundId: row.stripeRefundId,
      channel: 'sms',
      status: 'failed',
      reason: result.failure ?? 'provider_error',
      detail: { outboxId: row.id, attempts: row.attempts, queued: true, error: errorMessage },
    });
    this.log.error(
      `Host cancel SMS retry failed booking=${row.bookingId} attempts=${row.attempts} ${errorMessage}`,
    );
  }

  private async acquireHostCancelClaim(
    bookingId: string,
    channel: HostCancelChannel,
  ): Promise<{ action: 'send' | 'skip'; reason?: string }> {
    const existing = await this.dispatchClaims.findOne({
      where: { bookingId, event: HOST_CANCEL_NOTIFY_EVENT, channel },
    });
    const smsQueued =
      channel === 'sms' ? await this.isHostCancelSmsQueued(bookingId) : false;
    const decision = resolveHostCancelAttempt({
      channel,
      prior: existing
        ? {
            status: existing.status as 'sending' | 'sent' | 'failed' | 'skipped',
            reason: existing.reason,
            updatedAtMs: existing.updatedAt?.getTime?.() ?? 0,
          }
        : null,
      smsQueued,
      nowMs: Date.now(),
    });
    if (decision.action === 'skip') return decision;
    if (!existing) {
      try {
        await this.dispatchClaims.insert({
          bookingId,
          event: HOST_CANCEL_NOTIFY_EVENT,
          channel,
          status: 'sending',
          reason: null,
        });
        return { action: 'send' };
      } catch (err) {
        if (isUniqueViolation(err)) return { action: 'skip', reason: 'in_progress' };
        throw err;
      }
    }
    const updated = await this.dispatchClaims.update(
      { id: existing.id, status: existing.status },
      { status: 'sending', reason: null },
    );
    if (!updated.affected) return { action: 'skip', reason: 'in_progress' };
    return { action: 'send' };
  }

  private async finishHostCancelClaim(
    bookingId: string,
    channel: HostCancelChannel,
    status: 'sent' | 'failed' | 'skipped',
    reason: string | null,
  ): Promise<void> {
    await this.dispatchClaims.update(
      { bookingId, event: HOST_CANCEL_NOTIFY_EVENT, channel },
      { status, reason },
    );
  }

  private async isHostCancelSmsQueued(bookingId: string): Promise<boolean> {
    const row = await this.smsOutbox.findOne({
      where: { dedupeKey: smsOutboxDedupeKey(bookingId) },
    });
    return row?.status === 'queued';
  }

  private async appendDispatchLog(input: {
    bookingId: string;
    listingId: string | null;
    hostMemberId: string | null;
    guestMemberId: string | null;
    stripeRefundId: string | null;
    channel: string;
    status: string;
    reason?: string | null;
    detail?: Record<string, unknown> | null;
  }): Promise<void> {
    const row = this.dispatchLogs.create({
      bookingId: input.bookingId,
      event: HOST_CANCEL_NOTIFY_EVENT,
      channel: input.channel,
      status: input.status,
      reason: input.reason ?? null,
      listingId: input.listingId,
      hostMemberId: input.hostMemberId,
      guestMemberId: input.guestMemberId,
      stripeRefundId: input.stripeRefundId,
      detail: input.detail ?? null,
    });
    await this.dispatchLogs.save(row);
    this.log.log(
      `notify attempt event=${HOST_CANCEL_NOTIFY_EVENT} channel=${input.channel} status=${input.status} reason=${input.reason ?? ''} bookingId=${input.bookingId} listingId=${input.listingId ?? ''} hostMemberId=${input.hostMemberId ?? ''} guestMemberId=${input.guestMemberId ?? ''} stripeRefundId=${input.stripeRefundId ?? ''}`,
    );
  }
}

function isUniqueViolation(err: unknown): boolean {
  const row = err as { code?: string; driverError?: { code?: string } };
  return row?.code === '23505' || row?.driverError?.code === '23505';
}
