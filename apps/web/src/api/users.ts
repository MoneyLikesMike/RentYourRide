import { apiFetch, apiUrl } from './http';

export type NotificationSettings = {
  textNotif: boolean;
  emailNotif: boolean;
  pushNotif: boolean;
};

/** Full profile from GET /v1/users/me */
export type MeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  phone?: string | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  addressLine?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  licenseNumber?: string | null;
  licenseVerified?: boolean;
  licenseVerificationStatus?: string | null;
  aboutBio?: string | null;
  avatarUrl?: string | null;
  referralCode?: string | null;
  creditsBalance?: number;
  notificationSettings?: Partial<NotificationSettings>;
};

export type PatchMeInput = {
  firstName?: string;
  lastName?: string;
  aboutBio?: string;
  phone?: string;
  addressLine?: string;
  addressCity?: string;
  addressCountry?: string;
  licenseNumber?: string;
};

export async function getMe(): Promise<MeUser> {
  return apiFetch<MeUser>('v1/users/me', { method: 'GET' });
}

export async function patchMe(body: PatchMeInput): Promise<MeUser> {
  return apiFetch<MeUser>('v1/users/me', { method: 'PATCH', json: body });
}

export async function patchPassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  return apiFetch('v1/users/me/password', { method: 'PATCH', json: body });
}

export async function uploadAvatar(file: File): Promise<MeUser> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<MeUser>('v1/users/me/avatar', {
    method: 'POST',
    body: form,
  });
}

export async function startEmailVerification(): Promise<{ ok?: boolean }> {
  return apiFetch('v1/auth/start-email-verification', {
    method: 'POST',
    json: {},
  });
}

export async function startPhoneVerification(
  phoneNumber: string,
): Promise<{ ok?: boolean }> {
  return apiFetch('v1/auth/start-phone-verification', {
    method: 'POST',
    json: { phoneNumber },
  });
}

export async function finishPhoneVerification(
  code: string,
): Promise<{ ok?: boolean }> {
  return apiFetch('v1/auth/finish-phone-verification', {
    method: 'POST',
    json: { code },
  });
}

/** Resolve avatar URL for <img src> (handles relative /v1/uploads paths). */
export function resolveAvatarUrl(url?: string | null): string {
  if (!url) return '/no-avatar.jpg';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) {
    const origin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, '') || '';
    return origin ? `${origin}${url}` : url;
  }
  return apiUrl(url.replace(/^\//, ''));
}
