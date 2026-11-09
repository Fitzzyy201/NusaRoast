import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma';
import {
  getShippingQuote,
  isShippingMethod,
  ShippingMethod,
} from '../shipping/shipping';

export type { ShippingMethod } from '../shipping/shipping';

type OrderItemSnapshot = {
  productId: number;
  variantId: number;
  productName: string;
  variantWeight: string;
  quantity: number;
  price: Prisma.Decimal;
};

@Injectable()
export class OrdersService {
  private prisma = getPrismaClient();

  async findAll(userId: number) {
    await this.completeOverdueShippedOrders(userId);

    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        orderStatusLog: {
          orderBy: { changedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  async findOne(id: number, userId: number) {
    await this.completeOverdueShippedOrders(userId);

    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        orderStatusLog: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      return null;
    }

    return order;
  }

  async create(
    userId: number,
    shippingMethod: ShippingMethod,
    cartItemIds?: number[],
  ) {
    this.validateShippingMethod(shippingMethod);

    if (
      cartItemIds !== undefined &&
      (!Array.isArray(cartItemIds) ||
        cartItemIds.some((id) => !Number.isInteger(id) || id < 1))
    ) {
      throw new BadRequestException('Item keranjang tidak valid');
    }

    const requestedItemIds = cartItemIds
      ? [...new Set(cartItemIds)]
      : undefined;

    if (requestedItemIds && requestedItemIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu item keranjang');
    }

    const orderId = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Keranjang belanja kosong');
      }

      const selectedItems = requestedItemIds
        ? cart.items.filter((item) => requestedItemIds.includes(item.id))
        : cart.items;

      if (selectedItems.length === 0) {
        throw new BadRequestException(
          'Item keranjang yang dipilih tidak ditemukan',
        );
      }

      if (
        requestedItemIds &&
        selectedItems.length !== requestedItemIds.length
      ) {
        throw new BadRequestException(
          'Sebagian item keranjang yang dipilih tidak ditemukan',
        );
      }

      const items: OrderItemSnapshot[] = selectedItems.map((item) => {
        const variant = item.variant;
        const product = variant?.product;

        if (!variant || !product || !product.isActive) {
          throw new BadRequestException(
            `Produk ${product?.name ?? item.productId} tidak tersedia`,
          );
        }

        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          throw new BadRequestException('Kuantitas item tidak valid');
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stok ${product.name} ${variant.weight} tidak mencukupi`,
          );
        }

        return {
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantWeight: variant.weight,
          quantity: item.quantity,
          price: variant.price,
        };
      });

      const order = await this.createOrderRecord(
        tx,
        userId,
        shippingMethod,
        items,
      );

      const cartItemWhere: Prisma.CartItemWhereInput = requestedItemIds
        ? {
            cartId: cart.id,
            id: { in: selectedItems.map((item) => item.id) },
          }
        : { cartId: cart.id };

      await tx.cartItem.deleteMany({ where: cartItemWhere });

      return order.id;
    });

    return this.findCreatedOrder(orderId);
  }

  async createBuyNow(
    userId: number,
    variantId: number,
    quantity: number,
    shippingMethod: ShippingMethod,
  ) {
    this.validateShippingMethod(shippingMethod);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Kuantitas tidak valid');
    }

    const orderId = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant || !variant.product.isActive) {
        throw new BadRequestException(
          'Produk tidak ditemukan atau tidak aktif',
        );
      }

      if (variant.stock < quantity) {
        throw new BadRequestException(
          `Stok ${variant.product.name} ${variant.weight} tidak mencukupi`,
        );
      }

      const order = await this.createOrderRecord(tx, userId, shippingMethod, [
        {
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          variantWeight: variant.weight,
          quantity,
          price: variant.price,
        },
      ]);

      return order.id;
    });

    return this.findCreatedOrder(orderId);
  }

  async updateStatus(id: number, userId: number, status: 'COMPLETED') {
    if (status !== 'COMPLETED') {
      throw new BadRequestException(
        'Buyer hanya dapat menyelesaikan pesanan yang sudah dikirim',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
      });

      if (!order) {
        throw new NotFoundException(
          'Order not found or you do not have permission to update this order',
        );
      }

      if (order.status !== 'SHIPPED') {
        throw new BadRequestException(
          'Hanya pesanan berstatus SHIPPED yang dapat diselesaikan',
        );
      }

      const updated = await tx.order.updateMany({
        where: { id, userId, status: 'SHIPPED' },
        data: { status: 'COMPLETED' },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Status pesanan sudah berubah. Muat ulang halaman pesanan.',
        );
      }

      await tx.orderStatusLog.create({
        data: { orderId: id, status: 'COMPLETED' },
      });
    });

    const updatedOrder = await this.prisma.order.findFirst({
      where: { id, userId },
    });

    if (!updatedOrder) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return updatedOrder;
  }

  async cancel(id: number, userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
      });

      if (!order) {
        throw new NotFoundException(
          'Order not found or you do not have permission to cancel this order',
        );
      }

      if (order.status !== 'PENDING') {
        throw new BadRequestException(
          'Hanya pesanan berstatus PENDING yang dapat dibatalkan',
        );
      }

      const updated = await tx.order.updateMany({
        where: { id, userId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Status pesanan sudah berubah. Muat ulang halaman pesanan.',
        );
      }

      await tx.orderStatusLog.create({
        data: { orderId: id, status: 'CANCELLED' },
      });
    });

    const cancelledOrder = await this.prisma.order.findFirst({
      where: { id, userId },
    });

    if (!cancelledOrder) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return cancelledOrder;
  }

  async completeOverdueShippedOrders(userId?: number) {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const overdueOrders = await this.prisma.order.findMany({
      where: {
        status: 'SHIPPED',
        ...(userId ? { userId } : {}),
      },
      select: {
        id: true,
        orderStatusLog: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          select: { changedAt: true },
        },
      },
    });

    for (const order of overdueOrders) {
      const shippedAt = order.orderStatusLog[0]?.changedAt;
      if (!shippedAt || shippedAt > cutoff) continue;

      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: {
            id: order.id,
            status: 'SHIPPED',
            ...(userId ? { userId } : {}),
          },
          data: { status: 'COMPLETED' },
        });

        if (updated.count === 1) {
          await tx.orderStatusLog.create({
            data: { orderId: order.id, status: 'COMPLETED' },
          });
        }
      });
    }
  }

  private validateShippingMethod(shippingMethod: ShippingMethod) {
    if (!isShippingMethod(shippingMethod)) {
      throw new BadRequestException('Metode pengiriman tidak valid');
    }
  }

  private async createOrderRecord(
    tx: Prisma.TransactionClient,
    userId: number,
    shippingMethod: ShippingMethod,
    items: OrderItemSnapshot[],
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { cityCode: true, address: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.cityCode) {
      throw new BadRequestException(
        'Lengkapi kota/kabupaten di profil sebelum checkout.',
      );
    }

    const quote = getShippingQuote(user.cityCode, shippingMethod);
    const shippingCost = quote.cost;
    const subtotal = items.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0,
    );

    return tx.order.create({
      data: {
        userId,
        shippingMethod,
        shippingCost,
        totalAmount: subtotal + shippingCost,
        shippingAddress: user.address ?? null,
        shippingCityCode: quote.destination.code,
        shippingCityName: quote.destination.name,
        shippingDistanceKm: quote.distanceKm,
        shippingZone: quote.zone.code,
        status: 'PENDING',
        items: {
          create: items,
        },
        orderStatusLog: {
          create: { status: 'PENDING' },
        },
      },
    });
  }

  private async findCreatedOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return order;
  }
}
