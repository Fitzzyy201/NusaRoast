import { Prisma } from '@prisma/client';

export const productWithVariantsInclude = {
  variants: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProductInclude;

type VariantLike = {
  id: number;
  productId: number;
  weight: string;
  price: unknown;
  stock: number;
  sortOrder: number;
  createdAt?: Date;
};

type ProductWithVariants = Prisma.ProductGetPayload<{
  include: typeof productWithVariantsInclude;
}>;

export function presentVariant(variant: VariantLike) {
  return {
    ...variant,
    price: Number(variant.price),
  };
}

export function presentProduct(product: ProductWithVariants) {
  const variants = product.variants.map(presentVariant);
  const cheapest = variants.reduce<(typeof variants)[number] | null>(
    (current, variant) =>
      !current || variant.price < current.price ? variant : current,
    null,
  );

  return {
    ...product,
    variants,
    price: cheapest?.price ?? 0,
    weight: variants[0]?.weight ?? '',
    stock: variants.reduce((total, variant) => total + variant.stock, 0),
  };
}
