import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function resetToWelcome() {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }
}

export function resetToMainTabs() {
  const go = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    return true;
  };
  if (go()) return;
  // Auth may finish before NavigationContainer is ready (common on cold start).
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (go() || attempts >= 20) clearInterval(timer);
  }, 50);
}
