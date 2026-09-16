export type GoogleSignInResult = {
  idToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type CredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: (momentListener?: (notification: {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
    getNotDisplayedReason: () => string;
    getSkippedReason: () => string;
    getDismissedReason: () => string;
  }) => void) => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number>,
  ) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/** Same default web client as mobile (`constants/socialAuth.js`). */
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '72018389432-1u5ekal6enkntlov1q2rdjn2kij823qr.apps.googleusercontent.com';

let scriptPromise: Promise<void> | null = null;
let pending:
  | {
      resolve: (value: GoogleSignInResult) => void;
      reject: (reason?: unknown) => void;
    }
  | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Sign In')),
      );
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Sign In'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function getGoogleClientId(): string {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    DEFAULT_GOOGLE_WEB_CLIENT_ID
  );
}

export function isGoogleSignInConfigured(): boolean {
  return !!getGoogleClientId();
}

function parseJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function credentialToResult(credential: string): GoogleSignInResult {
  const payload = parseJwtPayload(credential);
  const email =
    typeof payload?.email === 'string'
      ? payload.email.trim().toLowerCase()
      : undefined;
  const firstName =
    typeof payload?.given_name === 'string'
      ? payload.given_name.trim()
      : undefined;
  const lastName =
    typeof payload?.family_name === 'string'
      ? payload.family_name.trim()
      : undefined;
  return { idToken: credential, email, firstName, lastName };
}

function ensureInitialized(clientId: string): void {
  if (!window.google?.accounts?.id) {
    throw new Error('Google Sign In failed to initialize');
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response) => {
      const pendingCb = pending;
      pending = null;
      if (!pendingCb) return;
      if (!response.credential) {
        pendingCb.reject(new Error('Google did not return an ID token'));
        return;
      }
      pendingCb.resolve(credentialToResult(response.credential));
    },
  });
}

/**
 * Sign in with Google via Identity Services (returns Nest-ready idToken JWT).
 */
export async function signInWithGoogleWeb(): Promise<GoogleSignInResult> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      'Google Sign In is not configured (set VITE_GOOGLE_CLIENT_ID).',
    );
  }

  await loadGoogleScript();
  ensureInitialized(clientId);

  return new Promise<GoogleSignInResult>((resolve, reject) => {
    if (pending) {
      pending.reject(new Error('Google sign-in already in progress'));
    }
    pending = { resolve, reject };

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    document.body.appendChild(host);

    const cleanup = () => {
      host.remove();
    };

    try {
      window.google!.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 280,
      });

      const btn =
        host.querySelector<HTMLElement>('div[role="button"]') ||
        host.querySelector<HTMLElement>('button') ||
        host.firstElementChild;

      if (!btn) {
        cleanup();
        pending = null;
        reject(new Error('Google Sign In button failed to render'));
        return;
      }

      // Allow GIS to finish attaching handlers, then open the chooser.
      requestAnimationFrame(() => {
        try {
          (btn as HTMLElement).click();
        } catch (err) {
          cleanup();
          pending = null;
          reject(err instanceof Error ? err : new Error('Google sign-in failed'));
          return;
        }
        // Keep host briefly so the popup can attach; then remove.
        window.setTimeout(cleanup, 2000);
      });
    } catch (err) {
      cleanup();
      pending = null;
      reject(err instanceof Error ? err : new Error('Google sign-in failed'));
    }

    // If the user closes the popup without completing, GIS may not call back.
    window.setTimeout(() => {
      if (pending?.resolve === resolve) {
        pending = null;
        const cancel = new Error('Google sign-in was cancelled');
        (cancel as Error & { code?: string }).code = 'CANCELLED';
        reject(cancel);
      }
    }, 120_000);
  });
}

export function isGoogleSignInCancellation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (err as { code?: string }).code === 'CANCELLED';
}
