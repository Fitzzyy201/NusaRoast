import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPrismaClient } from '../prisma';

const cartInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageBase64: true,
          isActive: true,
        },
      },
      variant: {
        select: {
          id: true,
          weight: true,
          price: true,
          stock: true,
        },
      },
    },
  },
};

@Injectable()
export class CartService {
  private prisma = getPrismaClient();

  async getCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });

    if (!cart) {
      return this.prisma.cart.create({
        data: { userId },
        include: cartInclude,
      });
    }

    return cart;
  }

  async addItem(userId: number, variantId: number, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Kuantitas tidak valid');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: { id: true, isActive: true },
        },
      },
    });

    if (!variant || !variant.product.isActive) {
      throw new NotFoundException('Produk tidak ditemukan atau tidak aktif');
    }

    if (variant.stock < quantity) {
      throw new BadRequestException('Stok tidak mencukupi');
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          items: {
            create: {
              productId: variant.productId,
              variantId,
              quantity,
            },
          },
        },
      });
    } else {
      const existingItem = await this.prisma.cartItem.findFirst({
        where: { cartId: cart.id, variantId },
      });

      if (existingItem) {
        const mergedQuantity = existingItem.quantity + quantity;

        if (mergedQuantity > variant.stock) {
          throw new BadRequestException('Stok tidak mencukupi');
        }

        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: mergedQuantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: variant.productId,
            variantId,
            quantity,
          },
        });
      }
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Kuantitas tidak valid');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Keranjang tidak ditemukan');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: {
        variant: {
          select: {
            stock: true,
            product: {
              select: { isActive: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item tidak ditemukan di keranjang');
    }

    if (!item.variant.product.isActive) {
      throw new BadRequestException('Produk tidak tersedia');
    }

    if (quantity > item.variant.stock) {
      throw new BadRequestException('Stok tidak mencukupi');
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return { message: 'Cart not found' };
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      return { message: 'Item not found in cart' };
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return { message: 'Cart not found' };
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared' };
  }
}
