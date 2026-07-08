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

  private clientId(): string {
    return (
      this.config.get<string>('APPLE_CLIENT_ID')?.trim() ||
      this.config.get<string>('APPLE_BUNDLE_ID')?.trim() ||
      'com.rentyourride.ios'
    );
  }

  async verifyIdentityToken(identityToken: string): Promise<VerifiedAppleProfile> {
    try {
      const payload = await appleSignin.verifyIdToken(identityToken.trim(), {
        audience: this.clientId(),
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
