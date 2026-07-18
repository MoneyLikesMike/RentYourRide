import { apiFetch } from './http';

export type BookingDatesInput = {
  start: number;
  end: number;
  startTime?: string;
  endTime?: string;
};

export type QuoteInput = {
  listingId: string;
  bookingDates: BookingDatesInput;
  extraUnlimitedKm?: boolean;
  extraPrepaidFuel?: boolean;
  extraPrepaidClean?: boolean;
  deliveryEnabled?: boolean;
};

export type BookingQuote = {
  tripDays: number;
  pricePerDay: number;
  baseTripSubtotal: number;
  discountedTripSubtotal: number;
  tripDiscountSavings: number;
  appliesWeeklyDiscount: boolean;
  appliesMonthlyDiscount: boolean;
  weeklyDiscountPct: number;
  monthlyDiscountPct: number;
  unlimitedKmFee: number;
  prepaidFuelFee: number;
  prepaidCleanFee: number;
  selectedDeliveryFee: number;
  subtotal: number;
  tripFee: number;
  grandTotal: number;
  hostReceiveTotal: number;
  kmIncludedLabel: string;
  selectedExtras: Array<{ key: string; label: string; amount: number }>;
  canDeliver: boolean;
};

export type PaymentMethodRef = {
  id: string;
  type?: string;
  brand?: string;
  last4?: string;
  funding?: string | null;
};

export type CreateBookingBody = {
  listingId: string;
  listingSnapshot?: Record<string, unknown>;
  bookingDates: BookingDatesInput;
  pickupAddress?: string;
  dropoffAddress?: string;
  deliveryEnabled?: boolean;
  extras?: Array<{ key: string; label: string; amount: number }>;
  introMessage?: string;
  pricing?: Partial<BookingQuote> & Record<string, unknown>;
  selectedPaymentMethod: PaymentMethodRef;
  stripePaymentIntentId?: string | null;
  instantBooking?: boolean;
  guestName?: string;
};

export type BookingDto = {
  id: string;
  listingId: string;
  status: string;
  instantBooking?: boolean;
  pricing?: Partial<BookingQuote>;
  [key: string]: unknown;
};

export async function quoteBooking(body: QuoteInput): Promise<BookingQuote> {
  return apiFetch<BookingQuote>('v1/bookings/quote', {
    method: 'POST',
    json: body,
  });
}

export async function createBooking(
  body: CreateBookingBody,
  idempotencyKey?: string,
): Promise<BookingDto> {
  return apiFetch<BookingDto>('v1/bookings', {
    method: 'POST',
    json: body,
    headers: idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined,
  });
}
