import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma';
import { createPromotionDto } from './dto/create-promotion.dto';
import { updatePromotionDto } from './dto/update-promotion.dto';

const promotionProductSelect = {
  id: true,
  name: true,
  category: true,
  origin: true,
  description: true,
  roastLevel: true,
  imageBase64: true,
  isActive: true,
  variants: {
    select: {
      id: true,
      productId: true,
      weight: true,
      price: true,
      stock: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

const promotionInclude = {
  product: { select: promotionProductSelect },
} satisfies Prisma.PromotionInclude;

type PromotionWithProduct = Prisma.PromotionGetPayload<{
  include: typeof promotionInclude;
}>;

@Injectable()
export class PromotionsService {
  private prisma = getPrismaClient();

  async findPublic() {
    const promotions = await this.prisma.promotion.findMany({
      where: { product: { isActive: true } },
      include: promotionInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    return promotions.map((promotion) => this.mapPromotion(promotion));
  }

  async findAll() {
    const promotions = await this.prisma.promotion.findMany({
      include: promotionInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    return promotions.map((promotion) => this.mapPromotion(promotion));
  }

  async create(dto: createPromotionDto) {
    await this.ensureActiveProduct(dto.productId);

    const promotion = await this.prisma.promotion.create({
      data: {
        productId: dto.productId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
      include: promotionInclude,
    });

    return this.mapPromotion(promotion);
  }

  async update(id: number, dto: updatePromotionDto) {
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });

    if (!existing) {
      throw new NotFoundException('Promosi tidak ditemukan');
    }

    if (dto.productId !== undefined && dto.productId !== existing.productId) {
      await this.ensureActiveProduct(dto.productId);
    }

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        productId: dto.productId,
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        sortOrder: dto.sortOrder,
      },
      include: promotionInclude,
    });

    return this.mapPromotion(promotion);
  }

  async remove(id: number) {
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Promosi tidak ditemukan');
    }

    const promotion = await this.prisma.promotion.delete({
      where: { id },
      include: promotionInclude,
    });

    return this.mapPromotion(promotion);
  }

  private async ensureActiveProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Produk untuk promosi tidak ditemukan');
    }

    if (!product.isActive) {
      throw new BadRequestException('Produk nonaktif tidak dapat dipromosikan');
    }
  }

  private mapPromotion(promotion: PromotionWithProduct) {
    const variants = promotion.product.variants.map((variant) => ({
      ...variant,
      price: Number(variant.price),
    }));
    const cheapest = variants.reduce<(typeof variants)[number] | null>(
      (current, variant) =>
        !current || variant.price < current.price ? variant : current,
      null,
    );

    return {
      id: promotion.id,
      title: promotion.title,
      description: promotion.description,
      sortOrder: promotion.sortOrder,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
      product: {
        id: promotion.product.id,
        name: promotion.product.name,
        category: promotion.product.category,
        origin: promotion.product.origin,
        description: promotion.product.description,
        roastLevel: promotion.product.roastLevel,
        weight: variants[0]?.weight ?? '',
        price: cheapest?.price ?? 0,
        stock: variants.reduce((total, variant) => total + variant.stock, 0),
        imageBase64: promotion.product.imageBase64,
        isActive: promotion.product.isActive,
        variants,
      },
    };
  }
}
