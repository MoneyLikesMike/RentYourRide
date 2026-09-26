import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import {
  getDeletionEligibility,
  deleteMyAccount,
  patchMe,
  patchPassword,
  startEmailVerification,
  startEmailChange,
  type AccountDeletionEligibility,
  type MeUser,
} from '../api/users';
import { useAuth } from '../auth/AuthContext';
import {
  isAppleSignInCancellation,
  isAppleSignInConfigured,
  signInWithAppleWeb,
} from '../auth/appleSignIn';
import {
  isGoogleSignInCancellation,
  isGoogleSignInConfigured,
  signInWithGoogleWeb,
} from '../auth/googleSignIn';
import LicenseVerificationModal from '../components/LicenseVerificationModal';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import PhoneCountrySelect, {
  detectCountryFromE164,
  nationalFromE164,
} from '../components/PhoneCountrySelect';
import { OTP_ALLOWED_COUNTRY_CODES } from '../data/otpAllowedCountries';
import PhoneVerificationModal from '../components/PhoneVerificationModal';
import ProfileLayout from '../components/ProfileLayout';
import {
  formatNationalPhone,
  placeholderForCountry,
  toE164,
} from '../utils/phoneFormat';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatAddressDisplay(parts: {
  addressLine?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
}) {
  return [
    parts.addressLine,
    parts.addressCity,
    parts.addressProvince,
    parts.addressPostalCode,
    parts.addressCountry,
  ]
    .map((p) => (p && String(p).trim()) || '')
    .filter(Boolean)
    .join(', ');
}

function yearOptions() {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now - 18; y >= now - 100; y -= 1) years.push(y);
  return years;
}

function AccountSettingsForm({
  me,
  reload,
}: {
  me: MeUser;
  reload: () => Promise<void>;
}) {
  const { applyMeUser } = useAuth();

  const [firstName, setFirstName] = useState(me.firstName ?? '');
  const [lastName, setLastName] = useState(me.lastName ?? '');
  const [addressLine, setAddressLine] = useState(me.addressLine ?? '');
  const [addressCity, setAddressCity] = useState(me.addressCity ?? '');
  const [addressProvince, setAddressProvince] = useState(
    me.addressProvince ?? '',
  );
  const [addressPostalCode, setAddressPostalCode] = useState(
    me.addressPostalCode ?? '',
  );
  const [addressCountry, setAddressCountry] = useState(
    me.addressCountry || 'Canada',
  );
  const [addressDisplay, setAddressDisplay] = useState(() =>
    formatAddressDisplay(me),
  );
  const initialPhoneCountry = detectCountryFromE164(me.phone);
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    initialPhoneCountry.cca2,
  );
  const [phoneCallingCode, setPhoneCallingCode] = useState(
    initialPhoneCountry.callingCode,
  );
  const [phone, setPhone] = useState(
    formatNationalPhone(
      nationalFromE164(me.phone, initialPhoneCountry.callingCode),
      initialPhoneCountry.cca2,
    ),
  );
  const [licenseNumber, setLicenseNumber] = useState(me.licenseNumber ?? '');

  // Birthday is UI-only until the API stores birthDate.
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [showLicenseVerify, setShowLicenseVerify] = useState(false);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const years = useMemo(() => yearOptions(), []);
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1)),
    [],
  );

  useEffect(() => {
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setAddressLine(me.addressLine ?? '');
    setAddressCity(me.addressCity ?? '');
    setAddressProvince(me.addressProvince ?? '');
    setAddressPostalCode(me.addressPostalCode ?? '');
    setAddressCountry(me.addressCountry || 'Canada');
    setAddressDisplay(formatAddressDisplay(me));
    const detected = detectCountryFromE164(me.phone);
    setPhoneCountryCode(detected.cca2);
    setPhoneCallingCode(detected.callingCode);
    setPhone(
      formatNationalPhone(
        nationalFromE164(me.phone, detected.callingCode),
        detected.cca2,
      ),
    );
    setLicenseNumber(me.licenseNumber ?? '');
  }, [me]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const phoneE164 = phone.trim()
        ? toE164(phone, phoneCountryCode, phoneCallingCode)
        : '';
      const currentPhone = (me.phone ?? '').trim();
      const currentLicense = (me.licenseNumber ?? '').trim();
      const nextLicense = licenseNumber.trim();
      // Omit phone/license when unchanged so a Save after OTP cannot
      // re-send them and race the API (verification is cleared only on change).
      const updated = await patchMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        addressLine: addressLine.trim() || addressDisplay.trim(),
        addressCity: addressCity.trim(),
        addressProvince: addressProvince.trim(),
        addressPostalCode: addressPostalCode.trim(),
        addressCountry: addressCountry.trim(),
        ...(phoneE164 !== currentPhone ? { phone: phoneE164 } : {}),
        ...(nextLicense !== currentLicense
          ? { licenseNumber: nextLicense }
          : {}),
      });
      applyMeUser(updated);
      setMessage('Contact information saved.');
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
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setBusy('password');
    setError(null);
    setMessage(null);
    try {
      await patchPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setShowPassword(false);
      setMessage('Password updated.');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not change password',
      );
    } finally {
      setBusy(null);
    }
  };

  const onVerifyEmail = async () => {
    setError(null);
    setMessage(null);
    setBusy('email-verify');
    try {
      const result = await startEmailVerification();
      if (result?.alreadyVerified) {
        setMessage('Email is already verified.');
        await reload();
        return;
      }
      setMessage(
        `Verification email sent to ${me.email}. Open the link in that email to verify.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not send verification email',
      );
    } finally {
      setBusy(null);
    }
  };

  const onChangeEmail = async () => {
    setError(null);
    setMessage(null);
    const next = newEmail.trim();
    if (!next || !next.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy('email-change');
    try {
      await startEmailChange(next);
      setShowChangeEmail(false);
      setNewEmail('');
      setMessage(
        `Confirmation email sent to ${next}. Open the link in that email, then tap Ok to finish.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not start email change',
      );
    } finally {
      setBusy(null);
    }
  };

  const onOpenPhoneVerify = () => {
    setError(null);
    setMessage(null);
    setShowPhoneVerify(true);
  };

  const googleConnected = !!me.googleConnected;

  return (
    <>
    <form className="account-settings" onSubmit={(e) => void onSave(e)}>
      <h1 className="profile-title profile-title--bold">Contact information</h1>
      <div className="profile-rule" />

      <section className="account-block">
        <h2 className="account-block-title">Account</h2>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Email</span>
              <div className="account-field-actions">
                {me.emailVerified ? (
                  <div className="account-verified">
                    <img src="/profile/check.png" alt="" />
                    Verified
                  </div>
                ) : (
                  <button
                    type="button"
                    className="account-action"
                    disabled={busy === 'email-verify'}
                    onClick={() => void onVerifyEmail()}
                  >
                    {busy === 'email-verify' ? 'Sending…' : 'Verify'}
                  </button>
                )}
                <button
                  type="button"
                  className="account-action"
                  onClick={() => {
                    setShowChangeEmail((v) => !v);
                    setNewEmail('');
                    setError(null);
                  }}
                >
                  Change
                </button>
              </div>
            </div>
            <input
              className="account-input"
              value={me.email}
              readOnly
              disabled
            />
            {showChangeEmail ? (
              <div className="account-password-panel">
                <p className="account-note">
                  We will send a link to your new email address to verify it.
                </p>
                <input
                  className="account-input"
                  type="email"
                  placeholder="New email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                />
                <button
                  type="button"
                  className="account-save"
                  disabled={busy === 'email-change'}
                  onClick={() => void onChangeEmail()}
                >
                  {busy === 'email-change' ? 'Sending…' : 'Done'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Password</span>
              <button
                type="button"
                className="account-action"
                onClick={() => setShowPassword((v) => !v)}
              >
                Change password
              </button>
            </div>
            <input
              className="account-input"
              type="password"
              value="••••••••"
              readOnly
              disabled
            />
            {showPassword ? (
              <div className="account-password-panel">
                <input
                  className="account-input"
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <input
                  className="account-input"
                  type="password"
                  placeholder="New password (min 8)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="account-save-sm"
                  disabled={
                    busy === 'password' ||
                    !currentPassword ||
                    newPassword.length < 8
                  }
                  onClick={() => void onChangePassword()}
                >
                  {busy === 'password' ? 'Updating…' : 'Update password'}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">First name</span>
            </div>
            <input
              className="account-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Last name</span>
            </div>
            <input
              className="account-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="account-row account-row--date">
          <div className="account-field account-field--month">
            <div className="account-field-head">
              <span className="account-label">Month</span>
            </div>
            <select
              className="account-input account-select"
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              aria-label="Birth month"
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="account-field account-field--day">
            <div className="account-field-head">
              <span className="account-label">Day</span>
            </div>
            <select
              className="account-input account-select"
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              aria-label="Birth day"
            >
              <option value="">Day</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="account-field account-field--year">
            <div className="account-field-head">
              <span className="account-label">Year</span>
            </div>
            <select
              className="account-input account-select"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              aria-label="Birth year"
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="profile-rule profile-rule--grey" />

      <section className="account-block">
        <h2 className="account-block-title">Profile</h2>

        <div className="account-row">
          <div className="account-field account-field--address">
            <div className="account-field-head">
              <span className="account-label">Address</span>
            </div>
            <PlacesAutocomplete
              value={addressDisplay}
              onChange={setAddressDisplay}
              showLabel={false}
              placeholder="Street address, city…"
              onPlaceSelected={(place) => {
                const street =
                  place.street ||
                  place.query?.split(',')[0]?.trim() ||
                  place.query ||
                  '';
                setAddressLine(street);
                setAddressCity(place.city || '');
                setAddressProvince(place.region || '');
                setAddressPostalCode(place.postalCode || '');
                setAddressCountry(place.country || '');
                setAddressDisplay(
                  place.query ||
                    formatAddressDisplay({
                      addressLine: street,
                      addressCity: place.city,
                      addressProvince: place.region,
                      addressPostalCode: place.postalCode,
                      addressCountry: place.country,
                    }),
                );
              }}
            />
          </div>

          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Mobile Phone</span>
              {me.phoneVerified ? (
                <button
                  type="button"
                  className="account-action account-action--icon"
                  onClick={onOpenPhoneVerify}
                >
                  <img src="/change.png" alt="" />
                  Change
                </button>
              ) : (
                <button
                  type="button"
                  className="account-action"
                  onClick={onOpenPhoneVerify}
                >
                  Verify
                </button>
              )}
            </div>
            <div className="account-mobile">
              <PhoneCountrySelect
                countryCode={phoneCountryCode}
                callingCode={phoneCallingCode}
                allowedCca2={OTP_ALLOWED_COUNTRY_CODES}
                onChange={(country) => {
                  setPhoneCountryCode(country.cca2);
                  setPhoneCallingCode(country.callingCode);
                  setPhone((prev) =>
                    formatNationalPhone(prev, country.cca2),
                  );
                }}
              />
              <input
                className="account-input account-mobile-phone"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    formatNationalPhone(e.target.value, phoneCountryCode),
                  )
                }
                placeholder={placeholderForCountry(phoneCountryCode)}
                inputMode="tel"
                autoComplete="tel-national"
              />
            </div>
          </div>
        </div>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">License</span>
              {me.licenseVerified ? (
                <button
                  type="button"
                  className="account-action account-action--icon"
                  onClick={() => setShowLicenseVerify(true)}
                >
                  <img src="/change.png" alt="" />
                  Change
                </button>
              ) : (
                <button
                  type="button"
                  className="account-action"
                  onClick={() => setShowLicenseVerify(true)}
                >
                  {(me.licenseVerificationStatus || '').trim() ===
                  'pending_review'
                    ? 'View status'
                    : (me.licenseVerificationStatus || '').trim() ===
                          'in_progress' ||
                        (me.licenseVerificationStatus || '').trim() ===
                          'awaiting_user'
                      ? 'Try again'
                      : 'Verify'}
                </button>
              )}
            </div>
            {me.licenseVerified ? (
              <div className="account-verified account-verified--row">
                <img src="/profile/check.png" alt="" />
                <span>Verified</span>
              </div>
            ) : (
              <input
                className="account-input"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="License number"
              />
            )}
          </div>
        </div>
      </section>

      <div className="profile-rule profile-rule--grey" />

      <section className="account-block">
        <h2 className="account-block-title">Social</h2>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Facebook</span>
              <button type="button" className="account-action" disabled>
                Connect
              </button>
            </div>
            <div className="account-verified account-verified--row">
              <span>Not connected</span>
            </div>
          </div>

          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Google</span>
              <button type="button" className="account-action" disabled>
                {googleConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
            <div className="account-verified account-verified--row">
              {googleConnected ? (
                <>
                  <img src="/profile/check.png" alt="" />
                  <span>Connected</span>
                </>
              ) : (
                <span>Not connected</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="profile-rule" />

      {error ? <p className="profile-error">{error}</p> : null}
      {message ? <p className="profile-success">{message}</p> : null}

      <button type="submit" className="account-save" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>

      <DeleteAccountSection me={me} />

      <LicenseVerificationModal
        open={showLicenseVerify}
        onClose={() => setShowLicenseVerify(false)}
        me={me}
        reload={reload}
      />

      <PhoneVerificationModal
        open={showPhoneVerify}
        onClose={() => setShowPhoneVerify(false)}
        onVerified={async () => {
          setMessage('Phone verified.');
          await reload();
        }}
        initialCountryCode={phoneCountryCode}
        initialCallingCode={phoneCallingCode}
        initialNationalPhone={phone}
      />
    </>
  );
}

function DeleteAccountSection({ me }: { me: MeUser }) {
  const { signOut } = useAuth();
  const [eligibility, setEligibility] = useState<AccountDeletionEligibility | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getDeletionEligibility();
        if (!cancelled) setEligibility(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not check whether this account can be deleted.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPassword = !!(eligibility?.hasPassword ?? me.hasPassword);
  const googleConnected = !!(eligibility?.googleConnected ?? me.googleConnected);
  const appleConnected = !!(eligibility?.appleConnected ?? me.appleConnected);

  const runDelete = async (creds: {
    password?: string;
    googleIdToken?: string;
    appleIdentityToken?: string;
  }) => {
    const ok = window.confirm(
      'Your account will be deactivated now and permanently deleted after 30 days. Sign in during those 30 days to cancel. Continue?',
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount(creds);
      signOut();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      const blockers =
        body && typeof body === 'object' && 'blockers' in body
          ? (body as AccountDeletionEligibility).blockers
          : null;
      if (Array.isArray(blockers) && blockers.length) {
        setEligibility({ canDelete: false, blockers });
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not delete your account. Try again.',
      );
      setDeleting(false);
    }
  };

  const onPasswordDelete = () => {
    if (!password.trim()) {
      setError('Enter your password to continue.');
      return;
    }
    void runDelete({ password: password.trim() });
  };

  const onGoogleDelete = async () => {
    setError(null);
    if (!isGoogleSignInConfigured()) {
      setError('Google Sign In is not configured.');
      return;
    }
    try {
      const google = await signInWithGoogleWeb();
      await runDelete({ googleIdToken: google.idToken });
    } catch (err) {
      if (isGoogleSignInCancellation(err)) return;
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Google sign-in failed.',
      );
    }
  };

  const onAppleDelete = async () => {
    setError(null);
    if (!isAppleSignInConfigured()) {
      setError('Apple Sign In is not configured.');
      return;
    }
    try {
      const apple = await signInWithAppleWeb();
      await runDelete({ appleIdentityToken: apple.identityToken });
    } catch (err) {
      if (isAppleSignInCancellation(err)) return;
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Apple sign-in failed.',
      );
    }
  };

  return (
    <section className="account-delete">
      <h2 className="account-delete-title">Delete account</h2>
      <p className="account-delete-copy">
        For security, you must sign in again before we start deletion. Your
        account is deactivated immediately, then permanently deleted after 30
        days. Sign back in during those 30 days to cancel. Guest and host
        profiles are part of the same account and will both be removed. You
        cannot delete your account while you have an active or upcoming trip,
        or an outstanding balance.
      </p>
      {loading ? <p className="account-delete-copy">Checking your account…</p> : null}
      {error ? <p className="profile-error">{error}</p> : null}
      {eligibility?.blockers?.map((blocker) => (
        <div key={blocker.code} className="account-delete-blocker">
          <strong>{blocker.title}</strong>
          <p>{blocker.detail}</p>
        </div>
      ))}
      {eligibility?.canDelete && hasPassword ? (
        <div className="account-delete-reauth">
          <label className="account-label" htmlFor="delete-account-password">
            Password
          </label>
          <input
            id="delete-account-password"
            className="account-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="account-delete-btn"
            onClick={onPasswordDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      ) : null}
      {eligibility?.canDelete && googleConnected ? (
        <button
          type="button"
          className="account-delete-social"
          onClick={() => void onGoogleDelete()}
          disabled={deleting}
        >
          Sign in with Google to delete
        </button>
      ) : null}
      {eligibility?.canDelete && appleConnected ? (
        <button
          type="button"
          className="account-delete-social"
          onClick={() => void onAppleDelete()}
          disabled={deleting}
        >
          Sign in with Apple to delete
        </button>
      ) : null}
    </section>
  );
}

export default function AccountSettingsPage() {
  return (
    <ProfileLayout title="Contact information">
      {(me, reload) => <AccountSettingsForm me={me} reload={reload} />}
    </ProfileLayout>
  );
}
