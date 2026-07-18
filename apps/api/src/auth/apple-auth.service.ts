import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import appleSignin from 'apple-signin-auth';

export type VerifiedAppleProfile = {
  sub: string;
  email: string | null;
};

@Injectable()
export class AppleAuthService {
  constructor(private readonly config: ConfigService) {}

  /** iOS bundle / primary client id (mobile tokens). */
  private clientId(): string {
    return (
      this.config.get<string>('APPLE_CLIENT_ID')?.trim() ||
      this.config.get<string>('APPLE_BUNDLE_ID')?.trim() ||
      'com.rentyourride.ios'
    );
  }

  /**
   * Accept mobile + web Services ID audiences.
   * Web Sign in with Apple tokens use APPLE_WEB_CLIENT_ID (Services ID).
   */
  private audiences(): string | string[] {
    const ids = [
      this.clientId(),
      this.config.get<string>('APPLE_WEB_CLIENT_ID')?.trim(),
      ...(
        this.config.get<string>('APPLE_CLIENT_IDS')?.split(',') ?? []
      ).map((s) => s.trim()),
    ].filter((s): s is string => !!s);
    const unique = [...new Set(ids)];
    return unique.length === 1 ? unique[0]! : unique;
  }

  async verifyIdentityToken(identityToken: string): Promise<VerifiedAppleProfile> {
    try {
      const payload = await appleSignin.verifyIdToken(identityToken.trim(), {
        audience: this.audiences(),
        ignoreExpiration: false,
      });
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid Apple token');
      }
      const email =
        typeof payload.email === 'string' && payload.email.trim()
          ? payload.email.trim().toLowerCase()
          : null;
      return { sub: payload.sub, email };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid Apple token');
    }
  }
}
