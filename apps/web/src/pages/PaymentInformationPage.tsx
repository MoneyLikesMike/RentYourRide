import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/http';
import {
  formatCardExpiry,
  formatCardNumberMask,
  listPaymentMethods,
  type StripePaymentMethod,
} from '../api/payments';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';
import CardBrandBadge from '../components/CardBrandBadge';
import EditPaymentMethodModal from '../components/EditPaymentMethodModal';
import ProfileLayout from '../components/ProfileLayout';

function resolveDefaultId(
  list: StripePaymentMethod[],
  preferId?: string,
): string | null {
  if (preferId && list.some((m) => m.id === preferId)) return preferId;
  const flagged = list.find((m) => m.isDefault);
  if (flagged) return flagged.id;
  return list[0]?.id ?? null;
}

function PaymentInformationBody() {
  const [methods, setMethods] = useState<StripePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editMethod, setEditMethod] = useState<StripePaymentMethod | null>(
    null,
  );
  const [defaultId, setDefaultId] = useState<string | null>(null);

  const refresh = async (preferId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPaymentMethods();
      const nextDefault = resolveDefaultId(list, preferId);
      setMethods(list);
      setDefaultId(nextDefault);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load payment methods',
      );
      setMethods([]);
      setDefaultId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const sortedMethods = useMemo(() => {
    const copy = [...methods];
    copy.sort((a, b) => {
      const aDef = a.id === defaultId ? 0 : 1;
      const bDef = b.id === defaultId ? 0 : 1;
      return aDef - bDef;
    });
    return copy;
  }, [methods, defaultId]);

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
            {sortedMethods.map((m) => {
              const expiry = formatCardExpiry(m.expMonth, m.expYear);
              const isDefault = m.id === defaultId;
              return (
                <div className="pay-info-method" key={m.id}>
                  <div className="pay-info-method-head">
                    <CardBrandBadge brand={m.brand} />
                    <button
                      type="button"
                      className="pay-info-action"
                      onClick={() => setEditMethod(m)}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="pay-info-details">
                    <span className="pay-info-number">
                      {formatCardNumberMask(m.last4)}
                    </span>
                    {expiry ? (
                      <span className="pay-info-expiry">{expiry}</span>
                    ) : null}
                  </div>
                  {isDefault ? (
                    <span className="pay-info-default">Default</span>
                  ) : null}
                </div>
              );
            })}
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
        forceDefault={methods.length === 0}
        onClose={() => setShowAdd(false)}
        onSaved={(id, opts) => {
          setShowAdd(false);
          void refresh(opts?.asDefault ? id : undefined);
        }}
      />

      <EditPaymentMethodModal
        open={!!editMethod}
        method={editMethod}
        isDefault={!!editMethod && editMethod.id === defaultId}
        onClose={() => setEditMethod(null)}
        onDeleted={() => {
          void refresh();
        }}
        onSaved={(opts) => {
          void refresh(opts?.asDefault ? editMethod?.id : undefined);
        }}
      />
    </div>
  );
}

export default function PaymentInformationPage() {
  return (
    <ProfileLayout title="Payment information">
      {() => <PaymentInformationBody />}
    </ProfileLayout>
  );
}
