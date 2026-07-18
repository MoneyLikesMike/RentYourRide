type Props = {
  className?: string;
};

/** Black App Store badge — standard “Download on the App Store” look */
export function AppStoreBadge({ className }: Props) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 40"
      role="img"
      aria-label="Download on the App Store"
    >
      <rect width="120" height="40" rx="7" fill="#000" />
      <path
        fill="#fff"
        d="M24.5 20.15c0-2.05 1.67-3.04 1.75-3.09-.96-1.4-2.45-1.59-2.98-1.61-1.27-.13-2.48.75-3.12.75-.65 0-1.65-.73-2.71-.71-1.39.02-2.68.81-3.39 2.06-1.45 2.51-.37 6.22 1.04 8.26.69.99 1.5 2.11 2.57 2.07 1.03-.04 1.42-.67 2.66-.67s1.59.67 2.69.65c1.11-.02 1.82-1.01 2.5-2.01.79-1.15 1.11-2.27 1.13-2.33-.02-.01-2.16-.83-2.16-3.37zm-2.02-5.98c.57-.69.95-1.65.85-2.6-.82.03-1.81.55-2.4 1.24-.53.61-.99 1.58-.87 2.51.92.07 1.85-.46 2.42-1.15z"
      />
      <text
        x="35"
        y="16"
        fill="#fff"
        fontFamily="system-ui, -apple-system, Helvetica, Arial, sans-serif"
        fontSize="6.5"
      >
        Download on the
      </text>
      <text
        x="35"
        y="28.5"
        fill="#fff"
        fontFamily="system-ui, -apple-system, Helvetica, Arial, sans-serif"
        fontSize="13"
        fontWeight="600"
      >
        App Store
      </text>
    </svg>
  );
}

/** Black Google Play badge with multicolor triangle */
export function GooglePlayBadge({ className }: Props) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 135 40"
      role="img"
      aria-label="Get it on Google Play"
    >
      <rect width="135" height="40" rx="7" fill="#000" />
      <g transform="translate(12.5 9.5)">
        <path fill="#00A0FF" d="M0 0v21l12-10.5L0 0z" />
        <path fill="#00F076" d="M12 10.5 0 21l16.5-9.4L12 10.5z" />
        <path fill="#FFD500" d="M0 0 12 10.5l4.5-2.6L0 0z" />
        <path
          fill="#FF3A44"
          d="m16.5 7.9-4.5 2.6 4.5 2.6 4.9-2.8c.85-.48.85-1.8 0-2.28L16.5 7.9z"
        />
      </g>
      <text
        x="38"
        y="15.5"
        fill="#fff"
        fontFamily="Roboto, system-ui, Helvetica, Arial, sans-serif"
        fontSize="6.5"
        letterSpacing="0.55"
      >
        GET IT ON
      </text>
      <text
        x="38"
        y="28.5"
        fill="#fff"
        fontFamily="Roboto, system-ui, Helvetica, Arial, sans-serif"
        fontSize="13"
        fontWeight="500"
      >
        Google Play
      </text>
    </svg>
  );
}
