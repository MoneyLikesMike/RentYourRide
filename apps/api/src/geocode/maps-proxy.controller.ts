import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GeocodeService } from './geocode.service';
import { ListingsService } from '../listings/listings.service';

@ApiTags('geocode')
@Controller('maps-proxy/api/place')
export class MapsProxyController {
  constructor(
    private readonly geocode: GeocodeService,
    private readonly listings: ListingsService,
  ) {}

  @Get('autocomplete/json')
  async placesAutocomplete(@Query() query: Record<string, string>, @Res() res: Response) {
    const json = await this.geocode.proxyGoogleMapsApi('place/autocomplete/json', query);
    const predictions = json.predictions;
    const needsFallback =
      json.status === 'REQUEST_DENIED' ||
      json.status === 'INVALID_REQUEST' ||
      !Array.isArray(predictions) ||
      predictions.length === 0;

    if (needsFallback && typeof query.input === 'string' && query.input.trim().length >= 2) {
      const modern = await this.geocode.placesAutocompleteNew(query.input, query);
      if (modern?.status === 'OK' && Array.isArray(modern.predictions) && modern.predictions.length) {
        return res.status(200).json(modern);
      }

      const nominatim = await this.geocode.placesAutocompleteNominatim(query.input);
      if (
        nominatim?.status === 'OK' &&
        Array.isArray(nominatim.predictions) &&
        nominatim.predictions.length
      ) {
        return res.status(200).json(nominatim);
      }

      const cities = await this.listings.citySuggestions(query.input);
      if (cities.length) {
        return res.status(200).json({
          status: 'OK',
          predictions: cities.map((city) => ({
            description: `${city}, Canada`,
            place_id: `ryr-city:${encodeURIComponent(city)}`,
            structured_formatting: {
              main_text: city,
              secondary_text: 'Canada',
            },
          })),
        });
      }
    }
    res.status(200).json(json);
  }

  @Get('details/json')
  async placeDetails(@Query() query: Record<string, string>, @Res() res: Response) {
    const placeId = query.place_id;
    if (typeof placeId === 'string' && placeId.startsWith('ryr-city:')) {
      const city = decodeURIComponent(placeId.slice('ryr-city:'.length));
      return res.status(200).json({
        status: 'OK',
        result: {
          formatted_address: `${city}, Canada`,
          address_components: [
            { long_name: city, short_name: city, types: ['locality', 'political'] },
            { long_name: 'Canada', short_name: 'CA', types: ['country', 'political'] },
          ],
        },
      });
    }
    if (typeof placeId === 'string' && placeId.startsWith('nominatim:')) {
      const nominatim = await this.geocode.placeDetailsNominatim(placeId);
      if (nominatim) return res.status(200).json(nominatim);
    }
    const json = await this.geocode.proxyGoogleMapsApi('place/details/json', query);
    const needsFallback =
      json.status === 'REQUEST_DENIED' ||
      json.status === 'INVALID_REQUEST' ||
      !json.result;
    if (needsFallback && typeof placeId === 'string' && placeId.trim()) {
      const modern = await this.geocode.placeDetailsNew(placeId);
      if (modern) return res.status(200).json(modern);
    }
    res.status(200).json(json);
  }
}
