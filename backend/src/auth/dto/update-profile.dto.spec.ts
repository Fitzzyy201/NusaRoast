import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { updateProfileDto } from './update-profile.dto';

async function invalidProperties(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(updateProfileDto, payload), {
    whitelist: true,
  });

  return errors.map((error) => error.property);
}

describe('updateProfileDto', () => {
  it('accepts an empty update object', async () => {
    const errors = await validate(plainToInstance(updateProfileDto, {}), {
      whitelist: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts profile fields including avatar removal', async () => {
    const errors = await validate(
      plainToInstance(updateProfileDto, {
        name: 'Buyer Baru',
        phone: '081234567890',
        address: 'Jl. Braga No. 1',
        city: 'Kota Bandung',
        cityCode: '32.73',
        avatarBase64: '',
      }),
      { whitelist: true },
    );

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['blank name', { name: '   ' }, 'name'],
    ['blank city', { city: '   ' }, 'city'],
    ['9 digit phone', { phone: '081234567' }, 'phone'],
    ['15 digit phone', { phone: '081234567890123' }, 'phone'],
    ['phone with symbols', { phone: '0812-3456-7890' }, 'phone'],
    ['invalid city code', { cityCode: '3273' }, 'cityCode'],
    ['oversized avatar', { avatarBase64: 'a'.repeat(120_001) }, 'avatarBase64'],
  ])('rejects %s', async (_label, payload, property) => {
    expect(await invalidProperties(payload)).toContain(property);
  });
});
