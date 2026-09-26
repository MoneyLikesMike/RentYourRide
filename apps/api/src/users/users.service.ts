import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { compareBcryptPassword } from '../common/crypto.util';
import { UserEntity } from '../entities/user.entity';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { FavoriteEntity } from '../entities/favorite.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';
import { PushTokenService } from '../notifications/push-token.service';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AppleAuthService } from '../auth/apple-auth.service';
import {
  ACCOUNT_DELETION_GRACE_MS,
  AccountDeletionEligibility,
  AccountDeletionReauth,
  OPEN_BOOKING_STATUSES,
} from './account-deletion';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(FavoriteEntity)
    private readonly favorites: Repository<FavoriteEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResets: Repository<PasswordResetTokenEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailTokens: Repository<EmailVerificationTokenEntity>,
    private readonly pushTokens: PushTokenService,
    private readonly config: ConfigService,
    private readonly googleAuth: GoogleAuthService,
    private readonly appleAuth: AppleAuthService,
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
        | 'addressProvince'
        | 'addressPostalCode'
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
      const nextPhone = patch.phone?.trim() || null;
      const prevPhone = user.phone?.trim() || null;
      // Only clear verification when the number actually changes — otherwise
      // a routine profile Save after OTP success would wipe phoneVerified.
      if (nextPhone !== prevPhone) {
        user.phone = nextPhone;
        user.phoneVerified = false;
        user.phoneOtpHash = null;
        user.otpExpiresAt = null;
      }
    }
    if (patch.addressLine !== undefined) user.addressLine = patch.addressLine?.trim() || null;
    if (patch.addressCity !== undefined) user.addressCity = patch.addressCity?.trim() || null;
    if (patch.addressProvince !== undefined) {
      user.addressProvince = patch.addressProvince?.trim() || null;
    }
    if (patch.addressPostalCode !== undefined) {
      user.addressPostalCode = patch.addressPostalCode?.trim() || null;
    }
    if (patch.addressCountry !== undefined) user.addressCountry = patch.addressCountry?.trim() || null;
    if (patch.licenseNumber !== undefined) {
      const nextLicense = patch.licenseNumber?.trim() || null;
      const prevLicense = user.licenseNumber?.trim() || null;
      if (nextLicense !== prevLicense) {
        user.licenseNumber = nextLicense;
        user.licenseVerified = false;
        user.licenseVerificationStatus = null;
      }
    }
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async updateNotificationSettings(
    userId: string,
    settings: { textNotif?: boolean; emailNotif?: boolean; pushNotif?: boolean },
  ) {
    const user = await this.requireById(userId);
    const merged = {
      ...user.notificationSettings,
      ...settings,
    };
    user.notificationSettings = {
      textNotif: merged.textNotif !== false,
      emailNotif: merged.emailNotif !== false,
      pushNotif: merged.pushNotif !== false,
    };
    await this.repo.save(user);
    return user.notificationSettings;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.requireById(userId);
    if (!user.passwordHash) {
      throw new BadRequestException('Set a password via Forgot Password before changing it');
    }
    const ok = await compareBcryptPassword(currentPassword, user.passwordHash);
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
    // Always record the new session status — including when re-verifying an
    // already-approved license — so admin/profile reflect In Progress and
    // Approved/Denied emails fire on the next transition.
    user.licenseVerificationStatus = status;
    await this.repo.save(user);
    return user.toPublicDto();
  }

  async setLicenseVerified(
    userId: string,
    opts: {
      licenseNumber?: string;
      licenseFirstName?: string;
      licenseLastName?: string;
      sessionId?: string;
      addressLine?: string;
      addressCity?: string;
      addressCountry?: string;
      addressProvince?: string;
      addressPostalCode?: string;
      dateOfBirth?: string;
      gender?: string;
    },
  ) {
    const user = await this.requireById(userId);
    if (opts.licenseNumber) user.licenseNumber = opts.licenseNumber;
    if (opts.licenseFirstName) user.licenseFirstName = opts.licenseFirstName.slice(0, 120);
    if (opts.licenseLastName) user.licenseLastName = opts.licenseLastName.slice(0, 120);
    user.licenseVerified = true;
    user.licenseVerificationStatus = 'approved';
    if (opts.sessionId) user.diditSessionId = opts.sessionId;
    if (opts.addressLine) user.addressLine = opts.addressLine.slice(0, 512);
    if (opts.addressCity) user.addressCity = opts.addressCity.slice(0, 120);
    if (opts.addressCountry) user.addressCountry = opts.addressCountry.slice(0, 120);
    if (opts.addressProvince) user.addressProvince = opts.addressProvince.slice(0, 120);
    if (opts.addressPostalCode) user.addressPostalCode = opts.addressPostalCode.slice(0, 32);
    if (opts.dateOfBirth) user.dateOfBirth = opts.dateOfBirth.slice(0, 10);
    if (opts.gender) user.gender = opts.gender.slice(0, 16);
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

  async getDeletionEligibility(userId: string): Promise<AccountDeletionEligibility> {
    const user = await this.requireById(userId);
    const auth = {
      gracePeriodDays: 30,
      hasPassword: !!user.passwordHash,
      googleConnected: !!user.googleSub,
      appleConnected: !!user.appleSub,
    };
    if (user.deletedAt || user.deletionRequestedAt) {
      return { canDelete: false, blockers: [], ...auth };
    }

    const openTrips = await this.bookings.count({
      where: [
        { guestUserId: userId, status: In(OPEN_BOOKING_STATUSES) },
        { hostUserId: userId, status: In(OPEN_BOOKING_STATUSES) },
      ],
    });

    const owedCents = await this.stripeOwedCents(user);
    const blockers: AccountDeletionEligibility['blockers'] = [];

    if (openTrips > 0) {
      blockers.push({
        code: 'ACTIVE_TRIPS',
        title: 'Active or upcoming trips',
        detail:
          openTrips === 1
            ? 'You have 1 trip that is still in progress or upcoming. Finish or cancel it before deleting your account.'
            : `You have ${openTrips} trips that are still in progress or upcoming. Finish or cancel them before deleting your account.`,
        count: openTrips,
      });
    }

    if (owedCents > 0) {
      const dollars = (owedCents / 100).toFixed(2);
      blockers.push({
        code: 'OUTSTANDING_BALANCE',
        title: 'Outstanding balance',
        detail: `You have an outstanding balance of $${dollars}. Pay it before deleting your account.`,
        amountCents: owedCents,
      });
    }

    return { canDelete: blockers.length === 0, blockers, ...auth };
  }

  async requestDeletion(
    userId: string,
    reauth: AccountDeletionReauth,
  ): Promise<{ ok: true; permanentlyDeletesAt: string }> {
    const user = await this.requireById(userId);
    if (user.deletedAt) {
      throw new UnauthorizedException('This account has been deleted');
    }
    if (user.deletionRequestedAt) {
      const permanentlyDeletesAt = new Date(
        user.deletionRequestedAt.getTime() + ACCOUNT_DELETION_GRACE_MS,
      ).toISOString();
      return { ok: true, permanentlyDeletesAt };
    }

    await this.requireRecentSignIn(user, reauth);

    const eligibility = await this.getDeletionEligibility(userId);
    if (!eligibility.canDelete) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message:
            eligibility.blockers[0]?.detail ??
            'This account cannot be deleted yet.',
          canDelete: false,
          blockers: eligibility.blockers,
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.listings.update(
      { hostUserId: userId },
      { published: false, active: false },
    );
    await this.pushTokens.unregisterAllForUser(userId);
    await this.refreshTokens.delete({ userId });

    user.isActive = false;
    user.deletionRequestedAt = new Date();
    await this.repo.save(user);

    return {
      ok: true,
      permanentlyDeletesAt: new Date(
        user.deletionRequestedAt.getTime() + ACCOUNT_DELETION_GRACE_MS,
      ).toISOString(),
    };
  }

  /**
   * Signing in during the 30-day window cancels deletion and reactivates the account.
   * Listings stay unpublished until the user republishes them.
   */
  async restoreIfPendingDeletion(user: UserEntity): Promise<boolean> {
    if (user.deletedAt) {
      throw new UnauthorizedException('This account has been deleted');
    }
    if (user.isActive === false) {
      if (user.deletionRequestedAt) {
        user.isActive = true;
        user.deletionRequestedAt = null;
        await this.repo.save(user);
        return true;
      }
      throw new UnauthorizedException('Account is deactivated');
    }
    return false;
  }

  async permanentlyDeleteDueAccounts(): Promise<number> {
    const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_MS);
    const due = await this.repo.find({
      where: {
        isActive: false,
        deletedAt: IsNull(),
        deletionRequestedAt: LessThanOrEqual(cutoff),
      },
    });
    for (const user of due) {
      await this.anonymizeDeletedUser(user);
    }
    return due.length;
  }

  private async requireRecentSignIn(
    user: UserEntity,
    reauth: AccountDeletionReauth,
  ): Promise<void> {
    const password = reauth.password?.trim();
    const googleIdToken = reauth.googleIdToken?.trim();
    const appleIdentityToken = reauth.appleIdentityToken?.trim();

    if (password && user.passwordHash) {
      const ok = await compareBcryptPassword(password, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Sign in again to delete your account.');
      }
      return;
    }

    if (googleIdToken && user.googleSub) {
      const profile = await this.googleAuth.verifyIdToken(googleIdToken);
      if (profile.sub !== user.googleSub) {
        throw new UnauthorizedException('Sign in again to delete your account.');
      }
      return;
    }

    if (appleIdentityToken && user.appleSub) {
      const profile = await this.appleAuth.verifyIdentityToken(appleIdentityToken);
      if (profile.sub !== user.appleSub) {
        throw new UnauthorizedException('Sign in again to delete your account.');
      }
      return;
    }

    throw new UnauthorizedException('Sign in again to delete your account.');
  }

  private async anonymizeDeletedUser(user: UserEntity): Promise<void> {
    if (user.deletedAt) return;
    const userId = user.id;

    await this.listings.update(
      { hostUserId: userId },
      { published: false, active: false },
    );
    await this.favorites.delete({ userId });
    await this.pushTokens.unregisterAllForUser(userId);
    await this.refreshTokens.delete({ userId });
    await this.passwordResets.delete({ userId });
    await this.emailTokens.delete({ userId });
    await this.detachStripePaymentMethods(user);

    const idCompact = userId.replace(/-/g, '');
    user.email = `deleted-${userId}@deleted.rentyourride.invalid`;
    user.passwordHash = null;
    user.googleSub = null;
    user.appleSub = null;
    user.firstName = 'Deleted';
    user.lastName = 'User';
    user.phone = null;
    user.phoneVerified = false;
    user.phoneOtpHash = null;
    user.otpExpiresAt = null;
    user.emailVerified = false;
    user.addressLine = null;
    user.addressCity = null;
    user.addressCountry = null;
    user.addressProvince = null;
    user.addressPostalCode = null;
    user.dateOfBirth = null;
    user.gender = null;
    user.licenseNumber = null;
    user.licenseVerified = false;
    user.licenseVerificationStatus = null;
    user.diditSessionId = null;
    user.aboutBio = null;
    user.avatarUrl = null;
    user.referralCode = `D${idCompact}`.slice(0, 16);
    user.creditsBalance = '0';
    user.notificationSettings = {
      textNotif: false,
      emailNotif: false,
      pushNotif: false,
    };
    user.isActive = false;
    user.deletedAt = new Date();
    await this.repo.save(user);
  }

  private async stripeOwedCents(user: UserEntity): Promise<number> {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key || !user.stripeCustomerId) return 0;
    try {
      const stripe = new Stripe(key);
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (customer.deleted) return 0;
      const balance = customer.balance ?? 0;
      return balance > 0 ? balance : 0;
    } catch {
      return 0;
    }
  }

  private async detachStripePaymentMethods(user: UserEntity): Promise<void> {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key || !user.stripeCustomerId) return;
    try {
      const stripe = new Stripe(key);
      const methods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });
      await Promise.all(methods.data.map((pm) => stripe.paymentMethods.detach(pm.id)));
    } catch {
      // Privacy cleanup is best-effort; deletion still proceeds.
    }
  }
}
