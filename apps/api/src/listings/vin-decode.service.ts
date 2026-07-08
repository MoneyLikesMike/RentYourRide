import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type VinFieldOptions = {
  trim: string[];
  style: string[];
  transmission: string[];
  fuelType: string[];
};

export type VinVehicleData = {
  vin: string;
  year: string;
  make: string;
  model: string;
  body: string;
  style?: string;
  fuelType?: string;
  transmission?: string;
  trim?: string;
  driveType?: string;
  doors?: string;
  engineCylinders?: string;
  manufacturer?: string;
  fieldOptions: VinFieldOptions;
};

const DEFAULT_TRANSMISSION = ['Automatic', 'Manual'];
const DEFAULT_FUEL = ['Gasoline', 'Diesel', 'Hybrid', 'Electricity', 'Plug-in Hybrid'];

@Injectable()
export class VinDecodeService {
  private readonly log = new Logger(VinDecodeService.name);

  normalizeVin(vin: string): string {
    return vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  isValidVin(vin: string): boolean {
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(this.normalizeVin(vin));
  }

  async decode(vin: string): Promise<VinVehicleData> {
    const normalized = this.normalizeVin(vin);
    if (!this.isValidVin(normalized)) {
      throw new BadRequestException('VIN must be 17 characters (no I, O, or Q)');
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(normalized)}?format=json`;

    let json: { Results?: Array<Record<string, string>> };
    try {
      const res = await fetch(url);
      json = (await res.json()) as { Results?: Array<Record<string, string>> };
    } catch (err) {
      this.log.warn('NHTSA VIN decode request failed', err instanceof Error ? err.message : err);
      throw new BadRequestException('Could not reach VIN decoder service');
    }

    const row = json.Results?.[0];
    if (!row) {
      throw new BadRequestException('Could not decode VIN');
    }

    const make = (row.Make || '').trim();
    const model = (row.Model || '').trim();
    const year = (row.ModelYear || '').trim();

    if (!make && !model) {
      const errorText = (row.ErrorText || 'Unknown VIN').trim();
      throw new BadRequestException(errorText || 'Could not decode VIN');
    }

    const transmission =
      mapTransmission(row.TransmissionStyle) ||
      mapTransmission(row.TransmissionStylePrimary) ||
      inferTransmissionFromSpecs(row);
    const fuelType =
      mapFuelType(row.FuelTypePrimary) || mapFuelType(row.FuelTypeSecondary);
    const style = mapBodyToStyle(row.BodyClass, row.Doors);

    const canadian = await this.fetchCanadianFieldOptions(year, make, model);

    const trimParts = uniqueLabels(
      canadian.trimOptions,
      splitMultiValue(row.Trim),
      splitMultiValue(row.Series).filter((part) => !isInternalSeriesCode(part)),
    );

    const trimOptions = uniqueLabels(trimParts);
    const styleOptions = uniqueLabels(
      canadian.styleOptions,
      style ? [style] : [],
      bodyClassStyleOptions(row.BodyClass, row.Doors),
    );

    const transmissionOptions = uniqueLabels(
      transmission ? [transmission] : [],
      DEFAULT_TRANSMISSION,
    );
    const fuelTypeOptions = uniqueLabels(
      fuelType ? [fuelType] : [],
      DEFAULT_FUEL,
    );

    const trim =
      trimParts.length === 1 ? trimParts[0] : undefined;

    return {
      vin: normalized,
      year: year || '',
      make,
      model,
      body: (row.BodyClass || row.VehicleType || '').trim(),
      style,
      fuelType,
      transmission,
      trim,
      driveType: (row.DriveType || '').trim() || undefined,
      doors: (row.Doors || '').trim() || undefined,
      engineCylinders: (row.EngineCylinders || '').trim() || undefined,
      manufacturer: (row.Manufacturer || '').trim() || undefined,
      fieldOptions: {
        trim: trimOptions.length ? trimOptions : ['Base'],
        style: styleOptions.length ? styleOptions : defaultStyleOptions(),
        transmission: transmissionOptions,
        fuelType: fuelTypeOptions,
      },
    };
  }

  private async fetchCanadianFieldOptions(
    year: string,
    make: string,
    model: string,
  ): Promise<{ trimOptions: string[]; styleOptions: string[] }> {
    if (!year || !make || !model) {
      return { trimOptions: [], styleOptions: [] };
    }
    try {
      const params = new URLSearchParams({
        year,
        make,
        model,
        units: 'Metric',
        format: 'json',
      });
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/?${params.toString()}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        Results?: Array<{ Specs?: Array<{ Name: string; Value: string }> }>;
      };

      const trimOptions: string[] = [];
      const styleOptions: string[] = [];
      for (const entry of json.Results ?? []) {
        const modelLine = entry.Specs?.find((s) => s.Name === 'Model')?.Value;
        if (!modelLine) continue;
        const parsed = parseCanadianModelLine(modelLine, model);
        trimOptions.push(...parsed.trims);
        if (parsed.style) styleOptions.push(parsed.style);
      }
      return {
        trimOptions: uniqueLabels(trimOptions),
        styleOptions: uniqueLabels(styleOptions),
      };
    } catch (err) {
      this.log.debug(
        `Canadian vehicle specs unavailable for ${year} ${make} ${model}`,
        err instanceof Error ? err.message : err,
      );
      return { trimOptions: [], styleOptions: [] };
    }
  }
}

function splitMultiValue(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[/,|]/)
    .map((part) => normalizeVehicleLabel(part.trim()))
    .filter(Boolean);
}

function uniqueLabels(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const item of group) {
      const label = normalizeVehicleLabel(item);
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
  }
  return out;
}

function normalizeVehicleLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (/^[A-Za-z]{1,4}$/.test(word)) return word.toUpperCase();
      if (/^[A-Z0-9][A-Z0-9+\-]*$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (/^\d+DR$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function mapFuelType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('plug-in') || v.includes('plug in')) return 'Plug-in Hybrid';
  if (v.includes('hybrid')) return 'Hybrid';
  if (v.includes('electric')) return 'Electricity';
  if (v.includes('diesel')) return 'Diesel';
  if (v.includes('gas') || v.includes('gasoline') || v.includes('petrol')) return 'Gasoline';
  return undefined;
}

function mapTransmission(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('manual')) return 'Manual';
  if (
    v.includes('auto') ||
    v.includes('cvt') ||
    v.includes('continuously') ||
    v.includes('dual clutch') ||
    v.includes('dct')
  ) {
    return 'Automatic';
  }
  return undefined;
}

function mapBodyToStyle(bodyClass?: string, doors?: string): string | undefined {
  if (!bodyClass?.trim()) return undefined;
  const primary = bodyClass.split('/')[0].trim().toLowerCase();
  const doorCount = doors?.trim();
  const doorPrefix =
    doorCount && doorCount !== 'Not Applicable' && /^\d+$/.test(doorCount)
      ? `${doorCount}dr `
      : '';

  if (primary.includes('sedan') || primary.includes('saloon')) {
    return normalizeStyle(`${doorPrefix || '4dr '}Sedan`.trim());
  }
  if (primary.includes('suv') || primary.includes('sport utility')) {
    return normalizeStyle(`${doorPrefix || '4dr '}SUV`.trim());
  }
  if (primary.includes('coupe')) return normalizeStyle(`${doorPrefix || '2dr '}Coupe`.trim());
  if (primary.includes('hatchback')) return normalizeStyle(`${doorPrefix || '4dr '}Hatchback`.trim());
  if (primary.includes('wagon')) return normalizeStyle(`${doorPrefix || '4dr '}Wagon`.trim());
  if (primary.includes('convertible')) return normalizeStyle(`${doorPrefix || '2dr '}Convertible`.trim());
  if (primary.includes('pickup') || primary.includes('truck')) {
    return normalizeStyle(`${doorPrefix || '4dr '}Pickup`.trim());
  }
  if (primary.includes('van') || primary.includes('minivan')) {
    return normalizeStyle(`${doorPrefix || '4dr '}Van`.trim());
  }
  return normalizeVehicleLabel(bodyClass.split('/')[0]);
}

function bodyClassStyleOptions(bodyClass?: string, doors?: string): string[] {
  const mapped = mapBodyToStyle(bodyClass, doors);
  return mapped ? [mapped] : [];
}

function defaultStyleOptions(): string[] {
  return ['4dr Sedan', '2dr Coupe', '4dr Hatchback', '5dr SUV', '4dr Wagon', '4dr Pickup'];
}

/** Parse Canadian spec lines like "CAMRY 4DR SEDAN LE" or "CAMRY LE/SE/XLE 4DR SEDAN". */
function parseCanadianModelLine(
  modelLine: string,
  baseModel: string,
): { style?: string; trims: string[] } {
  let rest = modelLine.trim();
  const base = baseModel.trim();
  if (rest.toLowerCase().startsWith(base.toLowerCase())) {
    rest = rest.slice(base.length).trim();
  }

  let style: string | undefined;
  const styleMatches = [
    ...rest.matchAll(
      /\d+\s*DR\s+(?:SEDAN|SALOON|SUV|COUPE|HATCHBACK|WAGON|PICKUP|VAN|MINIVAN|CONVERTIBLE)(?:\s+HYBRID)?/gi,
    ),
  ];
  for (const match of styleMatches) {
    const candidate = normalizeStyle(match[0]);
    if (/sedan|saloon|suv|coupe|hatchback|wagon|pickup|van|minivan/i.test(candidate)) {
      style = candidate;
    }
  }
  if (styleMatches.length) {
    rest = rest
      .replace(
        /\d+\s*DR\s+(?:SEDAN|SALOON|SUV|COUPE|HATCHBACK|WAGON|PICKUP|VAN|MINIVAN|CONVERTIBLE)(?:\s+HYBRID)?/gi,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  rest = rest.replace(/^HYBRID\s+/i, 'Hybrid ').trim();

  const trims = rest.includes('/')
    ? rest.split('/').map((part) => normalizeVehicleLabel(part.trim())).filter(Boolean)
    : rest
      ? [normalizeVehicleLabel(rest)]
      : [];

  return { style, trims };
}

function normalizeStyle(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2 && /^\d+DR$/i.test(parts[0])) {
    const doors = parts[0].replace(/DR$/i, 'dr');
    const body = parts
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return `${doors} ${body}`;
  }
  return normalizeVehicleLabel(raw);
}

function isInternalSeriesCode(label: string): boolean {
  return /^[A-Z0-9]{5,}$/.test(label.trim());
}

function inferTransmissionFromSpecs(row: Record<string, string>): string | undefined {
  const hints = [
    row.TransmissionStyle,
    row.TransmissionStylePrimary,
    row.TransmissionStyleSecondary,
    row.Transmission,
  ]
    .filter(Boolean)
    .join(' ');
  return mapTransmission(hints);
}
