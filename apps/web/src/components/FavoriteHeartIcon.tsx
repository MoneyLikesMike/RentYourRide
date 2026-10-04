/** Matches the app's saved-heart amber. */
export const FAVORITE_COLOR = '#ffb214';

type Props = {
  filled: boolean;
  className?: string;
  size?: number;
};

/** White outline that fills amber when saved; pair with a drop shadow on photos. */
export default function FavoriteHeartIcon({
  filled,
  className = 'fyc-fav-icon',
  size = 21,
}: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={Math.round((size * 19) / 21)}
      viewBox="0 0 24 22"
      aria-hidden
    >
      <path
        d="M12 20.5S2.5 14.2 2.5 8.4C2.5 5.1 5 2.8 8.1 2.8c1.8 0 3.4.9 3.9 2.2.5-1.3 2.1-2.2 3.9-2.2 3.1 0 5.6 2.3 5.6 5.6 0 5.8-9.5 12.1-9.5 12.1z"
        fill={filled ? FAVORITE_COLOR : 'none'}
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
