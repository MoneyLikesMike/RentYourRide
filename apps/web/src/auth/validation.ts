import {
  emailTypoUserMessage,
  findEmailDomainTypo,
} from './emailDomainTypos';

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** New and changed passwords match the current app/API requirement. */
export const PASSWORD_MIN = 8;

export type ValidateEmailOptions = {
  /** Block common domain typos (signup / email change). Default false for login. */
  rejectTypos?: boolean;
};

export function validateEmail(
  email: string,
  opts: ValidateEmailOptions = {},
): string | undefined {
  if (!email) return 'Email is required';
  if (!EMAIL_RE.test(email)) return 'Invalid email address';
  if (opts.rejectTypos) {
    const typo = emailTypoUserMessage(email);
    if (typo) return typo;
  }
  return undefined;
}

/** Suggested corrected address when the domain looks like a typo. */
export function suggestedEmailCorrection(email: string): string | undefined {
  return findEmailDomainTypo(email)?.suggestedEmail;
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
