/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Google OAuth Web client ID (GIS). Defaults to mobile Nest web client. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Apple Sign in with Apple Services ID (web) */
  readonly VITE_APPLE_CLIENT_ID?: string;
  /** Must match a Return URL registered for the Services ID */
  readonly VITE_APPLE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
