import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getPrismaClient } from '../prisma';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('AdminService', () => {
  const order = {
    aggregate: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const user = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const orderStatusLog = { create: jest.fn() };
  const product = { count: jest.fn() };
  const transaction = jest.fn();
  const prisma = {
    order,
    user,
    product,
    orderStatusLog,
    $transaction: transaction,
  };

  const productsService = {
    findAllAdmin: jest.fn(),
  } as unknown as ProductsService;
  const ordersService = {
    completeOverdueShippedOrders: jest.fn().mockResolvedValue(undefined),
  } as unknown as OrdersService;
  const sendCancelledNotification = jest.fn().mockResolvedValue(true);
  const notificationsService = {
    sendShippedNotification: jest.fn().mockResolvedValue(true),
    sendCompletedNotification: jest.fn().mockResolvedValue(true),
    sendResiNotification: jest.fn().mockResolvedValue(true),
    sendCancelledNotification,
  } as unknown as NotificationsService;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new AdminService(
      productsService,
      ordersService,
      notificationsService,
    );
  });

  it('counts all paid-through-completed orders as received payment', async () => {
    order.aggregate.mockResolvedValue({
      _sum: { totalAmount: 100000, shippingCost: 15000 },
    });
    order.count.mockResolvedValue(2);
    product.count.mockResolvedValue(5);

    await expect(service.getDashboard()).resolves.toEqual({
      totalFinance: { totalAmount: 100000, shippingCost: 15000 },
      pesananDiproses: 2,
      produkAktif: 5,
    });

    expect(order.aggregate).toHaveBeenCalledWith({
      _sum: { totalAmount: true, shippingCost: true },
      where: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] },
      },
    });
  });

  it('filters admin orders by status', async () => {
    order.findMany.mockResolvedValue([]);

    await service.getOrders({ status: 'PAID' });

    expect(order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PAID' } }),
    );
  });

  it('updates a valid status atomically and returns the latest order', async () => {
    const current = { id: 1, status: 'PAID' };
    order.findUnique.mockResolvedValue(current);
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          ...current,
          status: 'PROCESSING',
        }),
      },
      orderStatusLog: { create: jest.fn().mockResolvedValue({ id: 10 }) },
    };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(service.updateOrderStatus(1, 'PROCESSING')).resolves.toEqual({
      ...current,
      status: 'PROCESSING',
    });

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PAID' },
      data: { status: 'PROCESSING' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 1, status: 'PROCESSING' },
    });
  });

  it.each(['PAID', 'PROCESSING', 'SHIPPED'])(
    'restores stock when cancelling a %s order',
    async (status) => {
      const current = { id: 1, status };
      order.findUnique.mockResolvedValue(current);
      const tx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...current, status: 'CANCELLED' }),
        },
        orderItem: {
          findMany: jest.fn().mockResolvedValue([
            {
              variantId: 11,
              productName: 'Gayo Arabica',
              variantWeight: '250g',
              quantity: 2,
            },
            {
              variantId: 11,
              productName: 'Gayo Arabica',
              variantWeight: '250g',
              quantity: 1,
            },
          ]),
        },
        productVariant: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        orderStatusLog: { create: jest.fn().mockResolvedValue({ id: 10 }) },
      };
      transaction.mockImplementation(
        (callback: (client: typeof tx) => unknown) => callback(tx),
      );

      await expect(
        service.updateOrderStatus(1, 'CANCELLED', 'Stok barang habis'),
      ).resolves.toEqual({
        id: 1,
        status: 'CANCELLED',
      });

      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status },
        data: { status: 'CANCELLED', cancellationReason: 'Stok barang habis' },
      });
      expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 11 },
        data: { stock: { increment: 3 } },
      });
      expect(sendCancelledNotification).toHaveBeenCalledWith(1);
    },
  );

  it('rejects cancelling an order without a rejection reason', async () => {
    order.findUnique.mockResolvedValue({ id: 1, status: 'PAID' });

    await expect(service.updateOrderStatus(1, 'CANCELLED')).rejects.toThrow(
      'Alasan penolakan wajib diisi',
    );
    await expect(
      service.updateOrderStatus(1, 'CANCELLED', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not restore stock when cancelling a pending order', async () => {
    order.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' });
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          status: 'CANCELLED',
        }),
      },
      orderItem: { findMany: jest.fn() },
      productVariant: { updateMany: jest.fn() },
      orderStatusLog: { create: jest.fn().mockResolvedValue({ id: 10 }) },
    };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(
      service.updateOrderStatus(1, 'CANCELLED', 'Pembeli membatalkan'),
    ).resolves.toEqual({
      id: 1,
      status: 'CANCELLED',
    });

    expect(tx.orderItem.findMany).not.toHaveBeenCalled();
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate and invalid status transitions', async () => {
    order.findUnique.mockResolvedValueOnce({ id: 1, status: 'PAID' });
    await expect(
      service.updateOrderStatus(1, 'PAID' as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    order.findUnique.mockResolvedValueOnce({ id: 1, status: 'PENDING' });
    await expect(
      service.updateOrderStatus(1, 'PAID' as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    order.findUnique.mockResolvedValueOnce({ id: 1, status: 'PAID' });
    await expect(
      service.updateOrderStatus(1, 'COMPLETED'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a stale transition with a conflict', async () => {
    order.findUnique.mockResolvedValue({ id: 1, status: 'PAID' });
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
      orderStatusLog: { create: jest.fn() },
    };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(
      service.updateOrderStatus(1, 'PROCESSING'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
  });

  it('rolls the transaction back when writing the status log fails', async () => {
    let persisted = { id: 1, status: 'PAID' };
    order.findUnique.mockImplementation(() =>
      Promise.resolve({ ...persisted }),
    );
    const tx = {
      order: {
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { status: string };
            data: { status: string };
          }) => {
            if (persisted.status !== where.status) return { count: 0 };
            persisted = { ...persisted, status: data.status };
            return { count: 1 };
          },
        ),
        findUnique: jest.fn(() => Promise.resolve({ ...persisted })),
      },
      orderStatusLog: {
        create: jest.fn().mockRejectedValue(new Error('log failed')),
      },
    };
    transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => {
        const snapshot = { ...persisted };
        try {
          return await callback(tx);
        } catch (error) {
          persisted = snapshot;
          throw error;
        }
      },
    );

    await expect(service.updateOrderStatus(1, 'PROCESSING')).rejects.toThrow(
      'log failed',
    );
    expect(persisted.status).toBe('PAID');
  });

  it('only bans existing buyers', async () => {
    user.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.banBuyer({ userId: 99, banned: true }),
    ).rejects.toBeInstanceOf(NotFoundException);

    user.findUnique.mockResolvedValueOnce({ id: 1, role: 'SELLER' });
    await expect(
      service.banBuyer({ userId: 1, banned: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(user.update).not.toHaveBeenCalled();

    user.findUnique.mockResolvedValueOnce({ id: 2, role: 'BUYER' });
    user.update.mockResolvedValue({
      id: 2,
      name: 'Buyer',
      email: 'buyer@test.com',
      phone: '0812',
      status: 'BANNED',
    });
    await expect(
      service.banBuyer({ userId: 2, banned: true }),
    ).resolves.toMatchObject({ id: 2, status: 'BANNED' });
  });

  it('only stores resi on shipping-capable statuses', async () => {
    order.findUnique.mockResolvedValueOnce({ id: 1, status: 'PENDING' });
    await expect(service.inputResi(1, 'JNE123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(order.update).not.toHaveBeenCalled();

    order.findUnique.mockResolvedValueOnce({ id: 1, status: 'PROCESSING' });
    order.update.mockResolvedValue({ id: 1, resiNumber: 'JNE123' });
    await expect(service.inputResi(1, '  JNE123 ')).resolves.toMatchObject({
      resiNumber: 'JNE123',
    });
    expect(order.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { resiNumber: 'JNE123' },
    });
  });

  it('returns 404 for resi on a missing order', async () => {
    order.findUnique.mockResolvedValue(null);
    await expect(service.inputResi(99, 'JNE123')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
