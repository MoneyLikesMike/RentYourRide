import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import {
  AdminBookingsPageOptionsDto,
  PaginatedDto,
  PageMetaDto,
} from '../common/pagination.dto';
import { BookingPhase, statusesForPhase, toAdminBookingRow, toAdminBookingRegistration } from './admin.mapper';
import { SortOrder } from '../common/pagination.dto';

function bookingOrderField(field?: string): string {
  switch (field) {
    case 'hostName':
      return "CONCAT(host.first_name, ' ', host.last_name)";
    case 'guestName':
      return "CONCAT(guest.first_name, ' ', guest.last_name)";
    case 'requestStart':
    case 'requestEnd':
    case 'requestTime':
    default:
      return 'booking.createdAt';
  }
}

@Injectable()
export class AdminBookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  async listByPhase(phase: BookingPhase, opts: AdminBookingsPageOptionsDto) {
    const statuses = statusesForPhase(phase);
    const qb = this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.host', 'host')
      .where('booking.status IN (:...statuses)', { statuses });

    if (opts.query?.trim()) {
      const q = `%${opts.query.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(guest.first_name) LIKE :q', { q })
            .orWhere('LOWER(guest.last_name) LIKE :q', { q })
            .orWhere('LOWER(host.first_name) LIKE :q', { q })
            .orWhere('LOWER(host.last_name) LIKE :q', { q })
            .orWhere('LOWER(guest.email) LIKE :q', { q })
            .orWhere('LOWER(host.email) LIKE :q', { q });
        }),
      );
    }

    const orderField = bookingOrderField(opts.field);
    const order = opts.order ?? SortOrder.DESC;
    qb.orderBy(orderField, order);

    // TypeORM getManyAndCount breaks with joined relations; count separately (legacy admin pattern).
    const [rows, itemCount] = await Promise.all([
      qb.clone().skip(opts.skip).take(opts.take).getMany(),
      qb.getCount(),
    ]);
    return new PaginatedDto(
      rows.map(toAdminBookingRow),
      new PageMetaDto(opts, itemCount),
    );
  }

  async getRegistration(id: string) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: ['guest', 'host', 'listing'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return toAdminBookingRegistration(booking);
  }
}
