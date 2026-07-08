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

  /** Proxy Places / Geocoding REST calls — injects server key, strips client key. */
  async proxyGoogleMapsApi(
    apiPath: string,
    query: Record<string, string | string[] | undefined>,
  ): Promise<Record<string, unknown>> {
    const key = this.googleMapsApiKey();
    if (!key) {
      throw new BadRequestException('Location search is not configured on the server');
    }

    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
      if (name === 'key' || value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry) params.append(name, entry);
        });
      } else if (value) {
        params.set(name, value);
      }
    }
    params.set('key', key);

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
      // Return Google's JSON shape so mobile clients get error_message with HTTP 200.
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

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Invalid coordinates');
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Coordinates out of range');
    }

    const cacheKey = GeocodeService.cacheKey(latitude, longitude);
    const existing = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (existing) {
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
      this.log.warn('[geocode-dev] No GOOGLE_GEOCODING_API_KEY — returning coordinate label');
      const fallback = {
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
      return fallback;
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

    const parsed = this.parseGoogleResult(json.results[0]);
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

    return { ...parsed, latitude, longitude, cached: false };
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
