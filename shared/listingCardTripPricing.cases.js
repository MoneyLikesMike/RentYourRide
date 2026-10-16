/**
 * Shared expected values for web + mobile listing-card trip totals (RYRA-442).
 * Keep apps/web and utils helpers in lockstep with this table.
 *
 * days = getTripBillingDays(start, end). Totals = Math.round(subtotal + 10% fee).
 */
module.exports = {
  cases: [
    {
      name: '8-day Ford $56 with 10% weekly',
      pricePerDay: 56,
      weeklyDiscount: '10%',
      monthlyDiscount: '',
      days: 8,
      originalTotal: 493,
      total: 444,
      hasDiscount: true,
    },
    {
      name: '1-day Ford $56 (weekly listed but not applied)',
      pricePerDay: 56,
      weeklyDiscount: '10%',
      monthlyDiscount: '',
      days: 1,
      originalTotal: 62,
      total: 62,
      hasDiscount: false,
    },
    {
      name: '8-day trip with 0% weekly discount',
      pricePerDay: 56,
      weeklyDiscount: '0%',
      monthlyDiscount: '',
      days: 8,
      originalTotal: 493,
      total: 493,
      hasDiscount: false,
    },
    {
      name: '8-day CLS $130 with 10% weekly',
      pricePerDay: 130,
      weeklyDiscount: '10%',
      monthlyDiscount: '',
      days: 8,
      originalTotal: 1144,
      total: 1030,
      hasDiscount: true,
    },
    {
      name: '8-day GLC $62 with 5% weekly',
      pricePerDay: 62,
      weeklyDiscount: '5%',
      monthlyDiscount: '',
      days: 8,
      originalTotal: 546,
      total: 518,
      hasDiscount: true,
    },
  ],
  formatCases: [
    { amount: 1030, expected: 'CA$1,030' },
    { amount: 62, expected: 'CA$62' },
    { amount: 444, expected: 'CA$444' },
  ],
};
