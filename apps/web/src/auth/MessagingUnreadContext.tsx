import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { conversationsUnreadCount } from '../api/messaging';
import { getNotificationSettings } from '../api/users';
import { useAuth } from './AuthContext';

const POLL_MS = 20000;
const PREFS_KEY = 'ryr_notification_prefs';

type MessagingUnreadContextValue = {
  unreadTotal: number;
  refreshUnread: () => Promise<void>;
  /** Clear local unread after marking conversations read. */
  setUnreadTotal: (n: number) => void;
};

const MessagingUnreadContext = createContext<MessagingUnreadContextValue>({
  unreadTotal: 0,
  refreshUnread: async () => {},
  setUnreadTotal: () => {},
});

function readPushPref(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return true;
    const p = JSON.parse(raw) as { pushNotif?: boolean };
    return p.pushNotif !== false;
  } catch {
    return true;
  }
}

function showDesktopNotification(unread: number) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!readPushPref()) return;
  if (document.visibilityState === 'visible') return;

  const body =
    unread === 1
      ? 'You have a new message.'
      : `You have ${unread > 99 ? '99+' : unread} unread messages.`;

  try {
    const n = new Notification('Rent Your Ride', {
      body,
      icon: '/logo.png',
      tag: 'ryr-messages-unread',
    });
    n.onclick = () => {
      window.focus();
      window.location.assign('/messages');
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function MessagingUnreadProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const prevUnreadRef = useRef<number | null>(null);
  const prefsHydratedRef = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadTotal(0);
      prevUnreadRef.current = 0;
      return;
    }
    try {
      const count = await conversationsUnreadCount();
      const prev = prevUnreadRef.current;
      setUnreadTotal(count);
      if (prev !== null && count > prev) {
        showDesktopNotification(count);
      }
      prevUnreadRef.current = count;
    } catch {
      /* ignore poll errors */
    }
  }, [isAuthenticated]);

  // Warm push pref cache from API once per session.
  useEffect(() => {
    if (!isAuthenticated || prefsHydratedRef.current) return;
    prefsHydratedRef.current = true;
    void (async () => {
      try {
        const s = await getNotificationSettings();
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            textNotif: s.textNotif !== false,
            emailNotif: s.emailNotif !== false,
            pushNotif: s.pushNotif !== false,
          }),
        );
      } catch {
        /* ignore */
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadTotal(0);
      prevUnreadRef.current = 0;
      return;
    }
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshUnread();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthenticated, refreshUnread]);

  const value = useMemo(
    () => ({ unreadTotal, refreshUnread, setUnreadTotal }),
    [unreadTotal, refreshUnread],
  );

  return (
    <MessagingUnreadContext.Provider value={value}>
      {children}
    </MessagingUnreadContext.Provider>
  );
}

export function useMessagingUnread() {
  return useContext(MessagingUnreadContext);
}

export async function requestDesktopNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
