import { BookingEntity } from '../entities/booking.entity';
import { UserEntity } from '../entities/user.entity';
import { TemplateVariablesBuilder, PinpointSubstitutions } from './template-variables.builder';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TZ = 'America/Winnipeg';

function getTripBillingDays(startMs: number, endMs: number): number {
  const a = new Date(startMs);
  const b = new Date(endMs);
  const t1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const t2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const daySpan = Math.abs(t2 - t1) / MS_PER_DAY;
  return Math.max(1, Math.floor(daySpan) + 1);
}

function formatStartDate(ms: number, tz = DEFAULT_TZ): string {
  const d = new Date(ms);
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${datePart}. Start Time ${timePart}`;
}

function formatEndDate(ms: number, tz = DEFAULT_TZ): string {
  const d = new Date(ms);
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${datePart}. End Time ${timePart}`;
}

export function formatBookingStartDate(ms: number, tz = DEFAULT_TZ): string {
  return formatStartDate(ms, tz);
}

export function formatBookingEndDate(ms: number, tz = DEFAULT_TZ): string {
  return formatEndDate(ms, tz);
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
  const photos = s.photos as Array<{ uri?: string }> | undefined;
  return photos?.[0]?.uri ?? '';
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
    if (e.key === 'kms') vars['Booking.UnlimitedKms'] = [`$${amt}`];
    if (e.key === 'fuel') vars['Booking.PrePaidFuel'] = [`$${amt}`];
    if (e.key === 'clean') vars['Booking.PrePaidClean'] = [`$${amt}`];
  }
  return vars;
}

function tripDays(booking: BookingEntity): number {
  const dates = booking.bookingDates as { start?: number; end?: number };
  if (dates.start == null || dates.end == null) return 1;
  return getTripBillingDays(dates.start, dates.end);
}

function startMs(booking: BookingEntity): number {
  const dates = booking.bookingDates as { start?: number };
  return Number(dates.start ?? Date.now());
}

function endMs(booking: BookingEntity): number {
  const dates = booking.bookingDates as { end?: number };
  return Number(dates.end ?? Date.now());
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
    return formatStartDate(startMs(this.booking), this.tz);
  }

  endLabel(): string {
    return formatEndDate(endMs(this.booking), this.tz);
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
      .setVariable('H', message)
      .build();
  }

  newMessageHostVars(message: string): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('H', message)
      .build();
  }
}
