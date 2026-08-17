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
import { BookingExtensionEntity } from '../entities/booking-extension.entity';

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
}
