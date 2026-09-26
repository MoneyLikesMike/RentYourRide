import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type VerifiedGoogleProfile = {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
};

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  private audiences(): string[] {
    const split = (raw?: string | null) =>
      (raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return [
      ...split(this.config.get<string>('GOOGLE_OAUTH_WEB_CLIENT_ID')),
      ...split(this.config.get<string>('GOOGLE_OAUTH_IOS_CLIENT_ID')),
      ...split(this.config.get<string>('GOOGLE_OAUTH_ANDROID_CLIENT_ID')),
    ];
  }

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
    const audiences = this.audiences();
    if (!audiences.length) {
      throw new UnauthorizedException('Google Sign-In is not configured on the server');
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken.trim(),
        audience: audiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }
      return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        firstName: (payload.given_name || '').trim(),
        lastName: (payload.family_name || '').trim(),
        picture: payload.picture || undefined,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
