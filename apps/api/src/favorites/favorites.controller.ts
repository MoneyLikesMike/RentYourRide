import { Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  async list(@ReqUser() user: UserEntity) {
    return this.favorites.list(user.id);
  }

  @Put(':listingId')
  async add(@ReqUser() user: UserEntity, @Param('listingId') listingId: string) {
    return this.favorites.add(user.id, listingId);
  }

  @Delete(':listingId')
  async remove(@ReqUser() user: UserEntity, @Param('listingId') listingId: string) {
    return this.favorites.remove(user.id, listingId);
  }
}
