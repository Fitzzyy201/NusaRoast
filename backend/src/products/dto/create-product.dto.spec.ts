import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createProductDto } from './create-product.dto';

const validVariant = {
  weight: '250g',
  price: 95000,
  stock: 10,
};

const validProduct = {
  name: 'Gayo Arabica',
  category: 'ARABICA',
  origin: 'Gayo, Aceh',
  roastLevel: 3,
  variants: [validVariant],
};

async function invalidProperties(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(createProductDto, payload), {
    whitelist: true,
  });

  return errors.map((error) => error.property);
}

describe('createProductDto', () => {
  it('accepts valid product data including optional fields', async () => {
    const errors = await validate(
      plainToInstance(createProductDto, {
        ...validProduct,
        description: 'Kopi dengan body seimbang.',
        flavorNotes: ['jeruk', 'cokelat'],
        imageBase64: 'abc123',
        isActive: true,
      }),
      { whitelist: true },
    );

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['missing name', { ...validProduct, name: undefined }, 'name'],
    ['blank name', { ...validProduct, name: '   ' }, 'name'],
    ['invalid category', { ...validProduct, category: 'LIBERICA' }, 'category'],
    ['missing origin', { ...validProduct, origin: undefined }, 'origin'],
    ['decimal roast level', { ...validProduct, roastLevel: 2.5 }, 'roastLevel'],
    [
      'roast level below range',
      { ...validProduct, roastLevel: 0 },
      'roastLevel',
    ],
    [
      'roast level above range',
      { ...validProduct, roastLevel: 6 },
      'roastLevel',
    ],
    ['missing variants', { ...validProduct, variants: undefined }, 'variants'],
    ['empty variants', { ...validProduct, variants: [] }, 'variants'],
    [
      'invalid weight format',
      { ...validProduct, variants: [{ ...validVariant, weight: '250 gram' }] },
      'variants',
    ],
    [
      'zero weight',
      { ...validProduct, variants: [{ ...validVariant, weight: '0g' }] },
      'variants',
    ],
    [
      'string price',
      { ...validProduct, variants: [{ ...validVariant, price: '95000' }] },
      'variants',
    ],
    [
      'zero price',
      { ...validProduct, variants: [{ ...validVariant, price: 0 }] },
      'variants',
    ],
    [
      'price with three decimals',
      { ...validProduct, variants: [{ ...validVariant, price: 10.123 }] },
      'variants',
    ],
    [
      'decimal stock',
      { ...validProduct, variants: [{ ...validVariant, stock: 1.5 }] },
      'variants',
    ],
    [
      'negative stock',
      { ...validProduct, variants: [{ ...validVariant, stock: -1 }] },
      'variants',
    ],
    [
      'overlong weight',
      {
        ...validProduct,
        variants: [{ ...validVariant, weight: `${'1'.repeat(21)}g` }],
      },
      'variants',
    ],
    [
      'non-string flavor notes',
      { ...validProduct, flavorNotes: ['nuts', 3] },
      'flavorNotes',
    ],
    [
      'non-boolean active flag',
      { ...validProduct, isActive: 'true' },
      'isActive',
    ],
  ])('rejects %s', async (_label, payload, property) => {
    expect(
      await invalidProperties(payload as Record<string, unknown>),
    ).toContain(property);
  });
});
