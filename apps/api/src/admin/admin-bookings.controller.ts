import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { ReqUser } from '../common/req-user.decorator';
import { AdminBookingsPageOptionsDto } from '../common/pagination.dto';
import { UserEntity } from '../entities/user.entity';
import { BookingsService } from '../bookings/bookings.service';
import { BookingPhase } from './admin.mapper';
import { AdminBookingsService } from './admin-bookings.service';

@ApiTags('admin/bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(
    private readonly bookings: AdminBookingsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get('phase/:phase')
  listByPhase(
    @Param('phase') phase: BookingPhase,
    @Query(new ValidationPipe({ transform: true })) opts: AdminBookingsPageOptionsDto,
  ) {
    return this.bookings.listByPhase(phase, opts);
  }

  @Post(':id/cancel')
  cancelAsAdmin(
    @ReqUser() user: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingsService.cancel(user.id, id, { asAdmin: true });
  }

  @Get(':id')
  getRegistration(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.getRegistration(id);
  }
}
