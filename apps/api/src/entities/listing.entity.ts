import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('listings')
export class ListingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'host_user_id', type: 'uuid' })
  hostUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  host: UserEntity;

  @Column({ type: 'varchar', length: 180 })
  city: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 64, default: 'SEDAN' })
  vehicleType: string;

  @Column({ type: 'jsonb', default: [] })
  photos: Array<{ uri?: string }>;

  @Column({ name: 'price_per_day', type: 'decimal', precision: 12, scale: 2 })
  pricePerDay: string;

  @Column({ name: 'weekly_discount', type: 'varchar', length: 32, nullable: true })
  weeklyDiscount: string | null;

  @Column({ name: 'monthly_discount', type: 'varchar', length: 32, nullable: true })
  monthlyDiscount: string | null;

  @Column({ name: 'delivery_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  deliveryPrice: string | null;

  @Column({ name: 'daily_km', type: 'varchar', length: 64, nullable: true })
  dailyKm: string | null;

  @Column({ name: 'instant_booking', type: 'boolean', default: false })
  instantBooking: boolean;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ name: 'pickup_address', type: 'varchar', length: 512 })
  pickupAddress: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  vin: string | null;

  @Column({ name: 'car_features', type: 'jsonb', nullable: true })
  carFeatures: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  extras: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  availability: Array<{ start: string; end: string }> | null;

  @Column({ name: 'host_trips', type: 'int', default: 0 })
  hostTrips: number;

  @Column({ name: 'host_rating', type: 'decimal', precision: 3, scale: 2, default: '5' })
  hostRating: string;

  @Column({ name: 'guest_reviews', type: 'jsonb', nullable: true })
  guestReviews: unknown[] | null;

  @Column({ name: 'license_plate', type: 'varchar', length: 32, nullable: true })
  licensePlate: string | null;

  @Column({ name: 'license_province', type: 'varchar', length: 32, nullable: true })
  licenseProvince: string | null;

  @Column({ type: 'jsonb', nullable: true })
  vehicleData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  toDetailDto(host?: UserEntity) {
    const h = host ?? this.host;
    const hostFullName = h ? [h.firstName, h.lastName].filter(Boolean).join(' ').trim() : '';
    return {
      id: this.id,
      city: this.city,
      title: this.title,
      description: this.description ?? '',
      vehicleType: this.vehicleType,
      photos: this.photos ?? [],
      pricePerDay: Number(this.pricePerDay),
      weeklyDiscount: this.weeklyDiscount ?? '',
      monthlyDiscount: this.monthlyDiscount ?? '',
      deliveryPrice: this.deliveryPrice != null ? Number(this.deliveryPrice) : 0,
      dailyKm: this.dailyKm ?? '200 km/day',
      instantBooking: this.instantBooking,
      latitude: this.latitude ?? undefined,
      longitude: this.longitude ?? undefined,
      pickupAddress: this.pickupAddress,
      active: this.active,
      published: this.published,
      vin: this.vin ?? undefined,
      carFeatures: this.carFeatures ?? [],
      extras: this.extras ?? {},
      availability: this.availability ?? [],
      hostName: hostFullName || 'Host',
      hostTrips: this.hostTrips,
      hostRating: Number(this.hostRating),
      guestReviews: this.guestReviews ?? [],
      hostPhotoUri: h?.avatarUrl ?? undefined,
      hostEmail: h?.email,
      hostPhone: h?.phone ?? undefined,
      licensePlate: this.licensePlate ?? undefined,
      licenseProvince: this.licenseProvince ?? undefined,
      vehicleData: this.vehicleData ?? undefined,
      hostUserId: this.hostUserId,
    };
  }
}
