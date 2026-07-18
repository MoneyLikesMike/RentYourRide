import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import {
  AdminLicensesPageOptionsDto,
  AdminUsersPageOptionsDto,
} from '../common/pagination.dto';
import { BookingPhase } from './admin.mapper';
import { AdminUsersService } from './admin-users.service';
import { AuthService } from '../auth/auth.service';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly auth: AuthService,
  ) {}

  @Get('licenses')
  listLicenses(
    @Query(new ValidationPipe({ transform: true })) opts: AdminLicensesPageOptionsDto,
  ) {
    return this.users.listLicenseVerifications(opts);
  }

  @Get()
  listMembers(
    @Query(new ValidationPipe({ transform: true })) opts: AdminUsersPageOptionsDto,
  ) {
    return this.users.listMembers(opts);
  }

  @Get(':id/bookings/:phase')
  memberBookings(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phase') phase: BookingPhase,
  ) {
    return this.users.getMemberBookings(id, phase);
  }

  @Get(':id/rides')
  memberListings(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getMemberListings(id);
  }

  @Get(':id')
  getMember(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getMember(id);
  }

  @Patch(':id')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.users.updateMember(id, body as never);
  }

  @Delete(':id')
  deleteMember(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.deleteMember(id);
  }

  @Post('block/:id')
  blockUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.blockUser(id);
  }

  @Post('unblock/:id')
  unblockUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.unblockUser(id);
  }

  @Post(':id/verify-email')
  @HttpCode(200)
  verifyEmail(@Param('id', ParseUUIDPipe) id: string) {
    return this.auth.setEmailVerifiedAdmin(id);
  }

  @Post(':id/notes')
  @HttpCode(200)
  addNote() {
    return { id: 0, text: '', createdAt: new Date() };
  }

  @Patch(':id/notes/:noteId')
  @HttpCode(200)
  updateNote() {
    return { id: 0, text: '', createdAt: new Date() };
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(200)
  deleteNote() {
    return { affected: 0 };
  }
}
