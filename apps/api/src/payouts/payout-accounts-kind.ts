import Stripe from 'stripe';

export function isCustomConnectAccount(acct: Stripe.Account): boolean {
  return acct.controller?.requirement_collection === 'application';
}

export function isExpressConnectAccount(acct: Stripe.Account): boolean {
  if (acct.type === 'express') return true;
  return (
    acct.controller?.stripe_dashboard?.type === 'express' ||
    (acct.controller?.requirement_collection === 'stripe' &&
      acct.controller?.stripe_dashboard?.type !== 'none')
  );
}
