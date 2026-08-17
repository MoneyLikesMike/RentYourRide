import { Controller, forwardRef, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeocodeService } from '../geocode/geocode.service';
import { withApproximateLocation } from './approximate-location';
import { ListingsService } from './listings.service';
import { VinDecodeService } from './vin-decode.service';

@ApiTags('listings')
@Controller('listings')
export class ListingsPublicController {
  constructor(
    private readonly listings: ListingsService,
    private readonly vinDecode: VinDecodeService,
    @Inject(forwardRef(() => GeocodeService))
    private readonly geocode: GeocodeService,
  ) {}

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    let lat = latitude?.trim() ? Number(latitude) : undefined;
    let lng = longitude?.trim() ? Number(longitude) : undefined;
    const radius = radiusKm?.trim() ? Number(radiusKm) : undefined;

    // When the client sends a city name but no coordinates (e.g. the mobile
    // app, or a shared link), resolve the city here so nearby towns are still
    // included in the radius search — no client update required.
    if (
      (!Number.isFinite(lat) || !Number.isFinite(lng)) &&
      city?.trim()
    ) {
      const coords = await this.geocode.geocodeCityCoordinates(city);
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    }

    const rows = await this.listings.search(
      q,
      city,
      lat,
      lng,
      Number.isFinite(radius) ? radius : undefined,
    );
    // Search cards don't need blocked ranges; keep payload light.
    return rows.map((l) => withApproximateLocation(l.toDetailDto()));
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
    return withApproximateLocation(await this.listings.toPublicDetailDto(l));
  }
}
