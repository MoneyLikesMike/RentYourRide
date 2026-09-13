import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { BookingsService, QuoteInput } from './bookings.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingEntity } from '../entities/listing.entity';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    @InjectRepository(ListingEntity)
    private readonly listingsRepo: Repository<ListingEntity>,
  ) {}

  @Post('quote')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async quote(@Body() body: QuoteInput) {
    const listing = await this.listingsRepo.findOne({
      where: { id: body.listingId },
      relations: ['host'],
    });
    if (!listing?.published || !listing.active) {
      throw new NotFoundException('Listing not found');
    }
    return this.bookings.quote(listing, body);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async create(
    @ReqUser() user: UserEntity,
    @Body() body: Record<string, unknown>,
    @Headers('idempotency-key') idem?: string,
  ) {
    return this.bookings.createBooking(user.id, body, idem);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async list(
    @ReqUser() user: UserEntity,
    @Query('role') role: 'guest' | 'host',
    @Query('status') status?: string,
  ) {
    const r = role === 'host' ? 'host' : 'guest';
    return this.bookings.listForUser(user.id, r, status);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async one(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.getOne(user.id, id);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async cancel(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.cancel(user.id, id);
  }

  @Post(':id/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async accept(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.acceptHost(user.id, id);
  }

  @Post(':id/decline')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async decline(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.declineHost(user.id, id);
  }

  @Post(':id/checkin/start')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async checkinStart(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.transitionStatus(user.id, id, 'checkin_pending', [
      'confirmed',
    ]);
  }

  @Post(':id/trip/start')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async tripStart(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.transitionStatus(user.id, id, 'active', [
      'checkin_pending',
    ]);
  }

  @Post(':id/checkout/start')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async checkoutStart(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.transitionStatus(user.id, id, 'checkout_pending', [
      'active',
    ]);
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async complete(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.bookings.transitionStatus(user.id, id, 'completed', [
      'checkout_pending',
      'active',
      'extended',
      'extension_declined',
      'checkin_pending',
    ]);
  }

  @Post(':id/lifecycle')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async patchLifecycle(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.bookings.patchLifecycle(user.id, id, body ?? {});
  }

  @Post(':id/agreement/sign')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async agreementSign(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { role: string; signature?: string },
  ) {
    return this.bookings.signAgreement(user.id, id, body);
  }

  @Post(':id/condition-photos')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async conditionPhotos(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { phase?: string; uris: string[] },
  ) {
    return this.bookings.addConditionPhotos(
      user.id,
      id,
      body.phase ?? 'pre',
      body.uris ?? [],
    );
  }

  @Post(':id/reviews')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async reviews(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { rating: number; text?: string; role: 'guest' | 'host' },
  ) {
    return this.bookings.submitReview(user.id, id, body);
  }

  @Post(':id/extension/quote')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async extensionQuote(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { newEndMs: number },
  ) {
    return this.bookings.quoteExtension(user.id, id, Number(body.newEndMs));
  }

  @Post(':id/extension')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async requestExtension(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body()
    body: { newEndMs: number; stripePaymentIntentId?: string; guestMessage?: string },
  ) {
    return this.bookings.requestExtension(user.id, id, body);
  }

  @Post(':id/extension/respond')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async respondExtension(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { approved: boolean },
  ) {
    return this.bookings.respondExtension(user.id, id, Boolean(body.approved));
  }
}
