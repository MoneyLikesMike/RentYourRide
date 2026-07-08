import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GeocodeService } from './geocode.service';

@ApiTags('geocode')
@Controller('maps-proxy/api/place')
export class MapsProxyController {
  constructor(private readonly geocode: GeocodeService) {}

  @Get('autocomplete/json')
  async placesAutocomplete(@Query() query: Record<string, string>, @Res() res: Response) {
    const json = await this.geocode.proxyGoogleMapsApi('place/autocomplete/json', query);
    res.status(200).json(json);
  }

  @Get('details/json')
  async placeDetails(@Query() query: Record<string, string>, @Res() res: Response) {
    const json = await this.geocode.proxyGoogleMapsApi('place/details/json', query);
    res.status(200).json(json);
  }
}
