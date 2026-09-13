import { useState } from 'react';
import GetPaidForm from './GetPaidForm';

type Props = {
  /** Path Stripe returns to if it still needs something after we save. */
  returnPath?: string;
  onComplete?: () => void;
};

/**
 * App GetPaidLandingScreen — block list-a-ride until payout setup is done.
 * The CTA opens our own payout form (app GetPaidStep1–3) rather than dropping
 * the host straight into Stripe's much longer hosted onboarding.
 */
export default function GetPaidGate({ returnPath, onComplete }: Props) {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <GetPaidForm
        returnPath={returnPath ?? '/profile/list-your-ride'}
        onComplete={() => {
          if (onComplete) onComplete();
          else window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="get-paid-gate">
      <img
        src="/list-ride/FinishIcon.png"
        alt=""
        className="get-paid-gate-icon"
      />
      <h1 className="get-paid-gate-title">
        <span className="get-paid-gate-ready">Ready</span> to start earning?
      </h1>
      <p className="get-paid-gate-copy">
        We want to pay you! Add your payout information so we can pay you
        directly!
      </p>
      <button
        type="button"
        className="get-paid-gate-cta"
        onClick={() => setStarted(true)}
      >
        Add payout method
      </button>
    </div>
  );
}
