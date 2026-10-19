import Stripe from 'stripe';

export type PayoutRequirementsStatus = {
  /** enabled | verifying | action_needed | not_started */
  status: 'enabled' | 'verifying' | 'action_needed' | 'not_started';
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
  pastDue: string[];
  eventuallyDue: string[];
  errors: Array<{ requirement?: string; code?: string; reason?: string }>;
};

/** Shared shape for RYRA-484 submit + RYRA-485 finish-setup (from Stripe Account). */
export function payoutRequirementsFromAccount(
  acct: Stripe.Account | null | undefined,
): PayoutRequirementsStatus {
  if (!acct) {
    return {
      status: 'not_started',
      payoutsEnabled: false,
      detailsSubmitted: false,
      currentlyDue: [],
      pastDue: [],
      eventuallyDue: [],
      errors: [],
    };
  }

  const currentlyDue = acct.requirements?.currently_due ?? [];
  const pastDue = acct.requirements?.past_due ?? [];
  const eventuallyDue = acct.requirements?.eventually_due ?? [];
  const errors = (acct.requirements?.errors ?? []).map((e) => ({
    requirement: e.requirement,
    code: e.code,
    reason: e.reason,
  }));

  const payoutsEnabled = acct.payouts_enabled === true;
  const detailsSubmitted = acct.details_submitted === true;

  let status: PayoutRequirementsStatus['status'];
  if (payoutsEnabled) status = 'enabled';
  else if (pastDue.length > 0 || currentlyDue.length > 0) status = 'action_needed';
  else if (detailsSubmitted || Boolean(acct.id)) status = 'verifying';
  else status = 'not_started';

  return {
    status,
    payoutsEnabled,
    detailsSubmitted,
    currentlyDue,
    pastDue,
    eventuallyDue,
    errors,
  };
}
