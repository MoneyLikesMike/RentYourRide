import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../api/http';
import {
  finishEmailVerification,
  startEmailVerification,
} from '../api/users';

const CELL_COUNT = 6;

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: () => Promise<void> | void;
  email: string;
};

export default function EmailVerificationModal({
  open,
  onClose,
  onVerified,
  email,
}: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'finish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const sentOnceRef = useRef(false);

  useEffect(() => {
    if (!open) {
      sentOnceRef.current = false;
      return;
    }
    setCode('');
    setError(null);
    setHint(null);
    setSentTo('');
    setAlreadyVerified(false);
    requestAnimationFrame(() => hiddenInputRef.current?.focus());

    if (sentOnceRef.current || !email.trim()) return;
    sentOnceRef.current = true;

    void (async () => {
      setBusy('send');
      try {
        const result = await startEmailVerification();
        if (result?.alreadyVerified) {
          setAlreadyVerified(true);
          setHint('Email is already verified.');
          return;
        }
        setSentTo(email);
        if (result?.devCode) setHint(`Dev code: ${result.devCode}`);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not send code',
        );
      } finally {
        setBusy(null);
      }
    })();
  }, [open, email]);

  async function sendCode(silent = false) {
    setBusy('send');
    setError(null);
    if (!silent) setHint(null);
    try {
      const result = await startEmailVerification();
      if (result?.alreadyVerified) {
        setAlreadyVerified(true);
        setHint('Email is already verified.');
        return;
      }
      setAlreadyVerified(false);
      setSentTo(email);
      setCode('');
      if (result?.devCode) {
        setHint(`Dev code: ${result.devCode}`);
      } else if (!silent) {
        setHint('Verification code sent by email.');
      }
      hiddenInputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not send code',
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitCode(value = code) {
    if (alreadyVerified) {
      await onVerified();
      onClose();
      return;
    }
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== CELL_COUNT || busy === 'finish') return;
    setBusy('finish');
    setError(null);
    try {
      await finishEmailVerification(cleaned);
      await onVerified();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Invalid code',
      );
      setCode('');
      hiddenInputRef.current?.focus();
    } finally {
      setBusy(null);
    }
  }

  const onCodeChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, CELL_COUNT);
    setCode(next);
    setError(null);
    if (next.length === CELL_COUNT) {
      void submitCode(next);
    }
  };

  const onDigitKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  const displayEmail = sentTo || email;

  return createPortal(
    <div
      className="phone-verify-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="phone-verify-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-verify-title"
      >
        <button
          type="button"
          className="phone-verify-close"
          aria-label="Close"
          onClick={onClose}
        >
          <img src="/close.png" alt="" />
        </button>

        <h2 id="email-verify-title" className="phone-verify-title">
          Email verification
        </h2>

        <div className="phone-verify-field">
          <span className="phone-verify-label">Email</span>
          <input
            className="account-input"
            value={email}
            readOnly
            disabled
          />
        </div>

        <p className="phone-verify-digit-label">Enter {CELL_COUNT}-digit code</p>
        <p className="phone-verify-hint">
          We sent a code to {displayEmail || 'your email'}. Enter the code in
          that message
        </p>

        <div className="phone-verify-code">
          <input
            ref={hiddenInputRef}
            className="phone-verify-code-input"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={onDigitKeyDown}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CELL_COUNT}
            aria-label={`${CELL_COUNT}-digit verification code`}
            disabled={busy === 'finish' || alreadyVerified}
          />
          {Array.from({ length: CELL_COUNT }, (_, i) => {
            const char = code[i] || '';
            const active =
              i === code.length ||
              (i === CELL_COUNT - 1 && code.length === CELL_COUNT);
            return (
              <button
                key={i}
                type="button"
                className={
                  active
                    ? 'phone-verify-digit phone-verify-digit--active'
                    : 'phone-verify-digit'
                }
                tabIndex={-1}
                onClick={() => hiddenInputRef.current?.focus()}
              >
                {char}
              </button>
            );
          })}
        </div>

        <div className="phone-verify-resend">
          <span>Didn’t get it?</span>
          <button
            type="button"
            className="account-action"
            disabled={busy === 'send' || alreadyVerified}
            onClick={() => void sendCode(false)}
          >
            {busy === 'send' ? 'Sending…' : 'Send again'}
          </button>
        </div>

        {error ? <p className="phone-verify-error">{error}</p> : null}
        {hint ? <p className="phone-verify-success">{hint}</p> : null}

        <div className="phone-verify-actions phone-verify-actions--email">
          <button
            type="button"
            className="phone-verify-continue"
            disabled={
              busy === 'finish' ||
              (!alreadyVerified && code.length !== CELL_COUNT)
            }
            onClick={() => void submitCode()}
          >
            {busy === 'finish' ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
