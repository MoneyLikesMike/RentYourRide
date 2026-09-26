import { BookingEntity } from '../entities/booking.entity';
import { UserEntity } from '../entities/user.entity';
import { getTripBillingDays } from '../bookings/trip-billing-days';
import { TemplateVariablesBuilder, PinpointSubstitutions } from './template-variables.builder';

const DEFAULT_TZ = 'America/Winnipeg';

type BookingDatesShape = {
  start?: number;
  end?: number;
  startTime?: string;
  endTime?: string;
};

function bookingDatesOf(booking: BookingEntity): BookingDatesShape {
  return (booking.bookingDates ?? {}) as BookingDatesShape;
}

function formatDatePart(ms: number, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ms));
}

function formatTimePart(ms: number, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms));
}

/** Prefer calendar startTime/endTime strings (mobile stores clock there; start/end are often midnight). */
function resolveTimeLabel(ms: number, timeOverride?: string | null, tz = DEFAULT_TZ): string {
  const booked = typeof timeOverride === 'string' ? timeOverride.trim() : '';
  return booked || formatTimePart(ms, tz);
}

function formatStartDate(ms: number, timeOverride?: string | null, tz = DEFAULT_TZ): string {
  return `${formatDatePart(ms, tz)}. Start Time ${resolveTimeLabel(ms, timeOverride, tz)}`;
}

function formatEndDate(ms: number, timeOverride?: string | null, tz = DEFAULT_TZ): string {
  return `${formatDatePart(ms, tz)}. End Time ${resolveTimeLabel(ms, timeOverride, tz)}`;
}

export function formatBookingStartDate(
  ms: number,
  tz = DEFAULT_TZ,
  timeOverride?: string | null,
): string {
  return formatStartDate(ms, timeOverride, tz);
}

export function formatBookingEndDate(
  ms: number,
  tz = DEFAULT_TZ,
  timeOverride?: string | null,
): string {
  return formatEndDate(ms, timeOverride, tz);
}

function snap(booking: BookingEntity): Record<string, unknown> {
  return (booking.listingSnapshot ?? {}) as Record<string, unknown>;
}

function pricing(booking: BookingEntity): Record<string, unknown> {
  return (booking.pricing ?? {}) as Record<string, unknown>;
}

function vehicleModel(booking: BookingEntity): string {
  const s = snap(booking);
  const vd = (s.vehicleData ?? {}) as Record<string, unknown>;
  const make = String(vd.make ?? '').trim();
  const model = String(vd.model ?? '').trim();
  if (make || model) return `${model} ${make}`.trim();
  return String(s.title ?? 'Vehicle').trim();
}

function coverImage(booking: BookingEntity): string {
  const s = snap(booking);
  if (typeof s.coverImageUri === 'string' && s.coverImageUri.trim()) {
    return s.coverImageUri.trim();
  }
  const photos = s.photos as Array<{ uri?: string; imageUrl?: string }> | undefined;
  const first = photos?.[0];
  const raw = (first?.uri ?? first?.imageUrl ?? '').trim();
  return raw;
}

function avatar(user?: UserEntity | null): string {
  return user?.avatarUrl ?? '';
}

function extraVariables(booking: BookingEntity): PinpointSubstitutions {
  const vars: PinpointSubstitutions = {
    'Booking.UnlimitedKms': ['$0'],
    'Booking.PrePaidFuel': ['$0'],
    'Booking.PrePaidClean': ['$0'],
  };
  const selected = pricing(booking).selectedExtras as
    | Array<{ key?: string; amount?: number }>
    | undefined;
  for (const e of selected ?? []) {
    const amt = Number(e.amount ?? 0);
    const money = `$${(Number.isFinite(amt) ? amt : 0).toFixed(2)}`;
    if (e.key === 'kms') vars['Booking.UnlimitedKms'] = [money];
    if (e.key === 'fuel') vars['Booking.PrePaidFuel'] = [money];
    if (e.key === 'clean') vars['Booking.PrePaidClean'] = [money];
  }
  return vars;
}

function tripDays(booking: BookingEntity): number {
  const dates = bookingDatesOf(booking);
  if (dates.start == null || dates.end == null) return 1;
  return getTripBillingDays(dates.start, dates.end);
}

function startMs(booking: BookingEntity): number {
  return Number(bookingDatesOf(booking).start ?? Date.now());
}

function endMs(booking: BookingEntity): number {
  return Number(bookingDatesOf(booking).end ?? Date.now());
}

function purePrice(booking: BookingEntity): number {
  const p = pricing(booking);
  return Number(p.discountedTripSubtotal ?? p.subtotal ?? 0);
}

function tripFee(booking: BookingEntity): number {
  return Number(pricing(booking).tripFee ?? 0);
}

function guestPayTotal(booking: BookingEntity): number {
  return Number(pricing(booking).grandTotal ?? 0);
}

function deliveryPrice(booking: BookingEntity): number {
  const s = snap(booking);
  return Number(s.deliveryPrice ?? pricing(booking).selectedDeliveryFee ?? 0);
}

function hostReceiveTotal(booking: BookingEntity): number {
  const p = pricing(booking);
  return Number(p.subtotal ?? p.discountedTripSubtotal ?? 0);
}

export class BookingNotificationContext {
  constructor(
    readonly booking: BookingEntity,
    readonly guest: UserEntity,
    readonly host: UserEntity,
    readonly tz = DEFAULT_TZ,
  ) {}

  static fromEntity(booking: BookingEntity): BookingNotificationContext | null {
    if (!booking.guest || !booking.host) return null;
    return new BookingNotificationContext(booking, booking.guest, booking.host);
  }

  startLabel(): string {
    const dates = bookingDatesOf(this.booking);
    return formatStartDate(startMs(this.booking), dates.startTime, this.tz);
  }

  vehicleLabel(): string {
    return vehicleModel(this.booking);
  }

  endLabel(): string {
    const dates = bookingDatesOf(this.booking);
    return formatEndDate(endMs(this.booking), dates.endTime, this.tz);
  }

  baseBookingVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.StartDate', this.startLabel())
      .setVariable('Booking.EndDate', this.endLabel())
      .build();
  }

  createRequestGuestVars(): PinpointSubstitutions {
    return this.baseBookingVars();
  }

  createRequestHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .mergeWith(this.baseBookingVars())
      .setVariable('Renter.Avatar', avatar(this.guest))
      .setVariable('Renter.Message', this.booking.introMessage ?? '')
      .setNumberVariable('Booking.TripDays', tripDays(this.booking))
      .setMoneyVariable('Booking.PurePrice', purePrice(this.booking))
      .mergeWith(extraVariables(this.booking))
      .setMoneyVariable('Booking.DeliveryPrice', deliveryPrice(this.booking))
      .setMoneyVariable('Booking.ServiceFee', tripFee(this.booking))
      .setMoneyVariable('Booking.HostRecieveTotal', hostReceiveTotal(this.booking))
      .build();
  }

  approveGuestVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .mergeWith(this.baseBookingVars())
      .setVariable('Host.PhoneNumber', this.host.phone ?? '')
      .setNumberVariable('Booking.TripDays', tripDays(this.booking))
      .setMoneyVariable('Booking.PurePrice', purePrice(this.booking))
      .mergeWith(extraVariables(this.booking))
      .setMoneyVariable('Booking.DeliveryPrice', deliveryPrice(this.booking))
      .setMoneyVariable('Booking.TripFee', tripFee(this.booking))
      .setMoneyVariable('Booking.GuestPayTotal', guestPayTotal(this.booking))
      .build();
  }

  approveHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .mergeWith(this.baseBookingVars())
      .setNumberVariable('Booking.TripDays', tripDays(this.booking))
      .setMoneyVariable('Booking.PurePrice', purePrice(this.booking))
      .mergeWith(extraVariables(this.booking))
      .setMoneyVariable('Booking.DeliveryPrice', deliveryPrice(this.booking))
      .setMoneyVariable('Booking.ServiceFee', tripFee(this.booking))
      .setMoneyVariable('Booking.HostRecieveTotal', hostReceiveTotal(this.booking))
      .build();
  }

  checkInGuestVars(): PinpointSubstitutions {
    return this.baseBookingVars();
  }

  checkInHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .mergeWith(this.baseBookingVars())
      .setVariable('Renter.LastName', this.guest.lastName ?? '')
      .setVariable('Renter.Avatar', avatar(this.guest))
      .build();
  }

  checkOutHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .mergeWith(this.baseBookingVars())
      .setVariable('Renter.LastName', this.guest.lastName ?? '')
      .setVariable('Renter.Avatar', avatar(this.guest))
      .build();
  }

  tripReminderGuestVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.StartDate', this.startLabel())
      .setVariable('Booking.EndDate', this.endLabel())
      .build();
  }

  tripReminderHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.StartDate', this.startLabel())
      .setVariable('Booking.EndDate', this.endLabel())
      .build();
  }

  tripEndingGuestVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.EndDate', this.endLabel())
      .build();
  }

  tripEndingHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.EndDate', this.endLabel())
      .build();
  }

  newMessageGuestVars(message: string): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Host.MessageFromHost', message)
      .build();
  }

  newMessageHostVars(message: string): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Renter.MessageFromRenter', message)
      .build();
  }
}
