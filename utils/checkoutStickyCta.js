/**
 * Sticky checkout CTA helpers (RYRA-488).
 * Price pane must never submit a booking — only the book pane does.
 */

export function buildTripRequestConfirmCopy({
  isInstantBooking,
  hostName,
  totalCad,
  brand,
  last4,
}) {
  const card = `${brand || 'Card'} ••${last4 || '••••'}`;
  const total = Number(totalCad).toFixed(2);
  if (isInstantBooking) {
    return {
      title: 'Book trip',
      message: `We'll charge CAD $${total} on ${card}.`,
    };
  }
  return {
    title: 'Send trip request?',
    message: `We'll send your request to ${hostName || 'the host'} for CAD $${total}. A temporary $1.00 hold will be placed on ${card} and released if the host declines.`,
  };
}

/** Price-pane handler: never calls submit. */
export function onCheckoutPricePanePress({ openPriceBreakdown } = {}) {
  if (typeof openPriceBreakdown === 'function') openPriceBreakdown();
}

/** Book-pane handler: only path that should call submitBooking / createBooking. */
export function onCheckoutBookPanePress({ submitBooking } = {}) {
  if (typeof submitBooking === 'function') return submitBooking();
  return undefined;
}
