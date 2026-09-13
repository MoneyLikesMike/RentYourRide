import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { AdminListingsPageOptionsDto } from '../common/pagination.dto';
import { AdminListingsService } from './admin-listings.service';

@ApiTags('admin/rides')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/rides')
export class AdminListingsController {
  constructor(private readonly listings: AdminListingsService) {}

  @Get()
  list(
    @Query(new ValidationPipe({ transform: true })) opts: AdminListingsPageOptionsDto,
  ) {
    return this.listings.list(opts);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.getOne(id);
  }

  @Patch(':id/verify')
  verify(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.verify(id);
  }

  @Patch(':id/unverify')
  unverify(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.unverify(id);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.deactivate(id);
  }
}
