import { BadRequestException } from '@nestjs/common';
import {
  getCityByCode,
  getShippingQuote,
  getShippingQuoteForCity,
  haversineDistanceKm,
  isKnownCityCode,
  resolveShippingZone,
  SHIPPING_ORIGIN,
  ShippingMethod,
} from './shipping';

describe('shipping', () => {
  it('finds a city by trimmed code', () => {
    expect(getCityByCode(' 32.73 ')?.name).toBe('Kota Bandung');
    expect(getCityByCode('')).toBeNull();
    expect(getCityByCode('99.99')).toBeNull();
    expect(isKnownCityCode('32.75')).toBe(true);
    expect(isKnownCityCode('99.99')).toBe(false);
  });

  it('calculates the distance from Bekasi Barat to Kota Bandung', () => {
    const bandung = getCityByCode('32.73');

    expect(bandung).not.toBeNull();
    expect(haversineDistanceKm(SHIPPING_ORIGIN, bandung!)).toBeCloseTo(
      103.81,
      2,
    );
  });

  it('resolves zone boundaries', () => {
    expect(resolveShippingZone(0).code).toBe('ZONE_1');
    expect(resolveShippingZone(10).code).toBe('ZONE_1');
    expect(resolveShippingZone(10.01).code).toBe('ZONE_2');
    expect(resolveShippingZone(25).code).toBe('ZONE_2');
    expect(resolveShippingZone(25.01).code).toBe('ZONE_3');
    expect(resolveShippingZone(50).code).toBe('ZONE_3');
    expect(resolveShippingZone(50.01).code).toBe('ZONE_4');
    expect(resolveShippingZone(100).code).toBe('ZONE_4');
    expect(resolveShippingZone(100.01).code).toBe('ZONE_5');
  });

  it('returns both shipping options for the destination', () => {
    const quote = getShippingQuoteForCity('32.73');

    expect(quote.origin.cityCode).toBe('32.75');
    expect(quote.destination.name).toBe('Kota Bandung');
    expect(quote.zone.code).toBe('ZONE_5');
    expect(quote.options).toEqual([
      expect.objectContaining({ method: 'REGULAR', cost: 40000 }),
      expect.objectContaining({ method: 'FAST', cost: 60000 }),
    ]);
  });

  it('returns the selected method cost', () => {
    const quote = getShippingQuote('32.73', 'FAST');

    expect(quote.method).toBe('FAST');
    expect(quote.cost).toBe(60000);
  });

  it('uses zone 1 for the origin city', () => {
    const quote = getShippingQuote('32.75', 'REGULAR');

    expect(quote.distanceKm).toBeCloseTo(3.49, 2);
    expect(quote.zone.code).toBe('ZONE_1');
    expect(quote.cost).toBe(10000);
  });

  it('rejects an unknown or missing city', () => {
    expect(() => getShippingQuoteForCity(null)).toThrow(BadRequestException);
    expect(() => getShippingQuoteForCity('99.99')).toThrow(BadRequestException);
  });

  it('rejects an unsupported shipping method', () => {
    expect(() =>
      getShippingQuote('32.73', 'EXPRESS' as ShippingMethod),
    ).toThrow(BadRequestException);
  });
});
