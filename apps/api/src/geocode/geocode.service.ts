import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeocodeCacheEntity } from '../entities/geocode-cache.entity';

export type GeocodeResult = {
  formatted: string;
  city: string;
  region: string;
  country: string;
  street: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  cached: boolean;
};

@Injectable()
export class GeocodeService {
  private readonly log = new Logger(GeocodeService.name);

  constructor(
    @InjectRepository(GeocodeCacheEntity)
    private readonly cacheRepo: Repository<GeocodeCacheEntity>,
    private readonly config: ConfigService,
  ) {}

  static cacheKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  }

  private googleMapsApiKey(): string | undefined {
    const key =
      this.config.get<string>('GOOGLE_PLACES_API_KEY') ||
      this.config.get<string>('GOOGLE_GEOCODING_API_KEY') ||
      this.config.get<string>('GOOGLE_MAPS_KEY');
    const trimmed = key?.trim();
    return trimmed || undefined;
  }

  /** Dev API with Google key IP allowlist — used when prod egress is not whitelisted. */
  private bedevApiBase(): string | undefined {
    const base = this.config.get<string>('BEDEV_API_BASE_URL')?.trim().replace(/\/$/, '');
    return base || undefined;
  }

  private mapsQueryToSearchParams(
    query: Record<string, string | string[] | undefined>,
    includeKey = false,
    key?: string,
  ): URLSearchParams {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
      if ((!includeKey && name === 'key') || value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry) params.append(name, entry);
        });
      } else if (value) {
        params.set(name, value);
      }
    }
    if (includeKey && key) params.set('key', key);
    return params;
  }

  private async proxyGoogleMapsViaBedev(
    apiPath: string,
    query: Record<string, string | string[] | undefined>,
  ): Promise<Record<string, unknown> | null> {
    const base = this.bedevApiBase();
    if (!base) return null;

    const params = this.mapsQueryToSearchParams(query);
    const url = `${base}/v1/maps-proxy/api/${apiPath}?${params.toString()}`;

    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const json = (await res.json()) as Record<string, unknown>;
      if (json.status === 'OK') return json;
      if (Array.isArray(json.predictions) && json.predictions.length) {
        return { ...json, status: 'OK' };
      }
      return null;
    } catch (err) {
      this.log.warn(
        `Bedev maps proxy (${apiPath}) failed`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  private async reverseGeocodeViaBedev(
    latitude: number,
    longitude: number,
  ): Promise<Omit<GeocodeResult, 'cached'> | null> {
    const base = this.bedevApiBase();
    if (!base) return null;

    try {
      const res = await fetch(`${base}/v1/geocode/reverse`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as GeocodeResult;
      if (!json.city?.trim() && this.isCoordinateLabel(json.formatted)) return null;
      return {
        formatted: json.formatted,
        city: json.city,
        region: json.region,
        country: json.country,
        street: json.street,
        postalCode: json.postalCode,
        latitude: json.latitude ?? latitude,
        longitude: json.longitude ?? longitude,
      };
    } catch (err) {
      this.log.warn(
        'Bedev reverse geocode failed',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  private isCoordinateLabel(value: string | undefined): boolean {
    if (!value?.trim()) return false;
    return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
  }

  /** Proxy Places / Geocoding REST calls — injects server key, strips client key. */
  async proxyGoogleMapsApi(
    apiPath: string,
    query: Record<string, string | string[] | undefined>,
  ): Promise<Record<string, unknown>> {
    const key = this.googleMapsApiKey();
    if (!key) {
      throw new BadRequestException('Location search is not configured on the server');
    }

    const params = this.mapsQueryToSearchParams(query, true, key);
    const url = `https://maps.googleapis.com/maps/api/${apiPath}?${params.toString()}`;

    let json: Record<string, unknown>;
    try {
      const res = await fetch(url);
      json = (await res.json()) as Record<string, unknown>;
    } catch (err) {
      this.log.error(
        `Google Maps proxy (${apiPath}) failed`,
        err instanceof Error ? err.stack : err,
      );
      throw new BadRequestException('Could not load location suggestions');
    }

    if (json.status === 'REQUEST_DENIED' || json.status === 'INVALID_REQUEST') {
      const message =
        typeof json.error_message === 'string'
          ? json.error_message
          : 'Location search is not authorized on the server';
      this.log.warn(`Google Maps proxy (${apiPath}): ${message}`);
      const bedev = await this.proxyGoogleMapsViaBedev(apiPath, query);
      if (bedev) {
        this.log.log(`Google Maps proxy (${apiPath}): served via bedev fallback`);
        return bedev;
      }
      return json;
    }

    if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      const message =
        typeof json.error_message === 'string'
          ? json.error_message
          : `Google Maps proxy (${apiPath}) returned ${String(json.status)}`;
      this.log.warn(message);
      return json;
    }

    return json;
  }

  /** Places API (New) — works with `places.googleapis.com` key restriction. */
  async placesAutocompleteNew(
    input: string,
    query: Record<string, string | string[] | undefined> = {},
  ): Promise<Record<string, unknown> | null> {
    const key = this.googleMapsApiKey();
    const trimmed = input.trim();
    if (!key || trimmed.length < 2) return null;

    const language = typeof query.language === 'string' ? query.language : 'en';
    const body = {
      input: trimmed,
      includedRegionCodes: ['ca', 'us'],
      languageCode: language,
    };

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (json.error || !res.ok) {
        const bedev = await this.proxyGoogleMapsViaBedev('place/autocomplete/json', {
          input: trimmed,
          language,
          components: 'country:ca|country:us',
        });
        if (bedev) return bedev;
        return null;
      }
      const suggestions = Array.isArray(json.suggestions) ? json.suggestions : [];
      const predictions = suggestions
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const prediction = (row as { placePrediction?: Record<string, unknown> }).placePrediction;
          if (!prediction || typeof prediction !== 'object') return null;
          const text =
            typeof (prediction.text as { text?: string } | undefined)?.text === 'string'
              ? (prediction.text as { text: string }).text
              : '';
          const placeId = typeof prediction.placeId === 'string' ? prediction.placeId : '';
          const mainText =
            typeof (prediction.structuredFormat as { mainText?: { text?: string } } | undefined)
              ?.mainText?.text === 'string'
              ? (prediction.structuredFormat as { mainText: { text: string } }).mainText.text
              : text;
          const secondaryText =
            typeof (prediction.structuredFormat as { secondaryText?: { text?: string } } | undefined)
              ?.secondaryText?.text === 'string'
              ? (prediction.structuredFormat as { secondaryText: { text: string } }).secondaryText
                  .text
              : '';
          if (!text || !placeId) return null;
          return {
            description: text,
            place_id: placeId,
            structured_formatting: {
              main_text: mainText,
              secondary_text: secondaryText,
            },
          };
        })
        .filter(Boolean);

      return {
        status: predictions.length ? 'OK' : 'ZERO_RESULTS',
        predictions,
      };
    } catch (err) {
      this.log.warn(
        'Places API (New) autocomplete failed',
        err instanceof Error ? err.message : err,
      );
      const bedev = await this.proxyGoogleMapsViaBedev('place/autocomplete/json', {
        input: trimmed,
        language: typeof query.language === 'string' ? query.language : 'en',
        components: 'country:ca|country:us',
      });
      if (bedev) return bedev;
      return null;
    }
  }

  /** OpenStreetMap search fallback when Google Places is unavailable. */
  async placesAutocompleteNominatim(input: string): Promise<Record<string, unknown> | null> {
    const trimmed = input.trim();
    if (trimmed.length < 2) return null;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '8');
    url.searchParams.set('countrycodes', 'ca,us');

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'RentYourRide/1.0 (support@rentyourride.ca)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) return null;

      const rows = (await res.json()) as Array<{
        place_id?: number;
        lat?: string;
        lon?: string;
        name?: string;
        display_name?: string;
        address?: Record<string, string | undefined>;
      }>;
      if (!Array.isArray(rows) || !rows.length) {
        return { status: 'ZERO_RESULTS', predictions: [] };
      }

      const predictions = rows
        .map((row) => {
          const lat = row.lat ? Number(row.lat) : NaN;
          const lon = row.lon ? Number(row.lon) : NaN;
          const display = row.display_name?.trim() || '';
          if (!display || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          const city = this.pickCityFromAddress(row.address || {});
          const mainText = row.name?.trim() || city || display.split(',')[0]?.trim() || display;
          const secondaryText =
            display === mainText
              ? [row.address?.state, row.address?.country].filter(Boolean).join(', ')
              : display.replace(new RegExp(`^${mainText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*`), '');

          return {
            description: display,
            place_id: `nominatim:${lat},${lon}`,
            structured_formatting: {
              main_text: mainText,
              secondary_text: secondaryText,
            },
          };
        })
        .filter(Boolean);

      return {
        status: predictions.length ? 'OK' : 'ZERO_RESULTS',
        predictions,
      };
    } catch (err) {
      this.log.warn(
        'Nominatim autocomplete failed',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async placeDetailsNominatim(placeId: string): Promise<Record<string, unknown> | null> {
    const coords = placeId.slice('nominatim:'.length).split(',');
    if (coords.length !== 2) return null;
    const latitude = Number(coords[0]);
    const longitude = Number(coords[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const parsed = await this.reverseGeocodeNominatim(latitude, longitude);
    if (!parsed) return null;

    const components: Array<{ long_name: string; short_name: string; types: string[] }> = [];
    if (parsed.city) {
      components.push({
        long_name: parsed.city,
        short_name: parsed.city,
        types: ['locality', 'political'],
      });
    }
    if (parsed.region) {
      components.push({
        long_name: parsed.region,
        short_name: parsed.region,
        types: ['administrative_area_level_1', 'political'],
      });
    }
    if (parsed.country) {
      components.push({
        long_name: parsed.country,
        short_name: parsed.country,
        types: ['country', 'political'],
      });
    }
    if (parsed.postalCode) {
      components.push({
        long_name: parsed.postalCode,
        short_name: parsed.postalCode,
        types: ['postal_code'],
      });
    }
    if (parsed.street) {
      components.push({
        long_name: parsed.street,
        short_name: parsed.street,
        types: ['route'],
      });
    }

    return {
      status: 'OK',
      result: {
        formatted_address: parsed.formatted,
        address_components: components,
        geometry: {
          location: {
            lat: latitude,
            lng: longitude,
          },
        },
      },
    };
  }

  /** Place Details (New) mapped to legacy `result` shape for the mobile client. */
  async placeDetailsNew(placeId: string): Promise<Record<string, unknown> | null> {
    const key = this.googleMapsApiKey();
    if (!key || !placeId.trim()) return null;
    const id = encodeURIComponent(placeId.trim());

    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
        },
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (json.error) return null;

      const components = Array.isArray(json.addressComponents)
        ? json.addressComponents.map((c) => {
            const row = c as Record<string, unknown>;
            const types = Array.isArray(row.types) ? row.types.map(String) : [];
            return {
              long_name: typeof row.longText === 'string' ? row.longText : '',
              short_name: typeof row.shortText === 'string' ? row.shortText : '',
              types,
            };
          })
        : [];

      const location = json.location as { latitude?: number; longitude?: number } | undefined;

      return {
        status: 'OK',
        result: {
          formatted_address:
            typeof json.formattedAddress === 'string' ? json.formattedAddress : '',
          address_components: components,
          geometry: {
            location: {
              lat: location?.latitude ?? null,
              lng: location?.longitude ?? null,
            },
          },
        },
      };
    } catch (err) {
      this.log.warn('Places API (New) details failed', err instanceof Error ? err.message : err);
      return null;
    }
  }

  private parseGoogleResult(result: {
    formatted_address?: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
    geometry?: { location?: { lat: number; lng: number } };
  }): Omit<GeocodeResult, 'cached'> {
    const components = result.address_components || [];
    const find = (type: string) =>
      components.find((c) => c.types?.includes(type))?.long_name || '';

    const streetNumber = find('street_number');
    const route = find('route');
    const street = [streetNumber, route].filter(Boolean).join(' ');

    return {
      formatted: result.formatted_address || '',
      city:
        find('locality') ||
        find('postal_town') ||
        find('administrative_area_level_2') ||
        '',
      region: find('administrative_area_level_1') || '',
      country: find('country') || '',
      street,
      postalCode: find('postal_code') || '',
      latitude: result.geometry?.location?.lat ?? 0,
      longitude: result.geometry?.location?.lng ?? 0,
    };
  }

  private pickCityFromAddress(address: Record<string, string | undefined>): string {
    return (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      ''
    );
  }

  private async reverseGeocodeNominatim(
    latitude: number,
    longitude: number,
  ): Promise<Omit<GeocodeResult, 'cached'> | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'RentYourRide/1.0 (support@rentyourride.ca)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) return null;

      const json = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string | undefined>;
      };
      const address = json.address || {};
      const city = this.pickCityFromAddress(address);
      const region = address.state || address.province || '';
      const country = address.country || '';
      const street = [address.house_number, address.road].filter(Boolean).join(' ').trim();
      const formatted =
        json.display_name ||
        [street, city, region, country].filter(Boolean).join(', ');

      if (!city && !formatted) return null;

      return {
        formatted,
        city,
        region,
        country,
        street,
        postalCode: address.postcode || '',
        latitude,
        longitude,
      };
    } catch (err) {
      this.log.warn(
        'Nominatim reverse geocode failed',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  private coordinateFallback(latitude: number, longitude: number): GeocodeResult {
    return {
      formatted: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      city: '',
      region: '',
      country: '',
      street: '',
      postalCode: '',
      latitude,
      longitude,
      cached: false,
    };
  }

  private async saveGeocodeCache(
    cacheKey: string,
    latitude: number,
    longitude: number,
    parsed: Omit<GeocodeResult, 'cached'>,
  ): Promise<GeocodeResult> {
    const row = this.cacheRepo.create({
      cacheKey,
      latitude,
      longitude,
      formatted: parsed.formatted,
      city: parsed.city,
      region: parsed.region,
      country: parsed.country,
      street: parsed.street,
      postalCode: parsed.postalCode,
    });
    await this.cacheRepo.save(row);
    return { ...parsed, cached: false };
  }

  private async reverseGeocodeFallback(
    latitude: number,
    longitude: number,
  ): Promise<Omit<GeocodeResult, 'cached'> | null> {
    const bedev = await this.reverseGeocodeViaBedev(latitude, longitude);
    if (bedev) return bedev;
    return this.reverseGeocodeNominatim(latitude, longitude);
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Invalid coordinates');
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Coordinates out of range');
    }

    const cacheKey = GeocodeService.cacheKey(latitude, longitude);
    const existing = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (existing && existing.city?.trim()) {
      return {
        formatted: existing.formatted,
        city: existing.city,
        region: existing.region,
        country: existing.country,
        street: existing.street,
        postalCode: existing.postalCode,
        latitude: existing.latitude,
        longitude: existing.longitude,
        cached: true,
      };
    }

    const key = this.googleMapsApiKey();
    if (!key) {
      this.log.warn('[geocode] No GOOGLE_GEOCODING_API_KEY — trying bedev/Nominatim fallback');
      const fallback = await this.reverseGeocodeFallback(latitude, longitude);
      if (fallback) {
        return this.saveGeocodeCache(cacheKey, latitude, longitude, fallback);
      }
      return this.coordinateFallback(latitude, longitude);
    }

    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key,
      language: 'en',
    });

    let json: {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
        geometry?: { location?: { lat: number; lng: number } };
      }>;
      error_message?: string;
    };

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      );
      json = await res.json();
    } catch (err) {
      this.log.error('Google Geocoding request failed', err instanceof Error ? err.stack : err);
      throw new BadRequestException('Could not reverse geocode location');
    }

    if (json.status !== 'OK' || !json.results?.length) {
      this.log.warn(`Geocoding API: ${json.status} ${json.error_message || ''}`);
      const fallback = await this.reverseGeocodeFallback(latitude, longitude);
      if (fallback) {
        return this.saveGeocodeCache(cacheKey, latitude, longitude, fallback);
      }
      return this.coordinateFallback(latitude, longitude);
    }

    const parsed = this.parseGoogleResult(json.results[0]);
    return this.saveGeocodeCache(cacheKey, latitude, longitude, parsed);
  }

  async forwardGeocode(address: string): Promise<GeocodeResult> {
    const query = address.trim();
    if (!query) {
      throw new BadRequestException('Address required');
    }

    const key = this.googleMapsApiKey();
    if (!key) {
      throw new BadRequestException('Geocoding is not configured on the server');
    }

    const params = new URLSearchParams({
      address: query,
      key,
      language: 'en',
    });

    let json: {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
        geometry?: { location?: { lat: number; lng: number } };
      }>;
      error_message?: string;
    };

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      );
      json = await res.json();
    } catch (err) {
      this.log.error('Google forward geocode failed', err instanceof Error ? err.stack : err);
      throw new BadRequestException('Could not geocode address');
    }

    if (json.status !== 'OK' || !json.results?.length) {
      throw new BadRequestException('Could not find that location on the map');
    }

    const parsed = this.parseGoogleResult(json.results[0]);
    const latitude = parsed.latitude;
    const longitude = parsed.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Could not find that location on the map');
    }

    return { ...parsed, latitude, longitude, cached: false };
  }
}
