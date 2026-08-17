const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** New and changed passwords match the current app/API requirement. */
export const PASSWORD_MIN = 8;

export function validateEmail(email: string): string | undefined {
  if (!email) return 'Email is required';
  if (!EMAIL_RE.test(email)) return 'Invalid email address';
  return undefined;
}

/** Login accepts existing legacy passwords regardless of their length. */
export function validateLoginPassword(
  password: string,
): string | undefined {
  if (!password) return 'Password is required';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  return undefined;
}

export function validateRequired(
  value: string,
  label: string,
): string | undefined {
  if (!value.trim()) return `${label} is required`;
  return undefined;
}
