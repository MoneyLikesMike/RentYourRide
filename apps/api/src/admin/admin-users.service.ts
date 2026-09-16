import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import {
  AdminLicensesPageOptionsDto,
  AdminUsersPageOptionsDto,
  PaginatedDto,
  PageMetaDto,
} from '../common/pagination.dto';
import {
  BookingPhase,
  statusesForPhase,
  toAdminProfile,
  toDashboardMember,
  toLicenseVerificationRow,
  toUserBookingRow,
  toUserListingRow,
  fullName,
} from './admin.mapper';
import { DiditService } from '../didit/didit.service';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly didit: DiditService,
  ) {}

  async listMembers(
    opts: AdminUsersPageOptionsDto,
  ): Promise<PaginatedDto<ReturnType<typeof toDashboardMember>>> {
    const qb = this.users.createQueryBuilder('user');

    if (opts.query?.trim()) {
      const q = `%${opts.query.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(user.first_name) LIKE :q', { q })
            .orWhere('LOWER(user.last_name) LIKE :q', { q })
            .orWhere('LOWER(user.email) LIKE :q', { q })
            .orWhere('user.phone LIKE :raw', { raw: `%${opts.query!.trim()}%` });
        }),
      );
    }

    const orderField =
      opts.field === 'email'
        ? 'user.email'
        : opts.field === 'fullName'
          ? "CONCAT(user.first_name, ' ', user.last_name)"
          : 'user.created_at';

    qb.orderBy(orderField, opts.order).skip(opts.skip).take(opts.take);
    const [rows, itemCount] = await qb.getManyAndCount();
    return new PaginatedDto(
      rows.map(toDashboardMember),
      new PageMetaDto(opts, itemCount),
    );
  }

  async getMember(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    try {
      await this.didit.reconcileUserLicense(id);
    } catch {
      /* keep stored status if Didit is unreachable */
    }
    const fresh = (await this.users.findOne({ where: { id } })) ?? user;
    return toAdminProfile(fresh);
  }

  async getMemberBookings(id: string, phase: BookingPhase) {
    const statuses = statusesForPhase(phase);
    if (!statuses.length) throw new BadRequestException('Invalid phase');
    const rows = await this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.host', 'host')
      .where('booking.status IN (:...statuses)', { statuses })
      .andWhere('(booking.guest_user_id = :id OR booking.host_user_id = :id)', { id })
      .orderBy('booking.created_at', 'DESC')
      .getMany();
    return rows.map(toUserBookingRow);
  }

  async getMemberListings(id: string) {
    const rows = await this.listings.find({
      where: { hostUserId: id },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });
    return rows.map(toUserListingRow);
  }

  async updateMember(id: string, patch: Partial<UserEntity>) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (patch.firstName != null) user.firstName = String(patch.firstName).trim();
    if (patch.lastName != null) user.lastName = String(patch.lastName).trim();
    if (patch.phone != null) user.phone = String(patch.phone).trim() || null;
    if (patch.aboutBio != null) user.aboutBio = String(patch.aboutBio);
    await this.users.save(user);
    return toAdminProfile(user);
  }

  async deleteMember(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    // Must deactivate (block) before hard-delete — matches admin product rule.
    if (user.isActive !== false) {
      throw new BadRequestException(
        'Deactivate the user before deleting. Active users cannot be deleted.',
      );
    }
    await this.users.remove(user);
    return { affected: 1 };
  }

  async blockUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await this.users.save(user);
    return toAdminProfile(user);
  }

  async unblockUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = true;
    await this.users.save(user);
    return toAdminProfile(user);
  }

  async listLicenseVerifications(opts: AdminLicensesPageOptionsDto) {
    const qb = this.users
      .createQueryBuilder('user')
      .where(
        'user.license_verified = false AND user.license_verification_status IN (:...statuses)',
        {
          statuses: ['pending_review', 'in_progress', 'submitted', 'In Progress', 'In Review'],
        },
      );

    if (opts.query?.trim()) {
      const q = `%${opts.query.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(user.first_name) LIKE :q', { q })
            .orWhere('LOWER(user.last_name) LIKE :q', { q })
            .orWhere('LOWER(user.email) LIKE :q', { q });
        }),
      );
    }

    qb.orderBy("CONCAT(user.first_name, ' ', user.last_name)", opts.order)
      .skip(opts.skip)
      .take(opts.take);
    const [rows, itemCount] = await qb.getManyAndCount();
    return new PaginatedDto(
      rows.map(toLicenseVerificationRow),
      new PageMetaDto(opts, itemCount),
    );
  }
}
