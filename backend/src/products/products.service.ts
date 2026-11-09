import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma';
import { createProductDto } from './dto/create-product.dto';
import { productVariantDto } from './dto/product-variant.dto';
import { updateProductDto } from './dto/update-product.dto';
import {
  presentProduct,
  productWithVariantsInclude,
} from './product-presenter';

const WEIGHT_PATTERN = /^(\d+(?:[.,]\d+)?)\s?(g|kg)$/i;

type NormalizedVariant = {
  id?: number;
  weight: string;
  price: number;
  stock: number;
  sortOrder: number;
};

function normalizeWeight(value: string): string {
  const match = WEIGHT_PATTERN.exec(value.trim());

  if (!match) {
    throw new BadRequestException(
      'Berat harus menggunakan format seperti 100g, 250g, atau 1kg',
    );
  }

  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Berat harus lebih dari 0');
  }

  const amountText = String(amount)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');

  return `${amountText}${match[2].toLowerCase()}`;
}

function encodeFlavorNotes(value?: string[]): string | undefined {
  return value === undefined ? undefined : JSON.stringify(value);
}

@Injectable()
export class ProductsService {
  private prisma = getPrismaClient();

  async findAll(
    page: number = 1,
    limit: number = 10,
    category?: 'ARABICA' | 'ROBUSTA',
    search?: string,
  ) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = {
        contains: search,
      };
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take,
        skip,
        include: productWithVariantsInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map(presentProduct),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      responsiveMeta: {
        desktopItems: 4,
        tabletItems: 2,
        mobileItems: 1,
        category,
        search,
      },
    };
  }

  async findAllAdmin() {
    const items = await this.prisma.product.findMany({
      include: productWithVariantsInclude,
      orderBy: { createdAt: 'desc' },
    });

    return items.map(presentProduct);
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productWithVariantsInclude,
    });

    if (!product || !product.isActive) {
      return null;
    }

    return presentProduct(product);
  }

  async findVariant(id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageBase64: true,
            isActive: true,
          },
        },
      },
    });

    if (!variant || !variant.product.isActive) {
      return null;
    }

    return {
      id: variant.id,
      productId: variant.productId,
      weight: variant.weight,
      price: Number(variant.price),
      stock: variant.stock,
      sortOrder: variant.sortOrder,
      product: variant.product,
    };
  }

  async create(dto: createProductDto) {
    const variants = this.normalizeVariants(dto.variants);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        category: dto.category,
        origin: dto.origin,
        description: dto.description,
        flavorNotes: encodeFlavorNotes(dto.flavorNotes),
        roastLevel: dto.roastLevel,
        imageBase64: dto.imageBase64,
        isActive: dto.isActive ?? true,
        variants: {
          create: variants.map(({ weight, price, stock, sortOrder }) => ({
            weight,
            price,
            stock,
            sortOrder,
          })),
        },
      },
      include: productWithVariantsInclude,
    });

    return presentProduct(product);
  }

  async update(id: number, dto: updateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const variants = dto.variants ? this.normalizeVariants(dto.variants) : null;

    const product = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: dto.name ?? existing.name,
          category: dto.category ?? existing.category,
          origin: dto.origin ?? existing.origin,
          description: dto.description ?? existing.description,
          flavorNotes:
            dto.flavorNotes === undefined
              ? existing.flavorNotes
              : encodeFlavorNotes(dto.flavorNotes),
          roastLevel: dto.roastLevel ?? existing.roastLevel,
          imageBase64: dto.imageBase64 ?? existing.imageBase64,
          isActive: dto.isActive ?? existing.isActive,
        },
      });

      if (variants) {
        await this.syncVariants(tx, id, existing.variants, variants);
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productWithVariantsInclude,
      });
    });

    return presentProduct(product);
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const [orderItems, cartItems, promotions] = await Promise.all([
      this.prisma.orderItem.count({ where: { productId: id } }),
      this.prisma.cartItem.count({ where: { productId: id } }),
      this.prisma.promotion.count({ where: { productId: id } }),
    ]);

    if (orderItems > 0 || cartItems > 0 || promotions > 0) {
      throw new ConflictException(
        'Produk ini sudah pernah dipesan, ada di keranjang, atau dipakai promosi sehingga tidak dapat dihapus permanen. Gunakan tombol "Nonaktifkan" agar produk tidak tampil di katalog.',
      );
    }

    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Produk ini sudah pernah dipesan, ada di keranjang, atau dipakai promosi sehingga tidak dapat dihapus permanen. Gunakan tombol "Nonaktifkan" agar produk tidak tampil di katalog.',
        );
      }
      throw error;
    }

    return product;
  }

  private normalizeVariants(input: productVariantDto[]): NormalizedVariant[] {
    if (!Array.isArray(input) || input.length === 0) {
      throw new BadRequestException('Minimal satu varian berat');
    }

    const seen = new Set<string>();

    return input.map((variant, index) => {
      const weight = normalizeWeight(String(variant.weight ?? ''));

      if (seen.has(weight)) {
        throw new BadRequestException(`Berat ${weight} duplikat`);
      }
      seen.add(weight);

      return {
        id: variant.id,
        weight,
        price: variant.price,
        stock: variant.stock,
        sortOrder: variant.sortOrder ?? index,
      };
    });
  }

  private async syncVariants(
    tx: Prisma.TransactionClient,
    productId: number,
    existing: Array<{ id: number }>,
    incoming: NormalizedVariant[],
  ) {
    const existingIds = new Set(existing.map((variant) => variant.id));
    const incomingIds = new Set(
      incoming
        .map((variant) => variant.id)
        .filter((variantId): variantId is number => variantId !== undefined),
    );

    for (const variantId of incomingIds) {
      if (!existingIds.has(variantId)) {
        throw new BadRequestException('Varian tidak ditemukan pada produk ini');
      }
    }

    const removedIds = existing
      .map((variant) => variant.id)
      .filter((variantId) => !incomingIds.has(variantId));

    if (removedIds.length > 0) {
      const referenced = await tx.orderItem.count({
        where: { variantId: { in: removedIds } },
      });

      if (referenced > 0) {
        throw new ConflictException(
          'Varian yang sudah digunakan pada pesanan tidak dapat dihapus. Atur stoknya menjadi 0.',
        );
      }

      await tx.productVariant.deleteMany({
        where: { id: { in: removedIds }, productId },
      });
    }

    const updatedIds = incoming
      .map((variant) => variant.id)
      .filter((variantId): variantId is number => variantId !== undefined);

    if (updatedIds.length > 0) {
      for (const variantId of updatedIds) {
        await tx.productVariant.updateMany({
          where: { id: variantId, productId },
          data: { weight: `tmp${variantId}` },
        });
      }

      for (const variant of incoming) {
        if (variant.id === undefined) {
          continue;
        }

        await tx.productVariant.updateMany({
          where: { id: variant.id, productId },
          data: {
            weight: variant.weight,
            price: variant.price,
            stock: variant.stock,
            sortOrder: variant.sortOrder,
          },
        });
      }
    }

    for (const variant of incoming) {
      if (variant.id !== undefined) {
        continue;
      }

      await tx.productVariant.create({
        data: {
          productId,
          weight: variant.weight,
          price: variant.price,
          stock: variant.stock,
          sortOrder: variant.sortOrder,
        },
      });
    }
  }
}
