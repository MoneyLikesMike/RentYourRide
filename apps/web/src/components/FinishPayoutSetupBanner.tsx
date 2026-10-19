import { Link } from 'react-router-dom';
import {
  FINISH_PAYOUT_BANNER_BODY,
  FINISH_PAYOUT_BANNER_TITLE,
} from '../content/payoutRequirementCopy';
import type { PayoutAccountStatus } from '../api/payouts';
import { isPayoutAccountReady } from '../api/payouts';

type Props = {
  status: PayoutAccountStatus | null | undefined;
  pendingAmount?: number | null;
  finishPath?: string;
};

export default function FinishPayoutSetupBanner({
  status,
  pendingAmount,
  finishPath = '/profile/trips/payouts?finish=1',
}: Props) {
  const due =
    (status?.currentlyDue?.length || 0) + (status?.pastDue?.length || 0) > 0;
  const show = !isPayoutAccountReady(status) || due;
  if (!show) return null;

  const deadline = status?.currentDeadline
    ? new Date(status.currentDeadline).toLocaleDateString()
    : null;

  return (
    <div className="finish-payout-banner" role="status">
      <p className="finish-payout-banner-title">{FINISH_PAYOUT_BANNER_TITLE}</p>
      <p className="finish-payout-banner-body">{FINISH_PAYOUT_BANNER_BODY}</p>
      {deadline ? (
        <p className="finish-payout-banner-meta">Deadline: {deadline}</p>
      ) : null}
      {pendingAmount != null && pendingAmount > 0 ? (
        <p className="finish-payout-banner-meta">
          Waiting: ${pendingAmount.toFixed(2)} CAD
        </p>
      ) : null}
      <Link className="finish-payout-banner-cta" to={finishPath}>
        Continue setup →
      </Link>
    </div>
  );
}
