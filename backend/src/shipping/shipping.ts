import { BadRequestException } from '@nestjs/common';
import { CITY_COORDINATES, CityCoordinate } from './city-coordinates';

export type ShippingMethod = 'REGULAR' | 'FAST';

export const SHIPPING_METHODS: ShippingMethod[] = ['REGULAR', 'FAST'];

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  REGULAR: 'Kurir Lokal NusaRoast',
  FAST: 'Express NusaRoast',
};

export const SHIPPING_METHOD_DESCRIPTIONS: Record<ShippingMethod, string> = {
  REGULAR: 'Estimasi 2–4 jam',
  FAST: 'Estimasi 1–2 jam',
};

export const SHIPPING_ORIGIN = {
  name: 'Gudang NusaRoast, Bekasi Barat',
  cityCode: '32.75',
  cityName: 'Kota Bekasi',
  latitude: -6.233559299061097,
  longitude: 106.96281200530314,
} as const;

export const MAX_SHIPPING_RANGE_KM = 150;

export type ShippingZoneCode =
  'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ZONE_4' | 'ZONE_5';

export type ShippingZone = {
  code: ShippingZoneCode;
  label: string;
  maxKm: number | null;
  rates: Record<ShippingMethod, number>;
};

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    code: 'ZONE_1',
    label: '0-10 km',
    maxKm: 10,
    rates: { REGULAR: 10000, FAST: 15000 },
  },
  {
    code: 'ZONE_2',
    label: '10-25 km',
    maxKm: 25,
    rates: { REGULAR: 15000, FAST: 22000 },
  },
  {
    code: 'ZONE_3',
    label: '25-50 km',
    maxKm: 50,
    rates: { REGULAR: 20000, FAST: 30000 },
  },
  {
    code: 'ZONE_4',
    label: '50-100 km',
    maxKm: 100,
    rates: { REGULAR: 30000, FAST: 45000 },
  },
  {
    code: 'ZONE_5',
    label: '>100 km',
    maxKm: null,
    rates: { REGULAR: 40000, FAST: 60000 },
  },
];

export type ShippingQuoteForCity = {
  origin: typeof SHIPPING_ORIGIN;
  destination: CityCoordinate;
  distanceKm: number;
  zone: {
    code: ShippingZoneCode;
    label: string;
    maxKm: number | null;
  };
  options: Array<{
    method: ShippingMethod;
    label: string;
    description: string;
    cost: number;
  }>;
};

export type ShippingQuote = ShippingQuoteForCity & {
  method: ShippingMethod;
  cost: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return value === 'REGULAR' || value === 'FAST';
}

export function getCityByCode(
  cityCode: string | null | undefined,
): CityCoordinate | null {
  if (!cityCode) {
    return null;
  }

  return CITY_COORDINATES[cityCode.trim()] ?? null;
}

export function isKnownCityCode(cityCode: string | null | undefined): boolean {
  return getCityByCode(cityCode) !== null;
}

export function haversineDistanceKm(
  from: Coordinates,
  to: Coordinates,
): number {
  const earthRadiusKm = 6371.0088;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export function resolveShippingZone(distanceKm: number): ShippingZone {
  const zone = SHIPPING_ZONES.find(
    (candidate) => candidate.maxKm === null || distanceKm <= candidate.maxKm,
  );

  if (!zone) {
    throw new BadRequestException('Zona pengiriman tidak ditemukan');
  }

  return zone;
}

export function getShippingQuoteForCity(
  cityCode: string | null | undefined,
): ShippingQuoteForCity {
  const destination = getCityByCode(cityCode);

  if (!destination) {
    throw new BadRequestException(
      'Kota pengiriman tidak dikenali. Lengkapi kota/kabupaten di profil.',
    );
  }

  const distanceKm = roundTo(
    haversineDistanceKm(SHIPPING_ORIGIN, destination),
    2,
  );

  if (distanceKm > MAX_SHIPPING_RANGE_KM) {
    throw new BadRequestException(
      `Alamat Anda berada di luar jangkauan kurir lokal kami (maksimal ${MAX_SHIPPING_RANGE_KM} km dari ${SHIPPING_ORIGIN.name}). Jarak aktual: ${distanceKm} km.`,
    );
  }

  const zone = resolveShippingZone(distanceKm);

  return {
    origin: SHIPPING_ORIGIN,
    destination,
    distanceKm,
    zone: {
      code: zone.code,
      label: zone.label,
      maxKm: zone.maxKm,
    },
    options: SHIPPING_METHODS.map((method) => ({
      method,
      label: SHIPPING_METHOD_LABELS[method],
      description: SHIPPING_METHOD_DESCRIPTIONS[method],
      cost: zone.rates[method],
    })),
  };
}

export function getShippingQuote(
  cityCode: string | null | undefined,
  method: ShippingMethod,
): ShippingQuote {
  if (!isShippingMethod(method)) {
    throw new BadRequestException('Metode pengiriman tidak valid');
  }

  const quote = getShippingQuoteForCity(cityCode);
  const option = quote.options.find((item) => item.method === method);

  if (!option) {
    throw new BadRequestException('Metode pengiriman tidak tersedia');
  }

  return {
    ...quote,
    method,
    cost: option.cost,
  };
}
