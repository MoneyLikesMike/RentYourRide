import { useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/** sessionStorage key for a pending referral code (applied under RYRA-100). */
export const REFERRAL_CODE_STORAGE_KEY = 'ryr_referral_code';

function storeReferralCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(REFERRAL_CODE_STORAGE_KEY, trimmed);
  } catch {
    // Private mode / blocked storage — query param on signup still carries it.
  }
}

/**
 * Minimal landing for shared referral / invite links.
 * Keeps the code (sessionStorage + signup ?ref=) so it is not dropped by the
 * catch-all. Full credit apply-on-signup is RYRA-100.
 */
export default function ReferralLandingPage() {
  const { code: pathCode } = useParams<{ code?: string }>();
  const [params] = useSearchParams();
  const code = (pathCode || params.get('code') || params.get('ref') || '').trim();

  useEffect(() => {
    if (code) storeReferralCode(code);
  }, [code]);

  if (!code) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <Navigate
      to={`/signup?ref=${encodeURIComponent(code)}`}
      replace
    />
  );
}
