import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { VinDecodeService } from './vin-decode.service';

@ApiTags('listings')
@Controller('listings')
export class ListingsPublicController {
  constructor(
    private readonly listings: ListingsService,
    private readonly vinDecode: VinDecodeService,
  ) {}

  @Get('search')
  async search(@Query('q') q?: string, @Query('city') city?: string) {
    const rows = await this.listings.search(q, city);
    // Search cards don't need blocked ranges; keep payload light.
    return rows.map((l) => l.toDetailDto());
  }

  @Get('vin/:vin/status')
  async vinStatus(@Param('vin') vin: string) {
    const taken = await this.listings.vinTaken(vin);
    return { exists: taken };
  }

  @Get('vin/:vin/decode')
  async decodeVin(@Param('vin') vin: string) {
    const normalized = this.vinDecode.normalizeVin(vin);
    const exists = await this.listings.vinTaken(normalized);
    if (exists) {
      return { exists: true, vehicleData: null };
    }
    if (!this.vinDecode.isValidVin(normalized)) {
      return {
        exists: false,
        vehicleData: null,
        message: 'VIN must be 17 characters (no I, O, or Q)',
      };
    }
    try {
      const vehicleData = await this.vinDecode.decode(normalized);
      return { exists: false, vehicleData };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not decode VIN';
      return { exists: false, vehicleData: null, message };
    }
  }

  @Get(':id/blocked-ranges')
  async blockedRanges(@Param('id') id: string) {
    const blockedRanges = await this.listings.getBlockedRanges(id);
    return { blockedRanges };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const l = await this.listings.findPublic(id);
    return this.listings.toPublicDetailDto(l);
  }
}
