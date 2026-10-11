import { BookingEntity } from '../entities/booking.entity';
import { UserEntity } from '../entities/user.entity';
import { getTripBillingDays } from '../bookings/trip-billing-days';
import { hostEarningsForPricing, hostNetDollarsForPricing } from '../bookings/host-earnings';
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

/** e.g. "October 11, 2026 at 1:08 PM" in the booking timezone. */
export function formatDateTime(ms: number, tz = DEFAULT_TZ): string {
  return `${formatDatePart(ms, tz)} at ${formatTimePart(ms, tz)}`;
}

/** Prefer calendar startTime/endTime strings (mobile stores clock there; start/end are often midnight). */
function resolveTimeLabel(ms: number, timeOverride?: string | null, tz = DEFAULT_TZ): string {
  const booked = typeof timeOverride === 'string' ? timeOverride.trim() : '';
  return booked || formatTimePart(ms, tz);
}

function formatStartDate(ms: number, timeOverride?: string | null, tz = DEFAULT_TZ): string {
  return `${formatDatePart(ms, tz)} at ${resolveTimeLabel(ms, timeOverride, tz)}`;
}

function formatEndDate(ms: number, timeOverride?: string | null, tz = DEFAULT_TZ): string {
  return `${formatDatePart(ms, tz)} at ${resolveTimeLabel(ms, timeOverride, tz)}`;
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

/** Vehicle decoders return makes in capitals ("HONDA"); keep short acronyms like BMW, GMC. */
function tidyVehicleName(name: string): string {
  const fix = (part: string) =>
    /^[A-Z]{4,}$/.test(part) || part === 'KIA' ? part.charAt(0) + part.slice(1).toLowerCase() : part;
  return name
    .split(' ')
    .map((word) => word.split('-').map(fix).join('-'))
    .join(' ');
}

function vehicleModelOf(s: Record<string, unknown>): string {
  const vd = (s.vehicleData ?? {}) as Record<string, unknown>;
  const make = String(vd.make ?? '').trim();
  const model = String(vd.model ?? '').trim();
  const title = String(s.title ?? '').trim();
  if (title) return tidyVehicleName(title);
  if (make || model) return tidyVehicleName(`${make} ${model}`.trim());
  return 'Vehicle';
}

function coverImageOf(s: Record<string, unknown>): string {
  if (typeof s.coverImageUri === 'string' && s.coverImageUri.trim()) {
    return s.coverImageUri.trim();
  }
  const photos = s.photos as Array<{ uri?: string; imageUrl?: string }> | undefined;
  const first = photos?.[0];
  const raw = (first?.uri ?? first?.imageUrl ?? '').trim();
  return raw;
}

function vehicleModel(booking: BookingEntity): string {
  return vehicleModelOf(snap(booking));
}

function coverImage(booking: BookingEntity): string {
  return coverImageOf(snap(booking));
}

/** Vehicle.Model and Vehicle.CoverImage for emails about a listing (no booking yet). */
export function listingVehicleVars(listing: Record<string, unknown>): PinpointSubstitutions {
  return new TemplateVariablesBuilder()
    .init()
    .setVariable('Vehicle.Model', vehicleModelOf(listing))
    .setVariable('Vehicle.CoverImage', coverImageOf(listing))
    .build();
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

export function hostReceiveTotal(booking: BookingEntity): number {
  return hostNetDollarsForPricing(pricing(booking));
}

/** RYR service fee shown on host emails as Booking.ServiceFee. */
export function serviceFee(booking: BookingEntity): number {
  return hostEarningsForPricing(pricing(booking)).serviceFeeCents / 100;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Accounting-style deduction, e.g. "($37.50)". */
function deduction(cents: number): string {
  return `(${money(cents)})`;
}

function centsOf(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

function selectedExtraCents(p: Record<string, unknown>, field: string, key: string): number {
  if (p[field] != null && p[field] !== '') return centsOf(p[field]);
  const selected = p.selectedExtras as Array<{ key?: string; amount?: number }> | undefined;
  return centsOf(selected?.find((e) => e.key === key)?.amount);
}

/**
 * Line items shared by the host and guest breakdowns, in the same order as the
 * app's booking screens. Pinpoint templates hide a row with
 * {{#eq Var ''}}{{else}}…{{/eq}}, so unselected extras and a missing discount are
 * set to ''. Every key is always set: Pinpoint drops the email if a variable the
 * template uses is missing.
 */
function lineItemVars(p: Record<string, unknown>, days: number): PinpointSubstitutions {
  const discountedCents = centsOf(p.discountedTripSubtotal);
  const baseCents = p.baseTripSubtotal != null && p.baseTripSubtotal !== ''
    ? centsOf(p.baseTripSubtotal)
    : discountedCents;
  const savingsCents = Math.max(0, baseCents - discountedCents);
  const pricePerDayCents = p.pricePerDay != null && p.pricePerDay !== ''
    ? centsOf(p.pricePerDay)
    : Math.round(baseCents / Math.max(1, days));

  const kms = selectedExtraCents(p, 'unlimitedKmFee', 'kms');
  const fuel = selectedExtraCents(p, 'prepaidFuelFee', 'fuel');
  const clean = selectedExtraCents(p, 'prepaidCleanFee', 'clean');
  const delivery = centsOf(p.selectedDeliveryFee);
  const optional = (cents: number) => [cents > 0 ? money(cents) : ''];

  let discountLabel = '';
  if (savingsCents > 0) {
    discountLabel = p.appliesMonthlyDiscount
      ? `Monthly discount (${Number(p.monthlyDiscountPct ?? 0)}%)`
      : `Weekly discount (${Number(p.weeklyDiscountPct ?? 0)}%)`;
  }

  return {
    'Booking.PricePerDay': [money(pricePerDayCents)],
    'Booking.TripDaysLabel': [`${days} ${days === 1 ? 'day' : 'days'}`],
    'Booking.BaseTripSubtotal': [money(baseCents)],
    'Booking.DiscountLabel': [discountLabel],
    'Booking.DiscountAmount': [savingsCents > 0 ? deduction(savingsCents) : ''],
    'Booking.ExtraKms': optional(kms),
    'Booking.ExtraFuel': optional(fuel),
    'Booking.ExtraClean': optional(clean),
    'Booking.ExtraDelivery': optional(delivery),
    'Booking.HasExtras': [kms + fuel + clean + delivery > 0 ? 'yes' : ''],
  };
}

/** Host earnings breakdown: line items, subtotal, service fee deduction, earnings. */
export function hostBreakdownVars(
  pricing: Record<string, unknown> | null | undefined,
  days: number,
): PinpointSubstitutions {
  const p = pricing ?? {};
  const e = hostEarningsForPricing(p);
  return {
    ...lineItemVars(p, days),
    'Booking.Subtotal': [money(e.hostNetCents + e.serviceFeeCents)],
    'Booking.ServiceFeeLabel': [`Service fee (${Math.round(e.serviceFeeRate * 100)}%)`],
    'Booking.ServiceFeeDeduction': [deduction(e.serviceFeeCents)],
    'Booking.HostRecieveTotal': [money(e.hostNetCents)],
  };
}

/** Guest price breakdown: line items, subtotal, trip fee, total price. */
export function guestBreakdownVars(
  pricing: Record<string, unknown> | null | undefined,
  days: number,
): PinpointSubstitutions {
  const p = pricing ?? {};
  const items = lineItemVars(p, days);
  const subtotalCents = p.subtotal != null && p.subtotal !== ''
    ? centsOf(p.subtotal)
    : centsOf(p.discountedTripSubtotal) +
      selectedExtraCents(p, 'unlimitedKmFee', 'kms') +
      selectedExtraCents(p, 'prepaidFuelFee', 'fuel') +
      selectedExtraCents(p, 'prepaidCleanFee', 'clean') +
      centsOf(p.selectedDeliveryFee);
  const tripFeeCents = centsOf(p.tripFee);
  const totalCents = p.grandTotal != null && p.grandTotal !== ''
    ? centsOf(p.grandTotal)
    : subtotalCents + tripFeeCents;
  return {
    ...items,
    'Booking.Subtotal': [money(subtotalCents)],
    'Booking.TripFee': [money(tripFeeCents)],
    'Booking.GuestPayTotal': [money(totalCents)],
  };
}

/** Review.Stars / Review.Rating / Review.Comment for the review-received emails. */
export function reviewVars(review: { rating?: unknown; text?: unknown } | null | undefined): PinpointSubstitutions {
  const rating = Math.min(5, Math.max(1, Math.round(Number(review?.rating) || 0)));
  return new TemplateVariablesBuilder()
    .init()
    .setVariable('Review.Stars', '★'.repeat(rating) + '☆'.repeat(5 - rating))
    .setVariable('Review.Rating', String(rating))
    .setVariable('Review.Comment', String(review?.text ?? '').trim())
    .build();
}

/** Host-facing extension summary used by the extension request email. */
export function extensionPaymentDetails(extPricing: Record<string, unknown> | null | undefined): string {
  const p = extPricing ?? {};
  const e = hostEarningsForPricing(p);
  const tripDays = Number(p.tripDays ?? 0);
  return `Trip days: ${tripDays}\nYour earnings: $${(e.hostNetCents / 100).toFixed(2)}\nService Fee: $${(e.serviceFeeCents / 100).toFixed(2)}`;
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

  hostBreakdown(): PinpointSubstitutions {
    return hostBreakdownVars(pricing(this.booking), tripDays(this.booking));
  }

  guestBreakdown(): PinpointSubstitutions {
    return guestBreakdownVars(pricing(this.booking), tripDays(this.booking));
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
      .setMoneyVariable('Booking.ServiceFee', serviceFee(this.booking))
      .setMoneyVariable('Booking.HostRecieveTotal', hostReceiveTotal(this.booking))
      .mergeWith(this.hostBreakdown())
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
      .mergeWith(this.guestBreakdown())
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
      .setMoneyVariable('Booking.ServiceFee', serviceFee(this.booking))
      .setMoneyVariable('Booking.HostRecieveTotal', hostReceiveTotal(this.booking))
      .mergeWith(this.hostBreakdown())
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

  /** Review received: `role` is who wrote it. */
  reviewReceivedVars(role: 'guest' | 'host'): PinpointSubstitutions {
    const review = (this.booking.lifecycle ?? {})[`${role}Review`] as
      | { rating?: unknown; text?: unknown }
      | undefined;
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .mergeWith(reviewVars(review))
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
      .mergeWith(this.guestBreakdown())
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
      .mergeWith(this.hostBreakdown())
      .build();
  }

  tripEndingGuestVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.StartDate', this.startLabel())
      .setVariable('Booking.EndDate', this.endLabel())
      .mergeWith(this.guestBreakdown())
      .build();
  }

  tripEndingHostVars(): PinpointSubstitutions {
    return new TemplateVariablesBuilder()
      .init()
      .setVariable('Host.FirstName', this.host.firstName ?? '')
      .setVariable('Renter.FirstName', this.guest.firstName ?? '')
      .setVariable('Vehicle.Model', vehicleModel(this.booking))
      .setVariable('Vehicle.CoverImage', coverImage(this.booking))
      .setVariable('Booking.StartDate', this.startLabel())
      .setVariable('Booking.EndDate', this.endLabel())
      .mergeWith(this.hostBreakdown())
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
