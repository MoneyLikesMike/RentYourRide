import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../api/http';
import {
  deletePaymentMethod,
  setDefaultPaymentMethod,
  updatePaymentMethodBilling,
  type StripePaymentMethod,
} from '../api/payments';

/** Same billing countries as mobile AddCardScreen. */
const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
] as const;

type CountryCode = (typeof COUNTRIES)[number]['code'];

function resolveCountry(code?: string | null): CountryCode {
  const c = (code || '').toUpperCase();
  return c === 'CA' ? 'CA' : 'US';
}

function formatExpShort(
  month?: number | null,
  year?: number | null,
): string {
  if (!month || !year) return '';
  const mm = String(month).padStart(2, '0');
  const yy = String(year % 100).padStart(2, '0');
  return `${mm} / ${yy}`;
}

function formatCardSpaces(last4: string): string {
  return `XXXX  XXXX  XXXX  ${last4}`;
}

type Props = {
  open: boolean;
  method: StripePaymentMethod | null;
  isDefault: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onSaved: (opts?: { asDefault?: boolean }) => void;
};

export default function EditPaymentMethodModal({
  open,
  method,
  isDefault,
  onClose,
  onDeleted,
  onSaved,
}: Props) {
  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState<CountryCode>('US');
  const [postalCode, setPostalCode] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!method) return;
    setCardholderName(method.cardholderName || '');
    setCountry(resolveCountry(method.country));
    setPostalCode(method.postalCode || '');
    setMakeDefault(isDefault);
    setError(null);
    setBusy(null);
  }, [method, isDefault]);

  if (!open || !method) return null;

  const zipLabel = country === 'US' ? 'Zip code' : 'Postal code';
  const zipPlaceholder = country === 'US' ? '12345' : 'A1A 1A1';
  const expDisplay = formatExpShort(method.expMonth, method.expYear);

  const onDelete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this payment method?',
      )
    ) {
      return;
    }
    setBusy('delete');
    setError(null);
    try {
      await deletePaymentMethod(method.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not delete card',
      );
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('save');
    setError(null);
    try {
      await updatePaymentMethodBilling(method.id, {
        cardholderName: cardholderName.trim(),
        country,
        postalCode: postalCode.trim(),
      });
      if (makeDefault && !isDefault) {
        await setDefaultPaymentMethod(method.id);
      }
      onSaved({ asDefault: makeDefault || isDefault });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save card',
      );
    } finally {
      setBusy(null);
    }
  };

  return createPortal(
    <div
      className="add-pay-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="add-pay-modal edit-pay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-pay-title"
      >
        <button
          type="button"
          className="add-pay-close"
          aria-label="Close"
          onClick={onClose}
        >
          <img src="/close.png" alt="" />
        </button>

        <form
          className="add-pay-modal-form edit-pay-form"
          onSubmit={(e) => void onSubmit(e)}
        >
          <h2 id="edit-pay-title" className="add-pay-modal-title">
            Edit payment method
          </h2>

          <div className="add-pay-fields">
            <label className="add-pay-field">
              <span className="add-pay-label">Cardholder Name</span>
              <input
                className="add-pay-input"
                type="text"
                placeholder="Name"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                autoComplete="cc-name"
                disabled={busy !== null}
              />
            </label>

            <label className="add-pay-field">
              <span className="add-pay-label">Card number</span>
              <input
                className="add-pay-input add-pay-input--readonly"
                type="text"
                value={formatCardSpaces(method.last4)}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
            </label>

            <div className="add-pay-row">
              <label className="add-pay-field add-pay-half">
                <span className="add-pay-label">Exp. date</span>
                <input
                  className="add-pay-input add-pay-input--readonly"
                  type="text"
                  value={expDisplay}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </label>
              <label className="add-pay-field add-pay-half">
                <span className="add-pay-label">CVV</span>
                <input
                  className="add-pay-input add-pay-input--readonly"
                  type="text"
                  value="•••"
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </label>
            </div>

            <div className="add-pay-row">
              <label className="add-pay-field add-pay-half">
                <span className="add-pay-label">Country</span>
                <select
                  className="add-pay-input add-pay-select"
                  value={country}
                  onChange={(e) =>
                    setCountry(e.target.value as CountryCode)
                  }
                  autoComplete="country"
                  disabled={busy !== null}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="add-pay-field add-pay-half">
                <span className="add-pay-label">{zipLabel}</span>
                <input
                  className="add-pay-input"
                  type="text"
                  placeholder={zipPlaceholder}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  autoComplete="postal-code"
                  disabled={busy !== null}
                />
              </label>
            </div>
          </div>

          {error ? <p className="add-pay-error-text">{error}</p> : null}

          <label className="add-pay-default">
            <span className="add-pay-default-label">Set as default</span>
            <span className="add-pay-default-switch">
              <input
                type="checkbox"
                checked={makeDefault}
                disabled={isDefault || busy !== null}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />
              <span className="add-pay-default-slider" aria-hidden />
            </span>
          </label>

          <div className="edit-pay-actions">
            <button
              type="button"
              className="edit-pay-delete"
              disabled={busy !== null}
              onClick={() => void onDelete()}
            >
              <span className="edit-pay-delete-x" aria-hidden="true" />
              {busy === 'delete' ? 'Deleting…' : 'Delete card'}
            </button>
            <button
              type="submit"
              className="edit-pay-save"
              disabled={busy !== null}
            >
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
