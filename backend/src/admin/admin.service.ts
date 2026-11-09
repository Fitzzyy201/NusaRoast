import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { getPrismaClient } from '../prisma';
import { restoreStockForOrder } from '../orders/order-stock';
import { banBuyerDto } from './dto/ban-buyer.dto';
import { SellerOrderStatus } from './dto/update-order-status.dto';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';

const PAID_ORDER_STATUSES: OrderStatus[] = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
];

const SELLER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const RESI_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED'];

@Injectable()
export class AdminService {
  private prisma = getPrismaClient();

  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getProducts() {
    return this.productsService.findAllAdmin();
  }

  async getDashboard() {
    const totalFinance = await this.prisma.order.aggregate({
      _sum: { totalAmount: true, shippingCost: true },
      where: { status: { in: PAID_ORDER_STATUSES } },
    });

    const pesananDiproses = await this.prisma.order.count({
      where: { status: 'PROCESSING' },
    });

    const produkAktif = await this.prisma.product.count({
      where: { isActive: true },
    });

    return {
      totalFinance: totalFinance._sum,
      pesananDiproses,
      produkAktif,
    };
  }

  async getBuyers() {
    const buyers = await this.prisma.user.findMany({
      where: { role: 'BUYER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        address: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    return buyers.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      city: buyer.city,
      address: buyer.address,
      status: buyer.status,
    }));
  }

  async banBuyer(dto: banBuyerDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new NotFoundException('Akun pembeli tidak ditemukan');
    }

    if (target.role !== 'BUYER') {
      throw new BadRequestException('Hanya akun pembeli yang dapat diblokir');
    }

    const user = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { status: dto.banned ? 'BANNED' : 'ACTIVE' },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
    };
  }

  async getOrders(filters?: { status?: OrderStatus; userId?: number }) {
    await this.ordersService.completeOverdueShippedOrders(filters?.userId);

    const where: Prisma.OrderWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
        items: {
          select: {
            productId: true,
            variantId: true,
            productName: true,
            variantWeight: true,
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      id: order.id,
      totalAmount: order.totalAmount,
      shippingMethod: order.shippingMethod,
      shippingCost: order.shippingCost,
      shippingCityName: order.shippingCityName,
      shippingDistanceKm: order.shippingDistanceKm,
      shippingZone: order.shippingZone,
      resiNumber: order.resiNumber,
      cancellationReason: order.cancellationReason,
      status: order.status,
      paymentStatus: order.status,
      buyerName: order.user?.name,
      buyerPhone: order.user?.phone ?? null,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.productName,
        variantWeight: item.variantWeight,
        quantity: item.quantity,
        price: item.price,
      })),
    }));
  }

  async updateOrderStatus(
    orderId: number,
    status: SellerOrderStatus,
    reason?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.status === status) {
      throw new BadRequestException('Status pesanan tidak berubah');
    }

    if (!SELLER_STATUS_TRANSITIONS[order.status].includes(status)) {
      throw new BadRequestException(
        `Status tidak dapat diubah dari ${order.status} ke ${status}`,
      );
    }

    let cancellationReason: string | null = null;
    if (status === 'CANCELLED') {
      const trimmedReason = (reason ?? '').trim();
      if (!trimmedReason) {
        throw new BadRequestException('Alasan penolakan wajib diisi');
      }
      cancellationReason = trimmedReason.slice(0, 255);
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status,
          ...(status === 'CANCELLED' ? { cancellationReason } : {}),
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Status pesanan telah berubah. Muat ulang data.',
        );
      }

      if (status === 'CANCELLED' && order.status !== 'PENDING') {
        await restoreStockForOrder(tx, orderId);
      }

      await tx.orderStatusLog.create({
        data: { orderId, status },
      });

      return tx.order.findUnique({ where: { id: orderId } });
    });

    if (!updatedOrder) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (status === 'SHIPPED') {
      await this.notificationsService.sendShippedNotification(orderId);
    } else if (status === 'COMPLETED') {
      await this.notificationsService.sendCompletedNotification(orderId);
    } else if (status === 'CANCELLED') {
      await this.notificationsService.sendCancelledNotification(orderId);
    }

    return updatedOrder;
  }

  async inputResi(orderId: number, resiNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (!RESI_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'Nomor resi hanya dapat diisi untuk pesanan yang sudah dibayar dan belum selesai',
      );
    }

    const trimmed = resiNumber.trim();
    if (!trimmed) {
      throw new BadRequestException('Nomor resi tidak boleh kosong');
    }

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: { resiNumber: trimmed },
    });

    await this.notificationsService
      .sendResiNotification(orderId)
      .catch(() => {});

    return result;
  }
}
