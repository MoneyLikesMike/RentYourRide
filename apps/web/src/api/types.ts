export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  addressLine?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  licenseNumber?: string | null;
  licenseVerified?: boolean;
  aboutBio?: string | null;
  avatarUrl?: string | null;
}

export interface LoginPayload {
  isNewUser?: boolean;
  user: AuthUser;
  token: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshPayload {
  accessToken: string;
  refreshToken: string;
}
