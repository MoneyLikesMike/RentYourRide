import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async requireById(id: string): Promise<UserEntity> {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async updateProfile(
    userId: string,
    patch: Partial<
      Pick<
        UserEntity,
        | 'firstName'
        | 'lastName'
        | 'aboutBio'
        | 'phone'
        | 'addressLine'
        | 'addressCity'
        | 'addressCountry'
        | 'licenseNumber'
      >
    >,
  ) {
    const user = await this.requireById(userId);
    if (patch.firstName != null) user.firstName = patch.firstName.trim();
    if (patch.lastName != null) user.lastName = patch.lastName.trim();
    if (patch.aboutBio != null) user.aboutBio = patch.aboutBio.trim();
    if (patch.phone !== undefined) {
      user.phone = patch.phone?.trim() || null;
      user.phoneVerified = false;
      user.phoneOtpHash = null;
      user.otpExpiresAt = null;
    }
    if (patch.addressLine !== undefined) user.addressLine = patch.addressLine?.trim() || null;
    if (patch.addressCity !== undefined) user.addressCity = patch.addressCity?.trim() || null;
    if (patch.addressCountry !== undefined) user.addressCountry = patch.addressCountry?.trim() || null;
    if (patch.licenseNumber !== undefined) {
      user.licenseNumber = patch.licenseNumber?.trim() || null;
      user.licenseVerified = false;
      user.licenseVerificationStatus = null;
    }
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async updateNotificationSettings(
    userId: string,
    settings: { textNotif?: boolean; emailNotif?: boolean; pushNotif?: boolean },
  ) {
    const user = await this.requireById(userId);
    user.notificationSettings = {
      ...user.notificationSettings,
      ...settings,
    };
    await this.repo.save(user);
    return user.notificationSettings;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.requireById(userId);
    if (!user.passwordHash) {
      throw new BadRequestException('Set a password via Forgot Password before changing it');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Current password incorrect');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);
    return { ok: true };
  }

  async setAvatarUrl(userId: string, url: string) {
    const user = await this.requireById(userId);
    user.avatarUrl = url;
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async ensureStripeCustomerId(userId: string, stripeCustomerId: string) {
    const user = await this.requireById(userId);
    if (!user.stripeCustomerId) {
      user.stripeCustomerId = stripeCustomerId;
      await this.repo.save(user);
    }
    return user;
  }

  async setStripeConnectAccountId(userId: string, accountId: string | null) {
    const user = await this.requireById(userId);
    user.stripeConnectAccountId = accountId;
    await this.repo.save(user);
    return user;
  }

  async addCredits(userId: string, amount: number) {
    const user = await this.requireById(userId);
    const cur = Number(user.creditsBalance || '0');
    user.creditsBalance = String(cur + amount);
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async applyReferralCode(applicantUserId: string, code: string) {
    const applicant = await this.requireById(applicantUserId);
    const normalized = code.trim().toUpperCase();
    const referrer = await this.repo.findOne({ where: { referralCode: normalized } });
    if (!referrer || referrer.id === applicant.id) {
      return { ok: false, message: 'Invalid referral code' };
    }
    const SIGNUP_BONUS = 25;
    await this.addCredits(applicant.id, SIGNUP_BONUS);
    await this.addCredits(referrer.id, SIGNUP_BONUS);
    return { ok: true };
  }

  async getReferralSummary(userId: string) {
    const user = await this.requireById(userId);
    return {
      referralCode: user.referralCode,
      creditsBalance: user.creditsBalance,
    };
  }

  async setDiditSession(userId: string, sessionId: string, status: string) {
    const user = await this.requireById(userId);
    user.diditSessionId = sessionId;
    user.licenseVerificationStatus = status;
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async setLicenseVerified(
    userId: string,
    opts: { licenseNumber?: string; sessionId?: string },
  ) {
    const user = await this.requireById(userId);
    if (opts.licenseNumber) user.licenseNumber = opts.licenseNumber;
    user.licenseVerified = true;
    user.licenseVerificationStatus = 'approved';
    if (opts.sessionId) user.diditSessionId = opts.sessionId;
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async setLicenseVerificationStatus(
    userId: string,
    status: string,
    sessionId?: string,
  ) {
    const user = await this.requireById(userId);
    user.licenseVerificationStatus = status;
    if (status === 'expired' || status === 'declined') {
      user.licenseVerified = false;
    }
    if (sessionId) user.diditSessionId = sessionId;
    await this.repo.save(user);
    return user.toPublicDto();
  }
}
