import { useEffect, useState } from 'react';
import { ApiError } from '../api/http';
import {
  listPaymentMethods,
  setDefaultPaymentMethod,
  type StripePaymentMethod,
} from '../api/payments';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';
import ProfileLayout from '../components/ProfileLayout';

function brandLabel(brand?: string): string {
  if (!brand) return 'CARD';
  return brand.toUpperCase();
}

function PaymentInformationBody() {
  const [methods, setMethods] = useState<StripePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async (preferId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPaymentMethods();
      setMethods(list);
      if (preferId && list.some((m) => m.id === preferId)) {
        setDefaultId(preferId);
      } else if (!defaultId && list[0]) {
        setDefaultId(list[0].id);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load payment methods',
      );
      setMethods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSetDefault = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await setDefaultPaymentMethod(id);
      setDefaultId(id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not update default card',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pay-info">
      <h1 className="pay-info-title">Payment information</h1>
      <div className="pay-info-border" />

      {loading ? <p className="profile-status">Loading cards…</p> : null}

      {!loading && methods.length === 0 ? (
        <p className="pay-info-empty">
          There are currently no payment methods. Please add methods convenient
          for you!
        </p>
      ) : null}

      {methods.length > 0 ? (
        <>
          <h2 className="pay-info-subtitle">Payment methods</h2>
          <div className="pay-info-methods">
            {methods.map((m) => (
              <div className="pay-info-method" key={m.id}>
                <div className="pay-info-method-head">
                  <span className="pay-info-brand">{brandLabel(m.brand)}</span>
                  <button
                    type="button"
                    className="pay-info-action"
                    disabled={busyId === m.id || defaultId === m.id}
                    onClick={() => void onSetDefault(m.id)}
                  >
                    {defaultId === m.id
                      ? 'Default'
                      : busyId === m.id
                        ? 'Saving…'
                        : 'Set default'}
                  </button>
                </div>
                <div className="pay-info-details">
                  <span>XXXX-XXXX-XXXX-{m.last4}</span>
                  {m.funding ? <span>{m.funding}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {error ? <p className="profile-error">{error}</p> : null}

      <button
        type="button"
        className="pay-info-add-btn"
        onClick={() => setShowAdd(true)}
      >
        Add payment method
      </button>

      <AddPaymentMethodModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={(id) => {
          setShowAdd(false);
          void refresh(id);
        }}
      />
    </div>
  );
}

export default function PaymentInformationPage() {
  return (
    <ProfileLayout>
      {() => <PaymentInformationBody />}
    </ProfileLayout>
  );
}
