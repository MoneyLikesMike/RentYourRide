import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import {
  identifyCrispUser,
  resetCrispSession,
} from '../services/crispChat';

/**
 * Identifies signed-in users with Crisp and resets on logout.
 * Does NOT call configureCrisp on mount — that native call has crashed TF cold starts.
 * Configure happens lazily when the user opens Help / Contact Us chat.
 */
export default function CrispSession() {
  const { isReady, isAuthenticated, user } = useAuth();
  const { firstName, lastName, photoUri } = useUserProfile();
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;

    if (isAuthenticated && user) {
      hadSessionRef.current = true;
      const nickname =
        [firstName, lastName].map((s) => (s ?? '').trim()).filter(Boolean).join(' ') ||
        [user.firstName, user.lastName].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
      // No-op until Crisp has been configured via openCrispChat.
      identifyCrispUser({
        id: user.id,
        email: user.email,
        nickname,
        avatarUrl: photoUri,
      });
      return;
    }

    if (hadSessionRef.current) {
      hadSessionRef.current = false;
      resetCrispSession();
    }
  }, [
    isReady,
    isAuthenticated,
    user?.id,
    user?.email,
    user?.firstName,
    user?.lastName,
    firstName,
    lastName,
    photoUri,
  ]);

  return null;
}
