import {
  ConflictException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';
import {
  compareBcryptPassword,
  hashOpaque,
  randomRefreshToken,
  randomReferralCode,
  randomResetToken,
  randomPhoneOtpCode,
} from '../common/crypto.util';
import { JwtPayload } from './strategies/jwt.strategy';
import { SmsService } from './sms.service';
import { GoogleAuthService } from './google-auth.service';
import { AppleAuthService } from './apple-auth.service';
import { NotificationsService } from '../notifications/notifications.service';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TTL = '15m';
const RESET_TTL_MS = 60 * 60 * 1000;
const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFY_TTL_MS = 72 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly resetRepo: Repository<PasswordResetTokenEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailVerifyRepo: Repository<EmailVerificationTokenEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly googleAuth: GoogleAuthService,
    private readonly appleAuth: AppleAuthService,
    private readonly notifications: NotificationsService,
  ) {}

  private jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET') || 'dev-jwt-secret-change-me';
  }

  async register(body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await this.usersRepo.findOne({
      where: { email: body.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hash = await bcrypt.hash(body.password, 10);
    let referralCode = randomReferralCode();
    for (let i = 0; i < 5; i++) {
      const clash = await this.usersRepo.findOne({ where: { referralCode } });
      if (!clash) break;
      referralCode = randomReferralCode();
    }
    const user = this.usersRepo.create({
      email: body.email.trim().toLowerCase(),
      passwordHash: hash,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      role: 'guest',
      referralCode,
      creditsBalance: '0',
    });
    await this.usersRepo.save(user);
    await this.issueEmailVerification(user);
    return this.issueLoginPayload(user, true);
  }

  async loginWithGoogle(body: {
    idToken: string;
    firstName?: string;
    lastName?: string;
  }) {
    const profile = await this.googleAuth.verifyIdToken(body.idToken);
    const { user, isNewUser } = await this.findOrCreateOAuthUser({
      email: profile.email,
      firstName: body.firstName?.trim() || profile.firstName,
      lastName: body.lastName?.trim() || profile.lastName,
      googleSub: profile.sub,
      avatarUrl: profile.picture,
    });
    return this.issueLoginPayload(user, isNewUser);
  }

  async loginWithApple(body: {
    identityToken: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }) {
    const profile = await this.appleAuth.verifyIdentityToken(body.identityToken);
    const email =
      profile.email ||
      (body.email?.trim() ? body.email.trim().toLowerCase() : null);
    const { user, isNewUser } = await this.findOrCreateOAuthUser({
      email,
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      appleSub: profile.sub,
    });
    return this.issueLoginPayload(user, isNewUser);
  }

  private async findOrCreateOAuthUser(opts: {
    email?: string | null;
    firstName?: string;
    lastName?: string;
    googleSub?: string;
    appleSub?: string;
    avatarUrl?: string;
  }): Promise<{ user: UserEntity; isNewUser: boolean }> {
    let user: UserEntity | null = null;

    if (opts.googleSub) {
      user = await this.usersRepo.findOne({ where: { googleSub: opts.googleSub } });
    }
    if (!user && opts.appleSub) {
      user = await this.usersRepo.findOne({ where: { appleSub: opts.appleSub } });
    }
    if (!user && opts.email) {
      user = await this.usersRepo.findOne({ where: { email: opts.email } });
    }

    if (user) {
      let dirty = false;
      if (opts.googleSub && !user.googleSub) {
        user.googleSub = opts.googleSub;
        dirty = true;
      }
      if (opts.appleSub && !user.appleSub) {
        user.appleSub = opts.appleSub;
        dirty = true;
      }
      if (opts.firstName?.trim() && !user.firstName?.trim()) {
        user.firstName = opts.firstName.trim();
        dirty = true;
      }
      if (opts.lastName?.trim() && !user.lastName?.trim()) {
        user.lastName = opts.lastName.trim();
        dirty = true;
      }
      if (opts.avatarUrl?.trim() && !user.avatarUrl?.trim()) {
        user.avatarUrl = opts.avatarUrl.trim();
        dirty = true;
      }
      if (dirty) {
        await this.usersRepo.save(user);
      }
      return { user, isNewUser: false };
    }

    if (!opts.email) {
      throw new BadRequestException(
        'Could not resolve an email for this Apple account. Try again or use email sign-in.',
      );
    }

    let referralCode = randomReferralCode();
    for (let i = 0; i < 5; i++) {
      const clash = await this.usersRepo.findOne({ where: { referralCode } });
      if (!clash) break;
      referralCode = randomReferralCode();
    }

    const created = this.usersRepo.create({
      email: opts.email,
      passwordHash: null,
      firstName: opts.firstName?.trim() || 'Guest',
      lastName: opts.lastName?.trim() || '',
      role: 'guest',
      referralCode,
      creditsBalance: '0',
      googleSub: opts.googleSub ?? null,
      appleSub: opts.appleSub ?? null,
      avatarUrl: opts.avatarUrl?.trim() || null,
      emailVerified: false,
    });
    await this.usersRepo.save(created);
    // Match password signup + legacy: new social accounts must verify email too.
    await this.issueEmailVerification(created);
    return { user: created, isNewUser: true };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('Account is deactivated');
    }
    const matches = await compareBcryptPassword(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueLoginPayload(user);
  }

  async adminLogin(email: string, password: string) {
    const payload = await this.login(email, password);
    if (payload.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return payload;
  }

  private async issueLoginPayload(user: UserEntity, isNewUser = false) {
    const accessToken = await this.signAccess(user);
    const refreshPlain = randomRefreshToken();
    const rt = this.refreshRepo.create({
      userId: user.id,
      tokenHash: hashOpaque(refreshPlain),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    await this.refreshRepo.save(rt);
    return {
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
        role: user.role,
        emailVerified: !!user.emailVerified,
      },
      token: {
        accessToken,
        refreshToken: refreshPlain,
      },
    };
  }

  private async signAccess(user: UserEntity): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      typ: 'access',
    };
    return this.jwt.signAsync(payload, {
      secret: this.jwtSecret(),
      expiresIn: ACCESS_TTL,
    });
  }

  async refresh(refreshToken: string) {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const hash = hashOpaque(refreshToken.trim());
    const row = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.refreshRepo.delete(row.id);
    const user = row.user;
    const accessToken = await this.signAccess(user);
    const refreshPlain = randomRefreshToken();
    const next = this.refreshRepo.create({
      userId: user.id,
      tokenHash: hashOpaque(refreshPlain),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    await this.refreshRepo.save(next);
    return {
      accessToken,
      refreshToken: refreshPlain,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return { ok: true };
    }
    await this.resetRepo.delete({ userId: user.id });
    const plain = randomResetToken();
    const row = this.resetRepo.create({
      userId: user.id,
      tokenHash: hashOpaque(plain),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    await this.resetRepo.save(row);
    this.notifications.passwordRecovery(user, plain);
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      console.warn(`[auth] password reset token for ${user.email}: ${plain}`);
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = hashOpaque(token.trim());
    const row = await this.resetRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    row.user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.save(row.user);
    await this.resetRepo.delete(row.id);
    await this.refreshRepo.delete({ userId: row.user.id });
    return { ok: true };
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    const trimmed = phoneNumber.trim();
    if (!trimmed.startsWith('+')) {
      throw new BadRequestException('Phone number must include country code, e.g. +16135550137');
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException('Invalid phone number');
    }
    return `+${digits}`;
  }

  private smsExposeCodeEnabled(): boolean {
    const flag = this.config.get<string>('SMS_EXPOSE_CODE');
    return flag === '1' || flag === 'true';
  }

  async startPhoneVerification(userId: string, phoneNumber: string) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const code = randomPhoneOtpCode();
    user.phone = normalized;
    user.phoneVerified = false;
    user.phoneOtpHash = hashOpaque(code);
    user.otpExpiresAt = new Date(Date.now() + PHONE_OTP_TTL_MS);
    await this.usersRepo.save(user);

    const smsResult = await this.sms.sendVerificationSms(normalized, code);
    const exposeCode = this.smsExposeCodeEnabled();

    if (!smsResult.sent) {
      if (exposeCode) {
        this.log.warn(`[auth] phone OTP for ${normalized}: ${code} (SMS not sent: ${smsResult.reason || 'unknown'})`);
        return {
          ok: true,
          phone: normalized,
          expiresInSeconds: PHONE_OTP_TTL_MS / 1000,
          smsSent: false,
          devCode: code,
        };
      }
      if (smsResult.devLogged && this.config.get<string>('NODE_ENV') !== 'production') {
        this.log.warn(`[auth] phone OTP for ${normalized}: ${code}`);
      }
      throw new ServiceUnavailableException(
        'Could not send verification text message. Phone SMS may not be configured on this server.',
      );
    }

    return {
      ok: true,
      phone: normalized,
      expiresInSeconds: PHONE_OTP_TTL_MS / 1000,
      smsSent: true,
    };
  }

  async finishPhoneVerification(userId: string, code: string) {
    const cleanedCode = String(code || '').replace(/\D/g, '').trim();
    if (cleanedCode.length !== 6) {
      throw new BadRequestException('Enter the 6-digit verification code');
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.phoneOtpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Verification code expired. Request a new code.');
    }
    if (user.phoneOtpHash !== hashOpaque(cleanedCode)) {
      throw new UnauthorizedException('Incorrect verification code');
    }

    user.phoneVerified = true;
    user.phoneOtpHash = null;
    user.otpExpiresAt = null;
    await this.usersRepo.save(user);

    return {
      success: true,
      phone: user.phone,
      user: user.toPublicDto(),
    };
  }

  private async issueEmailVerification(
    user: UserEntity,
  ): Promise<{ linkToken: string; code: string } | null> {
    if (user.emailVerified) return null;
    await this.emailVerifyRepo.delete({ userId: user.id });
    const plain = randomResetToken();
    const code = randomPhoneOtpCode();
    await this.emailVerifyRepo.save([
      this.emailVerifyRepo.create({
        userId: user.id,
        tokenHash: hashOpaque(plain),
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
        purpose: 'signup',
      }),
      this.emailVerifyRepo.create({
        userId: user.id,
        tokenHash: hashOpaque(code),
        expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MS),
        purpose: 'otp',
      }),
    ]);
    await this.notifications.verifyEmail(user, plain, code);
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.log.warn(
        `[auth] email verification for ${user.email}: link=${plain} code=${code}`,
      );
    }
    return { linkToken: plain, code };
  }

  async startEmailVerification(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.emailVerified) {
      return { ok: true, alreadyVerified: true };
    }
    const issued = await this.issueEmailVerification(user);
    const expose =
      this.smsExposeCodeEnabled() ||
      this.config.get<string>('NODE_ENV') !== 'production';
    return {
      ok: true,
      alreadyVerified: false,
      ...(expose && issued?.code ? { devCode: issued.code } : {}),
    };
  }

  async finishEmailVerification(userId: string, code: string) {
    const cleanedCode = String(code || '').replace(/\D/g, '').trim();
    if (cleanedCode.length !== 6) {
      throw new BadRequestException('Enter the 6-digit verification code');
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.emailVerified) {
      return { ok: true, alreadyVerified: true, user: user.toPublicDto() };
    }

    const row = await this.emailVerifyRepo.findOne({
      where: {
        userId,
        purpose: 'otp',
        tokenHash: hashOpaque(cleanedCode),
      },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Incorrect or expired verification code. Request a new code.',
      );
    }

    user.emailVerified = true;
    await this.usersRepo.save(user);
    await this.emailVerifyRepo.delete({ userId });
    // Legacy timing: Welcome goes out once the email is verified. Don't make
    // the user wait on the send — delivery failures are logged by Pinpoint.
    void this.notifications.emailVerifiedWelcome(user);
    return { ok: true, user: user.toPublicDto() };
  }

  async verifyEmail(token: string) {
    const hash = hashOpaque(token.trim());
    const row = await this.emailVerifyRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification link');
    }
    row.user.emailVerified = true;
    await this.usersRepo.save(row.user);
    await this.emailVerifyRepo.delete({ userId: row.user.id });
    void this.notifications.emailVerifiedWelcome(row.user);
    return { ok: true, user: row.user.toPublicDto() };
  }

  async setEmailVerifiedAdmin(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    user.emailVerified = true;
    await this.usersRepo.save(user);
    return user.toPublicDto();
  }
}
