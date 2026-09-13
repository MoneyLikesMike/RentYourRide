import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ListingEntity } from './listing.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Index({ unique: true })
  @Column({ name: 'google_sub', type: 'varchar', length: 128, nullable: true })
  googleSub: string | null;

  @Index({ unique: true })
  @Column({ name: 'apple_sub', type: 'varchar', length: 128, nullable: true })
  appleSub: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 120 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 120 })
  lastName: string;

  @Column({ type: 'varchar', length: 24, default: 'guest' })
  role: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Exclude()
  @Column({ name: 'phone_otp_hash', type: 'varchar', length: 128, nullable: true })
  phoneOtpHash: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamptz', nullable: true })
  otpExpiresAt: Date | null;

  @Column({ name: 'address_line', type: 'varchar', length: 512, nullable: true })
  addressLine: string | null;

  @Column({ name: 'address_city', type: 'varchar', length: 120, nullable: true })
  addressCity: string | null;

  @Column({ name: 'address_country', type: 'varchar', length: 120, nullable: true })
  addressCountry: string | null;

  @Column({ name: 'address_province', type: 'varchar', length: 120, nullable: true })
  addressProvince: string | null;

  @Column({ name: 'address_postal_code', type: 'varchar', length: 32, nullable: true })
  addressPostalCode: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'gender', type: 'varchar', length: 16, nullable: true })
  gender: string | null;

  @Column({ name: 'license_number', type: 'varchar', length: 64, nullable: true })
  licenseNumber: string | null;

  @Column({ name: 'license_verified', type: 'boolean', default: false })
  licenseVerified: boolean;

  @Column({ name: 'license_verification_status', type: 'varchar', length: 32, nullable: true })
  licenseVerificationStatus: string | null;

  @Column({ name: 'didit_session_id', type: 'varchar', length: 64, nullable: true })
  diditSessionId: string | null;

  @Column({ name: 'about_bio', type: 'text', nullable: true })
  aboutBio: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 1024, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 128, nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'stripe_connect_account_id', type: 'varchar', length: 128, nullable: true })
  stripeConnectAccountId: string | null;

  @Index({ unique: true })
  @Column({ name: 'referral_code', type: 'varchar', length: 16 })
  referralCode: string;

  @Column({ name: 'credits_balance', type: 'decimal', precision: 12, scale: 2, default: '0' })
  creditsBalance: string;

  @Column({ name: 'notification_settings', type: 'jsonb', nullable: true })
  notificationSettings: {
    textNotif?: boolean;
    emailNotif?: boolean;
    pushNotif?: boolean;
  } | null;

  @OneToMany(() => ListingEntity, (l) => l.host)
  listings?: ListingEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  toPublicDto() {
    const fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName,
      role: this.role,
      phone: this.phone ?? '',
      phoneVerified: !!this.phoneVerified,
      emailVerified: !!this.emailVerified,
      addressLine: this.addressLine ?? '',
      addressCity: this.addressCity ?? '',
      addressCountry: this.addressCountry ?? '',
      licenseNumber: this.licenseNumber ?? '',
      licenseVerified: !!this.licenseVerified,
      licenseVerificationStatus: this.licenseVerificationStatus ?? '',
      aboutBio: this.aboutBio ?? '',
      avatarUrl: this.avatarUrl ?? '',
      referralCode: this.referralCode,
      creditsBalance: this.creditsBalance,
      notificationSettings: {
        textNotif: this.notificationSettings?.textNotif !== false,
        emailNotif: this.notificationSettings?.emailNotif !== false,
        pushNotif: this.notificationSettings?.pushNotif !== false,
      },
      createdAt: this.createdAt?.toISOString?.() ?? this.createdAt,
      googleConnected: !!this.googleSub,
      appleConnected: !!this.appleSub,
    };
  }
}
