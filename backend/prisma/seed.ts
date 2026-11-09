// Idempotent development seed for NusaRoast.
//
// Safe to run repeatedly against an existing database: it only inserts rows that
// are missing and aligns the seeded users' shipping locations. It never updates
// passwords and never deletes existing users, products, carts or orders.
//
//   npm run seed
//
// Seller credentials are read from backend/.env (never hardcoded here):
//   SELLER_EMAIL / SELLER_PASSWORD
// The seeded dev buyer account:
//   buyer@test.com / password123
//
// Passwords are only applied when the user row is first created; changing the
// values in .env later does NOT change existing accounts.

import 'dotenv/config';
import { hashSync } from 'bcryptjs';
import { getPrismaClient } from '../src/prisma';

const prisma = getPrismaClient();

const SELLER_EMAIL = process.env.SELLER_EMAIL?.trim();
const SELLER_PASSWORD = process.env.SELLER_PASSWORD?.trim();

if (!SELLER_EMAIL || !SELLER_PASSWORD) {
  throw new Error(
    'SELLER_EMAIL dan SELLER_PASSWORD belum diisi. Tambahkan keduanya di backend/.env sebelum menjalankan seed.',
  );
}

const SELLER_PASSWORD_HASH = hashSync(SELLER_PASSWORD, 10);
const BUYER_PASSWORD_HASH = hashSync('password123', 10);

type SeedUser = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  cityCode: string;
  role: 'SELLER' | 'BUYER';
  passwordHash: string;
};

const SEED_USERS: SeedUser[] = [
  {
    name: 'Seller NusaRoast',
    email: SELLER_EMAIL,
    phone: '6281234567890',
    address: 'Bekasi Barat, Kota Bekasi, Jawa Barat',
    city: 'Kota Bekasi',
    cityCode: '32.75',
    role: 'SELLER',
    passwordHash: SELLER_PASSWORD_HASH,
  },
  {
    name: 'Buyer Test',
    email: 'buyer@test.com',
    phone: '6281312345678',
    address: 'Bandung, Indonesia',
    city: 'Kota Bandung',
    cityCode: '32.73',
    role: 'BUYER',
    passwordHash: BUYER_PASSWORD_HASH,
  },
];

type SeedVariant = {
  weight: string;
  price: number;
  stock: number;
};

type SeedProduct = {
  name: string;
  category: 'ARABICA' | 'ROBUSTA';
  origin: string;
  description: string;
  flavorNotes: string[];
  roastLevel: number;
  variants: SeedVariant[];
  imageBase64: string | null;
  isActive: boolean;
};

function makeVariants(basePrice: number, baseStock: number): SeedVariant[] {
  return [
    { weight: '250g', price: basePrice, stock: baseStock },
    {
      weight: '100g',
      price: Math.round((basePrice * 0.45) / 1000) * 1000,
      stock: Math.round(baseStock * 0.35),
    },
    {
      weight: '1kg',
      price: Math.round((basePrice * 3.6) / 1000) * 1000,
      stock: Math.round(baseStock * 0.25),
    },
  ];
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Gayo Arabica',
    category: 'ARABICA',
    origin: 'Aceh, Gayo Highlands',
    description:
      'Arabika dataran tinggi Gayo dengan body seimbang dan aftertaste manis yang bersih.',
    flavorNotes: ['Chocolate', 'Caramel', 'Floral'],
    roastLevel: 3,
    variants: makeVariants(95000, 40),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Toraja Sapan',
    category: 'ARABICA',
    origin: 'Sulawesi, Tana Toraja',
    description:
      'Kopi Toraja klasik dengan keasaman lembut dan aroma rempah yang hangat.',
    flavorNotes: ['Citrus', 'Brown Sugar', 'Spice'],
    roastLevel: 2,
    variants: makeVariants(110000, 25),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Java Preanger',
    category: 'ARABICA',
    origin: 'Jawa Barat, Preanger',
    description:
      'Arabika Preanger dengan karakter floral dan manis madu yang elegan.',
    flavorNotes: ['Floral', 'Honey', 'Citrus'],
    roastLevel: 2,
    variants: makeVariants(98000, 30),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Kintamani Bali',
    category: 'ARABICA',
    origin: 'Bali, Kintamani',
    description:
      'Arabika Kintamani dengan sentuhan jeruk manis dan body yang lembut.',
    flavorNotes: ['Orange', 'Chocolate', 'Nutty'],
    roastLevel: 3,
    variants: makeVariants(105000, 0),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Mandheling Sumatra',
    category: 'ARABICA',
    origin: 'Sumatra, Mandheling',
    description:
      'Arabika Mandheling dengan body penuh, earthy, dan dark chocolate yang pekat.',
    flavorNotes: ['Earthy', 'Dark Chocolate', 'Herbal'],
    roastLevel: 4,
    variants: makeVariants(92000, 18),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Lampung Robusta',
    category: 'ROBUSTA',
    origin: 'Lampung',
    description:
      'Robusta Lampung yang bold dan pekat, cocok untuk espresso maupun kopi susu.',
    flavorNotes: ['Bold', 'Nutty', 'Cocoa'],
    roastLevel: 5,
    variants: makeVariants(65000, 60),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Temanggung Robusta',
    category: 'ROBUSTA',
    origin: 'Jawa Tengah, Temanggung',
    description:
      'Robusta Temanggung dengan catatan tembakau manis dan cocoa yang hangat.',
    flavorNotes: ['Tobacco', 'Cocoa', 'Spice'],
    roastLevel: 4,
    variants: makeVariants(70000, 22),
    imageBase64: null,
    isActive: true,
  },
  {
    name: 'Flores Bajawa',
    category: 'ARABICA',
    origin: 'Nusa Tenggara, Bajawa',
    description:
      'Arabika Bajawa dengan manis karamel, almond, dan keasaman yang cerah.',
    flavorNotes: ['Caramel', 'Almond', 'Citrus'],
    roastLevel: 3,
    variants: makeVariants(55000, 15),
    imageBase64: null,
    isActive: true,
  },
];

type SeedPromotion = {
  productName: string;
  title: string;
  description: string;
  sortOrder: number;
};

const SEED_PROMOTIONS: SeedPromotion[] = [
  {
    productName: 'Gayo Arabica',
    title: 'Gayo Pagi',
    description:
      'Arabika Gayo dengan body seimbang dan aftertaste manis, cocok untuk seduhan pagi.',
    sortOrder: 1,
  },
  {
    productName: 'Toraja Sapan',
    title: 'Toraja Sore',
    description:
      'Toraja Sapan dengan keasaman lembut dan aroma rempah yang hangat untuk sore hari.',
    sortOrder: 2,
  },
  {
    productName: 'Lampung Robusta',
    title: 'Lampung Espresso',
    description:
      'Robusta Lampung yang bold dan pekat, pas untuk espresso maupun kopi susu.',
    sortOrder: 3,
  },
];

async function main() {
  let usersCreated = 0;
  let usersUpdated = 0;
  for (const user of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (existing) {
      if (
        existing.address !== user.address ||
        existing.city !== user.city ||
        existing.cityCode !== user.cityCode
      ) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            address: user.address,
            city: user.city,
            cityCode: user.cityCode,
          },
        });
        usersUpdated += 1;
      }
      continue;
    }

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        cityCode: user.cityCode,
        role: user.role,
        status: 'ACTIVE',
        password: user.passwordHash,
      },
    });
    usersCreated += 1;
  }

  let productsCreated = 0;
  let variantsCreated = 0;
  for (const product of SEED_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
      include: { variants: true },
    });
    if (existing) {
      const base = existing.variants.find(
        (variant) => variant.weight === '250g',
      );
      if (!base) {
        continue;
      }

      const desired = makeVariants(Number(base.price), base.stock).map(
        (variant, index) => ({ ...variant, sortOrder: index }),
      );
      const missing: typeof desired = [];

      for (const variant of desired) {
        const current = existing.variants.find(
          (item) => item.weight === variant.weight,
        );

        if (!current) {
          missing.push(variant);
          continue;
        }

        if (current.sortOrder !== variant.sortOrder) {
          await prisma.productVariant.update({
            where: { id: current.id },
            data: { sortOrder: variant.sortOrder },
          });
        }
      }

      if (missing.length > 0) {
        await prisma.productVariant.createMany({
          data: missing.map((variant) => ({
            productId: existing.id,
            weight: variant.weight,
            price: variant.price,
            stock: variant.stock,
            sortOrder: variant.sortOrder,
          })),
        });
        variantsCreated += missing.length;
      }
      continue;
    }

    const { variants, ...productData } = product;
    await prisma.product.create({
      data: {
        ...productData,
        flavorNotes: JSON.stringify(product.flavorNotes),
        variants: {
          create: variants.map((variant, index) => ({
            ...variant,
            sortOrder: index,
          })),
        },
      },
    });
    productsCreated += 1;
  }

  let promotionsCreated = 0;
  for (const promotion of SEED_PROMOTIONS) {
    const existing = await prisma.promotion.findFirst({
      where: { title: promotion.title },
    });
    if (existing) {
      continue;
    }

    const product = await prisma.product.findFirst({
      where: { name: promotion.productName },
    });
    if (!product) {
      console.warn(
        `Skipping promotion "${promotion.title}": product "${promotion.productName}" not found.`,
      );
      continue;
    }

    await prisma.promotion.create({
      data: {
        productId: product.id,
        title: promotion.title,
        description: promotion.description,
        sortOrder: promotion.sortOrder,
      },
    });
    promotionsCreated += 1;
  }

  console.log(
    `Seed complete: ${usersCreated} user(s) created, ${usersUpdated} seeded user location(s) updated, ${productsCreated} product(s), ${variantsCreated} variant(s), and ${promotionsCreated} promotion(s) created. Existing rows were otherwise left untouched.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
