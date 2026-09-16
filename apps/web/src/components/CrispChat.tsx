import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

const SCRIPT_SRC = 'https://client.crisp.chat/l.js';

function crispWebsiteId(): string {
  return import.meta.env.VITE_CRISP_WEBSITE_ID?.trim() || '';
}

export function isCrispConfigured(): boolean {
  return Boolean(crispWebsiteId());
}

/** Open the Crisp chatbox (no-op if Crisp isn’t loaded yet). */
export function openCrispChat(): void {
  if (!isCrispConfigured()) return;
  window.$crisp = window.$crisp || [];
  window.$crisp.push(['do', 'chat:open']);
}

function pushCrisp(...args: unknown[]) {
  window.$crisp = window.$crisp || [];
  window.$crisp.push(args);
}

/**
 * Loads the Crisp chat widget once website-wide when VITE_CRISP_WEBSITE_ID is set.
 * Syncs nickname / email for signed-in users.
 */
export default function CrispChat() {
  const { user, isAuthenticated } = useAuth();
  const websiteId = crispWebsiteId();

  useEffect(() => {
    if (!websiteId || typeof document === 'undefined') return;

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = websiteId;

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [websiteId]);

  useEffect(() => {
    if (!websiteId || !isAuthenticated || !user) return;

    const nickname =
      user.fullName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (nickname) {
      pushCrisp('set', 'user:nickname', [nickname]);
    }
    if (user.email) {
      pushCrisp('set', 'user:email', [user.email]);
    }
    if (user.avatarUrl) {
      pushCrisp('set', 'user:avatar', [user.avatarUrl]);
    }
    if (user.phone) {
      pushCrisp('set', 'user:phone', [user.phone]);
    }
  }, [
    websiteId,
    isAuthenticated,
    user?.email,
    user?.fullName,
    user?.firstName,
    user?.lastName,
    user?.avatarUrl,
    user?.phone,
  ]);

  return null;
}
