import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "../api/http";
import { finishPhoneVerification, startPhoneVerification } from "../api/users";
import type { CountryCallingCode } from "../data/countryCallingCodes";
import {
  formatNationalPhone,
  formatPhoneForDisplay,
  placeholderForCountry,
  toE164,
} from "../utils/phoneFormat";
import PhoneCountrySelect from "./PhoneCountrySelect";

const CELL_COUNT = 6;

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: () => Promise<void> | void;
  initialCountryCode: string;
  initialCallingCode: string;
  initialNationalPhone: string;
};

function CallIcon() {
  return (
    <svg
      className="phone-verify-call-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4cb6b1"
        d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.4 21 3 13.6 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.02l-2.2 2.19z"
      />
    </svg>
  );
}

export default function PhoneVerificationModal({
  open,
  onClose,
  onVerified,
  initialCountryCode,
  initialCallingCode,
  initialNationalPhone,
}: Props) {
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [callingCode, setCallingCode] = useState(initialCallingCode);
  const [nationalPhone, setNationalPhone] = useState(initialNationalPhone);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "finish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [verified, setVerified] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const okButtonRef = useRef<HTMLButtonElement>(null);
  const sentOnceRef = useRef(false);
  const verifiedRef = useRef(false);

  const e164 = toE164(nationalPhone, countryCode, callingCode);
  const displayPhone =
    sentTo || formatPhoneForDisplay(e164, countryCode) || e164;

  useEffect(() => {
    if (!open) {
      sentOnceRef.current = false;
      verifiedRef.current = false;
      return;
    }
    // Confirming refreshes the profile upstream, which changes these props.
    // Don't reset back to the code entry once we're on the success step.
    if (verifiedRef.current) return;
    setCountryCode(initialCountryCode);
    setCallingCode(initialCallingCode);
    setNationalPhone(initialNationalPhone);
    setCode("");
    setError(null);
    setHint(null);
    setSentTo("");
    setVerified(false);
    requestAnimationFrame(() => hiddenInputRef.current?.focus());

    if (sentOnceRef.current || !initialNationalPhone.trim()) return;
    sentOnceRef.current = true;

    void (async () => {
      setBusy("send");
      try {
        const target = toE164(
          initialNationalPhone,
          initialCountryCode,
          initialCallingCode,
        );
        const result = await startPhoneVerification(target);
        const shown =
          formatPhoneForDisplay(target, initialCountryCode) || target;
        setSentTo(shown);
        if (result?.devCode) setHint(`Dev code: ${result.devCode}`);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not send code",
        );
      } finally {
        setBusy(null);
      }
    })();
  }, [open, initialCountryCode, initialCallingCode, initialNationalPhone]);

  async function sendCode(silent = false) {
    if (!nationalPhone.trim()) {
      setError("Enter a phone number first.");
      return;
    }
    setBusy("send");
    setError(null);
    if (!silent) setHint(null);
    try {
      const target = toE164(nationalPhone, countryCode, callingCode);
      const result = (await startPhoneVerification(target)) as {
        devCode?: string;
      };
      const shown = formatPhoneForDisplay(target, countryCode) || target;
      setSentTo(shown);
      setCode("");
      if (result?.devCode) {
        setHint(`Dev code: ${result.devCode}`);
      } else if (!silent) {
        setHint("Verification code sent by SMS.");
      }
      hiddenInputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not send code",
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitCode(value = code) {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length !== CELL_COUNT || busy === "finish") return;
    setBusy("finish");
    setError(null);
    try {
      await finishPhoneVerification(cleaned);
      verifiedRef.current = true;
      setVerified(true);
      requestAnimationFrame(() => okButtonRef.current?.focus());
      await onVerified();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invalid code",
      );
      setCode("");
      hiddenInputRef.current?.focus();
    } finally {
      setBusy(null);
    }
  }

  const onCodeChange = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, CELL_COUNT);
    setCode(next);
    setError(null);
    if (next.length === CELL_COUNT) {
      void submitCode(next);
    }
  };

  const onDigitKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

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
        aria-labelledby="phone-verify-title"
      >
        <button
          type="button"
          className="phone-verify-close"
          aria-label="Close"
          onClick={onClose}
        >
          <img src="/close.png" alt="" />
        </button>

        {verified ? (
          <div className="phone-verify-done">
            <img
              src="/verify/phone-verified.png"
              alt=""
              className="phone-verify-done-art"
            />
            <h2 id="phone-verify-title" className="phone-verify-done-title">
              <span className="phone-verify-done-mark">Your</span> phone number
              has been verified
            </h2>
            <button
              ref={okButtonRef}
              type="button"
              className="phone-verify-continue phone-verify-done-ok"
              onClick={onClose}
            >
              Ok
            </button>
          </div>
        ) : (
          <>
            <h2 id="phone-verify-title" className="phone-verify-title">
              Phone verification
            </h2>

            <div className="phone-verify-field">
              <span className="phone-verify-label">Mobile Phone</span>
              <div className="account-mobile">
                <PhoneCountrySelect
                  countryCode={countryCode}
                  callingCode={callingCode}
                  onChange={(country: CountryCallingCode) => {
                    setCountryCode(country.cca2);
                    setCallingCode(country.callingCode);
                    setNationalPhone((prev) =>
                      formatNationalPhone(prev, country.cca2),
                    );
                  }}
                />
                <input
                  className="account-input account-mobile-phone"
                  value={nationalPhone}
                  onChange={(e) =>
                    setNationalPhone(
                      formatNationalPhone(e.target.value, countryCode),
                    )
                  }
                  placeholder={placeholderForCountry(countryCode)}
                  inputMode="tel"
                  autoComplete="tel-national"
                />
              </div>
            </div>

            <p className="phone-verify-digit-label">
              Enter {CELL_COUNT}-digit code
            </p>
            <p className="phone-verify-hint">
              We sent a code to {displayPhone || "your phone"}. Enter the code
              in that message
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
                disabled={busy === "finish"}
              />
              {Array.from({ length: CELL_COUNT }, (_, i) => {
                const char = code[i] || "";
                const active =
                  i === code.length ||
                  (i === CELL_COUNT - 1 && code.length === CELL_COUNT);
                return (
                  <button
                    key={i}
                    type="button"
                    className={
                      active
                        ? "phone-verify-digit phone-verify-digit--active"
                        : "phone-verify-digit"
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
                disabled={busy === "send"}
                onClick={() => void sendCode(false)}
              >
                {busy === "send" ? "Sending…" : "Try again"}
              </button>
            </div>

            {error ? <p className="phone-verify-error">{error}</p> : null}
            {hint ? <p className="phone-verify-success">{hint}</p> : null}

            <div className="phone-verify-actions">
              <button type="button" className="phone-verify-call" disabled>
                <CallIcon />
                Call me instead
              </button>
              <button
                type="button"
                className="phone-verify-continue"
                disabled={busy === "finish" || code.length !== CELL_COUNT}
                onClick={() => void submitCode()}
              >
                {busy === "finish" ? "Checking…" : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
