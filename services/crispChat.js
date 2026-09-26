import { Linking } from 'react-native';
import { getCrispWebsiteId, isCrispConfigured } from '../constants/crisp';

const SUPPORT_MAILTO =
  'mailto:support@rentyourride.ca?subject=' +
  encodeURIComponent('Rent Your Ride - Support');

let configured = false;

function loadSdk() {
  return require('crisp-sdk-react-native');
}

/**
 * Lazy configure — never call from cold-start App mount.
 * Native CrispSDK.configure has aborted TestFlight launches when run at boot.
 */
export function configureCrisp() {
  if (!isCrispConfigured() || configured) return;
  try {
    const { configure, setSessionSegments } = loadSdk();
    configure(getCrispWebsiteId());
    setSessionSegments(['mobile-app'], true);
    configured = true;
  } catch (err) {
    console.warn('[Crisp] configure failed', err?.message || err);
  }
}

export function identifyCrispUser({ id, email, nickname, phone, avatarUrl } = {}) {
  if (!isCrispConfigured()) return;
  // Only identify after a successful configure (Help/chat or explicit call).
  if (!configured) return;
  try {
    const {
      setTokenId,
      setUserEmail,
      setUserNickname,
      setUserPhone,
      setUserAvatar,
    } = loadSdk();
    if (id) setTokenId(String(id));
    if (email) setUserEmail(String(email).trim());
    if (nickname) setUserNickname(String(nickname).trim());
    if (phone) setUserPhone(String(phone).trim());
    if (avatarUrl) setUserAvatar(String(avatarUrl).trim());
  } catch (err) {
    console.warn('[Crisp] identify failed', err?.message || err);
  }
}

export function resetCrispSession() {
  if (!isCrispConfigured() || !configured) return;
  try {
    loadSdk().resetSession();
  } catch (err) {
    console.warn('[Crisp] reset failed', err?.message || err);
  }
}

/**
 * Opens native Crisp chat. Falls back to email if the SDK isn’t linked yet.
 * @param {{ topic?: string, note?: string }} [opts]
 */
export function openCrispChat(opts = {}) {
  if (!isCrispConfigured()) {
    Linking.openURL(SUPPORT_MAILTO).catch(() => {});
    return;
  }
  try {
    configureCrisp();
    const { setSessionString, openChat, show } = loadSdk();
    if (opts.topic) setSessionString('topic', String(opts.topic));
    if (opts.note) setSessionString('note', String(opts.note));
    if (typeof openChat === 'function') openChat();
    else show();
  } catch (err) {
    console.warn('[Crisp] open failed', err?.message || err);
    Linking.openURL(SUPPORT_MAILTO).catch(() => {});
  }
}
