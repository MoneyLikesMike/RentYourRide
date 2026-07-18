import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import {
  finishPhoneVerification,
  patchMe,
  patchPassword,
  startEmailVerification,
  startPhoneVerification,
  type MeUser,
} from '../api/users';
import { useAuth } from '../auth/AuthContext';
import ProfileLayout from '../components/ProfileLayout';

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
    me.addressCountry ?? 'Canada',
  );
  const [phone, setPhone] = useState(me.phone ?? '');
  const [licenseNumber, setLicenseNumber] = useState(me.licenseNumber ?? '');

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setAddressLine(me.addressLine ?? '');
    setAddressCity(me.addressCity ?? '');
    setAddressCountry(me.addressCountry ?? 'Canada');
    setPhone(me.phone ?? '');
    setLicenseNumber(me.licenseNumber ?? '');
  }, [me]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await patchMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        addressLine: addressLine.trim(),
        addressCity: addressCity.trim(),
        addressCountry: addressCountry.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim(),
      });
      applyMeUser(updated);
      setMessage('Account settings saved.');
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
    setBusy('email');
    setError(null);
    setMessage(null);
    try {
      await startEmailVerification();
      setMessage('Verification email sent. Check your inbox.');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not start email verification',
      );
    } finally {
      setBusy(null);
    }
  };

  const onSendPhoneCode = async () => {
    if (!phone.trim()) {
      setError('Enter a phone number first.');
      return;
    }
    setBusy('phone-send');
    setError(null);
    setMessage(null);
    try {
      await startPhoneVerification(phone.trim());
      setPhoneCodeSent(true);
      setMessage('Verification code sent by SMS.');
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
  };

  const onFinishPhone = async () => {
    setBusy('phone-finish');
    setError(null);
    setMessage(null);
    try {
      await finishPhoneVerification(phoneCode.trim());
      setPhoneCode('');
      setPhoneCodeSent(false);
      setMessage('Phone verified.');
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Invalid code',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <form className="account-settings" onSubmit={(e) => void onSave(e)}>
      <h1 className="profile-title profile-title--bold">Account settings</h1>
      <div className="profile-rule" />

      <section className="account-block">
        <h2 className="account-block-title">Account</h2>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Email</span>
              {!me.emailVerified ? (
                <button
                  type="button"
                  className="account-action"
                  disabled={busy === 'email'}
                  onClick={() => void onVerifyEmail()}
                >
                  {busy === 'email' ? 'Sending…' : 'Verify'}
                </button>
              ) : (
                <span className="account-verified">
                  <img src="/change.png" alt="" />
                  Verified
                </span>
              )}
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
              <span className="account-label">First Name</span>
            </div>
            <input
              className="account-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
            />
          </div>
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Last Name</span>
            </div>
            <input
              className="account-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
            />
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
              placeholder="Street address"
            />
          </div>
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">City</span>
            </div>
            <input
              className="account-input"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="City"
            />
          </div>
        </div>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Country</span>
            </div>
            <input
              className="account-input"
              value={addressCountry}
              onChange={(e) => setAddressCountry(e.target.value)}
              placeholder="Country"
            />
          </div>
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">Mobile Phone</span>
              {me.phoneVerified ? (
                <span className="account-verified">
                  <img src="/change.png" alt="" />
                  Verified
                </span>
              ) : (
                <button
                  type="button"
                  className="account-action"
                  disabled={busy === 'phone-send'}
                  onClick={() => void onSendPhoneCode()}
                >
                  {busy === 'phone-send' ? 'Sending…' : 'Verify'}
                </button>
              )}
            </div>
            <input
              className="account-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1…"
            />
            {phoneCodeSent && !me.phoneVerified ? (
              <div className="account-password-panel">
                <input
                  className="account-input"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                />
                <button
                  type="button"
                  className="account-save-sm"
                  disabled={busy === 'phone-finish' || phoneCode.length < 4}
                  onClick={() => void onFinishPhone()}
                >
                  {busy === 'phone-finish' ? 'Checking…' : 'Confirm code'}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="account-row">
          <div className="account-field">
            <div className="account-field-head">
              <span className="account-label">License</span>
              {me.licenseVerified ? (
                <span className="account-verified">
                  <img src="/change.png" alt="" />
                  Verified
                </span>
              ) : (
                <span className="account-hint">
                  Complete licence verification in the mobile app
                </span>
              )}
            </div>
            <input
              className="account-input"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="License number"
            />
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
  );
}

export default function AccountSettingsPage() {
  return (
    <ProfileLayout>
      {(me, reload) => <AccountSettingsForm me={me} reload={reload} />}
    </ProfileLayout>
  );
}
