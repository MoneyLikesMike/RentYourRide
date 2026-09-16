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

export type BookingDates = {
  start?: number | string;
  end?: number | string;
  startTime?: string;
  endTime?: string;
};

export type ListingSnapshot = {
  id?: string;
  title?: string;
  hostName?: string;
  coverUri?: string;
  pickupAddress?: string;
  photos?: Array<{ uri?: string; url?: string }>;
  pricePerDay?: number;
  [key: string]: unknown;
};

/** Nest booking DTO (mobile-flattened lifecycle fields included). */
export type BookingDto = {
  id: string;
  listingId: string;
  status: string;
  instantBooking?: boolean;
  guestUserId?: string;
  hostUserId?: string;
  guestName?: string;
  introMessage?: string;
  extras?: Array<{ key: string; label: string; amount: number }>;
  pricing?: Partial<BookingQuote>;
  bookingDates?: BookingDates;
  listingSnapshot?: ListingSnapshot;
  pickupAddress?: string;
  dropoffAddress?: string;
  guestCheckedInAt?: number | string | null;
  hostCheckedInAt?: number | string | null;
  rentalAgreementSignedAt?: number | string | null;
  hostRentalAgreementSignedAt?: number | string | null;
  guestTripStartedAt?: number | string | null;
  hostTripStartedAt?: number | string | null;
  guestCheckoutStartedAt?: number | string | null;
  hostCheckoutStartedAt?: number | string | null;
  guestCheckoutRentalAgreementSignedAt?: number | string | null;
  hostCheckoutRentalAgreementSignedAt?: number | string | null;
  guestCheckedOutAt?: number | string | null;
  hostCheckoutTripEndedAt?: number | string | null;
  tripExtended?: boolean;
  extensionApprovedByHost?: boolean;
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

export async function listBookings(
  role: 'guest' | 'host' = 'guest',
  status?: string,
): Promise<BookingDto[]> {
  const qs = new URLSearchParams({ role });
  if (status) qs.set('status', status);
  return apiFetch<BookingDto[]>(`v1/bookings?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function getBooking(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(`v1/bookings/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function cancelBooking(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/cancel`,
    { method: 'POST', json: {} },
  );
}

export async function acceptBooking(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/accept`,
    { method: 'POST', json: {} },
  );
}

export async function declineBooking(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/decline`,
    { method: 'POST', json: {} },
  );
}

export async function checkinStart(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/checkin/start`,
    { method: 'POST', json: {} },
  );
}

export async function tripStart(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/trip/start`,
    { method: 'POST', json: {} },
  );
}

export async function checkoutStart(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/checkout/start`,
    { method: 'POST', json: {} },
  );
}

export async function completeBooking(id: string): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/complete`,
    { method: 'POST', json: {} },
  );
}

export async function patchBookingLifecycle(
  id: string,
  body: Record<string, unknown>,
): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/lifecycle`,
    { method: 'POST', json: body },
  );
}

export async function signAgreement(
  id: string,
  body: { role: 'guest' | 'host'; signature: string },
): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/agreement/sign`,
    { method: 'POST', json: body },
  );
}

export async function respondExtension(
  id: string,
  approved: boolean,
): Promise<BookingDto> {
  return apiFetch<BookingDto>(
    `v1/bookings/${encodeURIComponent(id)}/extension/respond`,
    { method: 'POST', json: { approved } },
  );
}

/** Merge guest + host lists by id (mobile GuestBookingsContext pattern). */
export async function fetchAllBookings(): Promise<BookingDto[]> {
  const [guest, host] = await Promise.all([
    listBookings('guest').catch(() => [] as BookingDto[]),
    listBookings('host').catch(() => [] as BookingDto[]),
  ]);
  const byId = new Map<string, BookingDto>();
  for (const b of [...guest, ...host]) {
    if (b?.id) byId.set(String(b.id), b);
  }
  return [...byId.values()];
}

export const ACTIVE_BOOKING_STATUSES = new Set([
  'confirmed',
  'checkin_pending',
  'active',
  'checkout_pending',
  'extended',
  'extension_pending',
  'extension_declined',
]);
