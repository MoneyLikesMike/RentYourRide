import { resolveAvatarUrl } from '../api/users';

/** First letters of up to two name parts — same idea as messages / team grids. */
export function userInitials(
  name?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): string {
  const fromParts = [firstName, lastName]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  if (fromParts) return fromParts;
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

type Props = {
  /** Raw avatar URL from the API (relative or absolute). */
  url?: string | null;
  /** Display name used for initials when there is no photo. */
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  alt?: string;
  className?: string;
  /** Extra class on the initials fallback (defaults to `${className}--initials`). */
  initialsClassName?: string;
};

/**
 * Profile photo, or a neutral initials circle when the user has no upload.
 * Matches listing host empty treatment (gray circle) with readable initials.
 */
export default function UserAvatar({
  url,
  name,
  firstName,
  lastName,
  alt = '',
  className = 'user-avatar',
  initialsClassName,
}: Props) {
  const src = resolveAvatarUrl(url);
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }
  const letters = userInitials(name, firstName, lastName) || '?';
  const fallbackClass =
    initialsClassName || `${className} ${className}--initials`.trim();
  return (
    <span className={fallbackClass} aria-hidden={alt ? undefined : true} aria-label={alt || undefined}>
      {letters}
    </span>
  );
}
