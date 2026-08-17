/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN: string;
  /** Optional separate API for Studio-managed articles and team members. */
  readonly VITE_STUDIO_API_ORIGIN?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Google OAuth Web client ID (GIS). Defaults to mobile Nest web client. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Apple Sign in with Apple Services ID (web) */
  readonly VITE_APPLE_CLIENT_ID?: string;
  /** Must match a Return URL registered for the Services ID */
  readonly VITE_APPLE_REDIRECT_URI?: string;
  /** Crisp chatbox Website ID */
  readonly VITE_CRISP_WEBSITE_ID?: string;
  /**
   * Browser key for the Google Maps JavaScript API. Must be HTTP-referrer
   * restricted. Without it the search page falls back to an OpenStreetMap embed.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Optional Google Cloud Map ID for custom map styling. */
  readonly VITE_GOOGLE_MAPS_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
