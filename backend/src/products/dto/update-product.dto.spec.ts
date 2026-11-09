import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { updateProductDto } from './update-product.dto';

const validVariant = {
  weight: '250g',
  price: 95000,
  stock: 10,
};

async function invalidProperties(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(updateProductDto, payload), {
    whitelist: true,
  });

  return errors.map((error) => error.property);
}

describe('updateProductDto', () => {
  it('accepts a partial update', async () => {
    const errors = await validate(
      plainToInstance(updateProductDto, {
        variants: [{ ...validVariant, stock: 4 }],
      }),
      { whitelist: true },
    );

    expect(errors).toHaveLength(0);
  });

  it('accepts an empty update object', async () => {
    const errors = await validate(plainToInstance(updateProductDto, {}), {
      whitelist: true,
    });

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['blank name', { name: '   ' }, 'name'],
    ['invalid category', { category: 'LIBERICA' }, 'category'],
    ['blank origin', { origin: '' }, 'origin'],
    ['decimal roast level', { roastLevel: 2.5 }, 'roastLevel'],
    ['roast level below range', { roastLevel: 0 }, 'roastLevel'],
    ['roast level above range', { roastLevel: 6 }, 'roastLevel'],
    ['empty variants', { variants: [] }, 'variants'],
    [
      'invalid weight format',
      { variants: [{ ...validVariant, weight: '250 gram' }] },
      'variants',
    ],
    [
      'zero weight',
      { variants: [{ ...validVariant, weight: '0g' }] },
      'variants',
    ],
    [
      'string price',
      { variants: [{ ...validVariant, price: '95000' }] },
      'variants',
    ],
    ['zero price', { variants: [{ ...validVariant, price: 0 }] }, 'variants'],
    [
      'price with three decimals',
      { variants: [{ ...validVariant, price: 10.123 }] },
      'variants',
    ],
    [
      'decimal stock',
      { variants: [{ ...validVariant, stock: 1.5 }] },
      'variants',
    ],
    [
      'negative stock',
      { variants: [{ ...validVariant, stock: -1 }] },
      'variants',
    ],
    ['non-string flavor notes', { flavorNotes: ['nuts', 3] }, 'flavorNotes'],
    [
      'overlong weight',
      { variants: [{ ...validVariant, weight: `${'1'.repeat(21)}g` }] },
      'variants',
    ],
    ['non-boolean active flag', { isActive: 'true' }, 'isActive'],
  ])('rejects %s', async (_label, payload, property) => {
    expect(
      await invalidProperties(payload as Record<string, unknown>),
    ).toContain(property);
  });
});
