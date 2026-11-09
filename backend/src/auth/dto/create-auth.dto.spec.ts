import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createAuthDto } from './create-auth.dto';

const validRegistration = {
  name: 'Buyer Test',
  email: 'buyer@test.com',
  phone: '081234567890',
  address: 'Jl. Braga No. 1',
  city: 'Kota Bandung',
  cityCode: '32.73',
  password: 'password123',
};

async function invalidProperties(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(createAuthDto, payload), {
    whitelist: true,
  });

  return errors.map((error) => error.property);
}

describe('createAuthDto', () => {
  it('accepts valid registration data', async () => {
    const errors = await validate(
      plainToInstance(createAuthDto, validRegistration),
      { whitelist: true },
    );

    expect(errors).toHaveLength(0);
  });

  it('accepts a 14 digit phone number', async () => {
    const errors = await validate(
      plainToInstance(createAuthDto, {
        ...validRegistration,
        phone: '08123456789012',
      }),
      { whitelist: true },
    );

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['missing phone', { ...validRegistration, phone: undefined }, 'phone'],
    ['9 digit phone', { ...validRegistration, phone: '081234567' }, 'phone'],
    [
      '15 digit phone',
      { ...validRegistration, phone: '081234567890123' },
      'phone',
    ],
    [
      'phone with symbols',
      { ...validRegistration, phone: '0812-3456-7890' },
      'phone',
    ],
    ['missing city', { ...validRegistration, city: undefined }, 'city'],
    ['blank city', { ...validRegistration, city: '   ' }, 'city'],
    [
      'missing city code',
      { ...validRegistration, cityCode: undefined },
      'cityCode',
    ],
    [
      'invalid city code',
      { ...validRegistration, cityCode: '3273' },
      'cityCode',
    ],
    ['blank name', { ...validRegistration, name: '   ' }, 'name'],
  ])('rejects %s', async (_label, payload, property) => {
    expect(await invalidProperties(payload)).toContain(property);
  });
});
