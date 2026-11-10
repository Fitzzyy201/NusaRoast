import { Injectable, NotFoundException } from '@nestjs/common';
import { getPrismaClient } from '../prisma';

@Injectable()
export class NotificationsService {
  private prisma = getPrismaClient();

  async createNotification(
    userId: number,
    orderId: number,
    type: string,
    title: string,
    message: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        orderId,
        type,
        title,
        message,
      },
    });
  }

  async getNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async sendShippedNotification(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || !order.user) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    const resiInfo = order.resiNumber ? ` No. Resi: ${order.resiNumber}` : '';

    await this.createNotification(
      order.userId,
      orderId,
      'SHIPMENT',
      'Pesanan Dikirim',
      `Halo ${order.user.name}, pesanan Anda sudah dikirim!${resiInfo} Silakan cek status pengiriman.`,
    );

    return true;
  }

  async sendCompletedNotification(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || !order.user) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    await this.createNotification(
      order.userId,
      orderId,
      'COMPLETED',
      'Pesanan Selesai',
      `Halo ${order.user.name}, pesanan Anda sudah selesai. Terima kasih telah berbelanja di NusaRoast!`,
    );

    return true;
  }

  async sendResiNotification(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || !order.user || !order.resiNumber) {
      throw new NotFoundException('Order atau resi tidak ditemukan');
    }

    await this.createNotification(
      order.userId,
      orderId,
      'RESI',
      'Nomor Resi Tersedia',
      `Halo ${order.user.name}, nomor resi pesanan Anda: ${order.resiNumber}.`,
    );

    return true;
  }

  async sendCancelledNotification(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || !order.user) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    const reasonText = order.cancellationReason
      ? ` Alasan: ${order.cancellationReason}.`
      : '';

    await this.createNotification(
      order.userId,
      orderId,
      'CANCELLATION',
      'Pesanan Dibatalkan',
      `Halo ${order.user.name}, pesanan Anda dibatalkan oleh admin.${reasonText} Untuk informasi pengembalian dana, hubungi admin via WhatsApp.`,
    );

    return true;
  }
}
