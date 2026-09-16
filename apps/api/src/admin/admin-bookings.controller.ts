import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { AdminBookingsPageOptionsDto } from '../common/pagination.dto';
import { BookingPhase } from './admin.mapper';
import { AdminBookingsService } from './admin-bookings.service';

@ApiTags('admin/bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: AdminBookingsService) {}

  @Get('phase/:phase')
  listByPhase(
    @Param('phase') phase: BookingPhase,
    @Query(new ValidationPipe({ transform: true })) opts: AdminBookingsPageOptionsDto,
  ) {
    return this.bookings.listByPhase(phase, opts);
  }

  @Get(':id')
  getRegistration(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.getRegistration(id);
  }
}
