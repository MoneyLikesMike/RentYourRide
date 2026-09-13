import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('geocode_cache')
export class GeocodeCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Rounded lat/lng key, e.g. "45.42150,-75.69720" */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  cacheKey: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'text' })
  formatted: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  city: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  region: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  country: string;

  @Column({ type: 'varchar', length: 256, default: '' })
  street: string;

  @Column({ type: 'varchar', length: 32, default: '' })
  postalCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
