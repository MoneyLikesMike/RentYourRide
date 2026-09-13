import type { NavigateFunction } from 'react-router-dom';

/** Send the user to the top of the home page (search hero). */
export function goToHomeTop(
  navigate: NavigateFunction,
  pathname: string,
): void {
  const onHome = pathname === '/' || pathname === '/home';
  if (onHome) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  navigate('/');
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
