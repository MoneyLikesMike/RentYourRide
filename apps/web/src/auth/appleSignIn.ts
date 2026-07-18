export type AppleSignInResult = {
  identityToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type AppleAuthResponse = {
  authorization: {
    id_token: string;
    code: string;
    state?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
};

type AppleIDAuth = {
  init: (config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    state?: string;
    usePopup?: boolean;
  }) => void;
  signIn: () => Promise<AppleAuthResponse>;
};

declare global {
  interface Window {
    AppleID?: { auth: AppleIDAuth };
  }
}

const SCRIPT_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

let scriptPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Apple Sign In')),
      );
      if (window.AppleID?.auth) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Apple Sign In'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function getAppleClientId(): string {
  return import.meta.env.VITE_APPLE_CLIENT_ID?.trim() || '';
}

export function getAppleRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_APPLE_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return window.location.origin;
}

export function isAppleSignInConfigured(): boolean {
  return !!getAppleClientId();
}

/**
 * Opens Apple's Sign in with Apple popup (web Services ID).
 * Name/email are only returned the first time the user authorizes.
 */
export async function signInWithAppleWeb(): Promise<AppleSignInResult> {
  const clientId = getAppleClientId();
  if (!clientId) {
    throw new Error(
      'Apple Sign In is not configured (set VITE_APPLE_CLIENT_ID).',
    );
  }

  await loadAppleScript();
  if (!window.AppleID?.auth) {
    throw new Error('Apple Sign In failed to initialize');
  }

  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI: getAppleRedirectUri(),
    usePopup: true,
  });

  let response: AppleAuthResponse;
  try {
    response = await window.AppleID.auth.signIn();
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'error' in err
        ? String((err as { error: unknown }).error)
        : '';
    if (code === 'popup_closed_by_user' || code === 'user_cancelled_authorize') {
      const cancel = new Error('Apple sign-in was cancelled');
      (cancel as Error & { code?: string }).code = 'CANCELLED';
      throw cancel;
    }
    throw err instanceof Error ? err : new Error('Apple sign-in failed');
  }

  const identityToken = response.authorization?.id_token;
  if (!identityToken) {
    throw new Error('Apple Sign-In did not return an identity token');
  }

  return {
    identityToken,
    email: response.user?.email?.trim().toLowerCase() || undefined,
    firstName: response.user?.name?.firstName?.trim() || undefined,
    lastName: response.user?.name?.lastName?.trim() || undefined,
  };
}

export function isAppleSignInCancellation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (err as { code?: string }).code === 'CANCELLED';
}
