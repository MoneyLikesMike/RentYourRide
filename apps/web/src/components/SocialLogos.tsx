type IconProps = {
  className?: string;
  title?: string;
};

/** Official multicolor Google "G" mark */
export function GoogleLogo({ className, title = 'Google' }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 5.153C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/** Apple logo (white path for dark buttons) */
export function AppleLogo({ className, title = 'Apple' }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      fill="currentColor"
    >
      {title ? <title>{title}</title> : null}
      <path d="M16.365 1.43c0 1.14-.422 2.207-1.18 3.048-.79.88-2.1 1.557-3.293 1.464-.148-1.098.43-2.24 1.17-3.048.79-.86 2.16-1.5 3.303-1.464zM20.95 17.34c-.58 1.34-.86 1.94-1.61 3.12-1.05 1.64-2.53 3.68-4.37 3.7-1.63.02-2.05-1.06-4.27-1.05-2.22.01-2.68 1.07-4.31 1.05-1.84-.02-3.25-1.86-4.3-3.5C.47 17.7-.7 12.86 1.1 9.55c1.26-2.3 3.25-3.64 5.12-3.64 1.91 0 3.11 1.1 4.69 1.1 1.52 0 2.45-1.11 4.64-1.11 1.66 0 3.41 1.01 4.66 2.75-4.09 2.24-3.43 8.07.74 8.69z" />
    </svg>
  );
}
