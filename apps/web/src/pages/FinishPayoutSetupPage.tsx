import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import {
  listPayoutRequirements,
  submitRequirementBank,
  submitRequirementDocument,
  submitRequirementPersonal,
  submitRequirementSin,
  submitRequirementTos,
  type PayoutRequirement,
} from '../api/payouts';
import { SIN_WHY_WE_ASK } from '../content/payoutRequirementCopy';
import ProfileLayout from '../components/ProfileLayout';

export default function FinishPayoutSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<PayoutRequirement[]>([]);
  const [index, setIndex] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sin, setSin] = useState('');
  const [holderName, setHolderName] = useState('');
  const [transitNumber, setTransitNumber] = useState('');
  const [institutionNumber, setInstitutionNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPayoutRequirements();
      setRequirements(res.requirements || []);
      setIndex(0);
      if (res.payoutsReady) {
        navigate('/profile/trips/payouts', { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load requirements',
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const current = requirements[index];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (current.screen === 'personal' || current.screen === 'address') {
        await submitRequirementPersonal({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      } else if (current.screen === 'sin') {
        await submitRequirementSin(sin.replace(/\D/g, ''));
        setSin('');
      } else if (current.screen === 'bank') {
        await submitRequirementBank({
          accountHolderName: holderName.trim(),
          transitNumber: transitNumber.replace(/\D/g, ''),
          institutionNumber: institutionNumber.replace(/\D/g, ''),
          accountNumber: accountNumber.replace(/\D/g, ''),
        });
      } else if (current.screen === 'tos') {
        await submitRequirementTos();
      } else if (
        current.screen === 'id_document' ||
        current.screen === 'address_document'
      ) {
        if (!front) {
          setError('Choose a front image of your document.');
          setBusy(false);
          return;
        }
        await submitRequirementDocument({
          front,
          back,
          purpose:
            current.screen === 'address_document'
              ? 'additional_verification'
              : 'identity_document',
        });
        setFront(null);
        setBack(null);
      }
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileLayout title="Finish payout setup">
      {() => (
        <div className="trips-page finish-payout-page">
          <div className="trips-page-head">
            <button
              type="button"
              className="trips-back"
              aria-label="Back"
              onClick={() => navigate('/profile/trips/payouts')}
            >
              ←
            </button>
            <h1 className="trips-page-title">Finish payout setup</h1>
          </div>
          {loading ? <p className="profile-status">Loading…</p> : null}
          {!loading && !current ? (
            <p className="profile-status">No outstanding requirements.</p>
          ) : null}
          {current ? (
            <form className="get-paid-form" onSubmit={(e) => void onSubmit(e)}>
              <p className="get-paid-section-lead">
                Step {index + 1} of {requirements.length}
              </p>
              <h2 className="get-paid-section-title">{current.label}</h2>
              {current.errorReason ? (
                <p className="get-paid-form-error">{current.errorReason}</p>
              ) : null}

              {(current.screen === 'personal' ||
                current.screen === 'address') && (
                <>
                  <label className="get-paid-field">
                    <span className="get-paid-label">First name</span>
                    <input
                      className="get-paid-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </label>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Last name</span>
                    <input
                      className="get-paid-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </label>
                </>
              )}

              {current.screen === 'sin' ? (
                <>
                  <p className="get-paid-section-lead">{SIN_WHY_WE_ASK}</p>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Social Insurance Number</span>
                    <input
                      className="get-paid-input"
                      value={sin}
                      onChange={(e) =>
                        setSin(
                          e.target.value.replace(/[^\d\s]/g, '').slice(0, 11),
                        )
                      }
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                </>
              ) : null}

              {current.screen === 'bank' ? (
                <>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Account holder name</span>
                    <input
                      className="get-paid-input"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                    />
                  </label>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Transit</span>
                    <input
                      className="get-paid-input"
                      value={transitNumber}
                      onChange={(e) => setTransitNumber(e.target.value)}
                      inputMode="numeric"
                    />
                  </label>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Institution</span>
                    <input
                      className="get-paid-input"
                      value={institutionNumber}
                      onChange={(e) => setInstitutionNumber(e.target.value)}
                      inputMode="numeric"
                    />
                  </label>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Account number</span>
                    <input
                      className="get-paid-input"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      inputMode="numeric"
                    />
                  </label>
                </>
              ) : null}

              {current.screen === 'id_document' ||
              current.screen === 'address_document' ? (
                <>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Front</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => setFront(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label className="get-paid-field">
                    <span className="get-paid-label">Back (optional)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => setBack(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </>
              ) : null}

              {current.screen === 'tos' ? (
                <p className="get-paid-section-lead">
                  By continuing you re-accept the Stripe Connected Account
                  Agreement and RentYourRide Terms.
                </p>
              ) : null}

              {current.screen === 'unknown' ? (
                <p className="get-paid-section-lead">
                  This requirement needs our team. We’ve notified support.
                </p>
              ) : null}

              {error ? <p className="get-paid-form-error">{error}</p> : null}

              <button
                type="submit"
                className="get-paid-gate-cta"
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save and continue'}
              </button>
            </form>
          ) : null}
        </div>
      )}
    </ProfileLayout>
  );
}
