import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import {
  patchMe,
  patchPassword,
  type MeUser,
} from '../api/users';
import { useAuth } from '../auth/AuthContext';
import EmailVerificationModal from '../components/EmailVerificationModal';
import LicenseVerificationModal from '../components/LicenseVerificationModal';
import PhoneCountrySelect, {
  detectCountryFromE164,
  nationalFromE164,
} from '../components/PhoneCountrySelect';
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
  const [addressCountry, setAddressCountry] = useState(
    me.addressCountry || 'Canada',
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

  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(false);
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
    setAddressCountry(me.addressCountry || 'Canada');
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
      const updated = await patchMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        addressLine: addressLine.trim(),
        addressCity: addressCity.trim(),
        addressCountry: addressCountry.trim(),
        phone: phoneE164,
        licenseNumber: licenseNumber.trim(),
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

  const onOpenEmailVerify = () => {
    setError(null);
    setMessage(null);
    setShowEmailVerify(true);
  };

  const onOpenPhoneVerify = () => {
    setError(null);
    setMessage(null);
    setShowPhoneVerify(true);
  };

  const googleConnected = !!me.googleConnected;

  return (
    <form className="account-settings" onSubmit={(e) => void onSave(e)}>
      <h1 className="profile-title profile-title--bold">Contact information</h1>
      <div className="profile-rule" />

      <section className="account-block">
        <h2 className="account-block-title">Account</h2>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Email</span>
              <button
                type="button"
                className="account-action account-action--icon"
                onClick={onOpenEmailVerify}
              >
                <img src="/change.png" alt="" />
                Change
              </button>
            </div>
            <input
              className="account-input"
              value={me.email}
              readOnly
              disabled
            />
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
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Address</span>
            </div>
            <input
              className="account-input"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="Address"
            />
            <input
              className="account-input account-input--secondary"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="City"
              aria-label="City"
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
                    'pending_review' ||
                  (me.licenseVerificationStatus || '').trim() === 'in_progress'
                    ? 'View status'
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

      <EmailVerificationModal
        open={showEmailVerify}
        onClose={() => setShowEmailVerify(false)}
        onVerified={async () => {
          setMessage('Email verified.');
          await reload();
        }}
        email={me.email}
      />

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
    </form>
  );
}

export default function AccountSettingsPage() {
  return (
    <ProfileLayout title="Contact information">
      {(me, reload) => <AccountSettingsForm me={me} reload={reload} />}
    </ProfileLayout>
  );
}
