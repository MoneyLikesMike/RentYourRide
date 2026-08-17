import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/http';
import {
  getNotificationSettings,
  patchNotificationSettings,
  type NotificationSettings,
} from '../api/users';
import {
  requestDesktopNotificationPermission,
} from '../auth/MessagingUnreadContext';
import ProfileLayout from '../components/ProfileLayout';

const PREFS_KEY = 'ryr_notification_prefs';

const DEFAULTS: NotificationSettings = {
  textNotif: true,
  emailNotif: true,
  pushNotif: true,
};

function persistLocal(settings: NotificationSettings) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="notif-section">
      <div className="notif-section-head">
        <h2 className="notif-section-title">{title}</h2>
        <label className="notif-switch">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-label={title}
          />
          <span className="notif-switch-track" aria-hidden />
        </label>
      </div>
      <p className="notif-section-copy">{description}</p>
    </div>
  );
}

function NotificationsBody() {
  const [textNotif, setTextNotif] = useState(DEFAULTS.textNotif);
  const [emailNotif, setEmailNotif] = useState(DEFAULTS.emailNotif);
  const [pushNotif, setPushNotif] = useState(DEFAULTS.pushNotif);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desktopHint, setDesktopHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Partial<NotificationSettings>;
          if (typeof p.textNotif === 'boolean') setTextNotif(p.textNotif);
          if (typeof p.emailNotif === 'boolean') setEmailNotif(p.emailNotif);
          if (typeof p.pushNotif === 'boolean') setPushNotif(p.pushNotif);
        }
      } catch {
        /* keep defaults */
      }

      try {
        const s = await getNotificationSettings();
        if (cancelled) return;
        const next = {
          textNotif: s.textNotif !== false,
          emailNotif: s.emailNotif !== false,
          pushNotif: s.pushNotif !== false,
        };
        setTextNotif(next.textNotif);
        setEmailNotif(next.emailNotif);
        setPushNotif(next.pushNotif);
        persistLocal(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load notification settings',
          );
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pushRemote = useCallback(
    async (t: boolean, e: boolean, p: boolean) => {
      const next = { textNotif: t, emailNotif: e, pushNotif: p };
      persistLocal(next);
      try {
        await patchNotificationSettings(next);
        setError(null);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not save settings',
        );
      }
    },
    [],
  );

  const onPushChange = async (v: boolean) => {
    setPushNotif(v);
    setDesktopHint(null);
    if (v) {
      const perm = await requestDesktopNotificationPermission();
      if (perm === 'granted') {
        setDesktopHint('Desktop notifications are enabled in this browser.');
      } else if (perm === 'denied') {
        setDesktopHint(
          'Browser blocked notifications. Enable them in your browser settings to get desktop alerts.',
        );
      } else if (perm === 'unsupported') {
        setDesktopHint(
          'This browser does not support desktop notifications. Push still applies on the mobile app.',
        );
      }
    }
    await pushRemote(textNotif, emailNotif, v);
  };

  if (!loaded) {
    return <p className="profile-status">Loading notifications…</p>;
  }

  return (
    <div className="notif-page">
      <h1 className="notif-title">Notifications</h1>
      <div className="notif-rule" />

      {error ? <p className="notif-error">{error}</p> : null}

      <ToggleRow
        title="Text notifications"
        description="Receive important messages like booking requests, booking reminders, approvals, and messages from hosts or guests. These will be sent directly to your phone through text message."
        checked={textNotif}
        onChange={(v) => {
          setTextNotif(v);
          void pushRemote(v, emailNotif, pushNotif);
        }}
      />
      <div className="notif-divider" />
      <ToggleRow
        title="Email notifications"
        description="Receive important messages like booking requests, booking reminders, approvals, and messages from hosts or guests. These will be sent directly to you through email."
        checked={emailNotif}
        onChange={(v) => {
          setEmailNotif(v);
          void pushRemote(textNotif, v, pushNotif);
        }}
      />
      <div className="notif-divider" />
      <ToggleRow
        title="Push notifications"
        description="Receive important alerts like booking requests, reminders, approvals, and new messages as desktop notifications in this browser, and as push on the RentYourRide app."
        checked={pushNotif}
        onChange={(v) => {
          void onPushChange(v);
        }}
      />
      {desktopHint ? <p className="notif-hint">{desktopHint}</p> : null}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProfileLayout title="Notifications">
      {() => <NotificationsBody />}
    </ProfileLayout>
  );
}
