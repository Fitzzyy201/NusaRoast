import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getPrismaClient } from '../prisma';
import { OrdersService } from './orders.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

function buildPrismaMock() {
  const tx = {
    cart: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    cartItem: { deleteMany: jest.fn() },
    orderStatusLog: { create: jest.fn() },
  };

  const prisma = {
    cart: { findUnique: jest.fn() },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    cartItem: { deleteMany: jest.fn() },
    orderStatusLog: { create: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return { prisma, tx };
}

function cartWithItems() {
  return {
    id: 3,
    userId: 7,
    items: [
      {
        id: 1,
        productId: 2,
        variantId: 11,
        quantity: 2,
        variant: {
          id: 11,
          productId: 2,
          weight: '250g',
          price: 95000,
          stock: 10,
          product: {
            id: 2,
            name: 'Gayo Arabica',
            isActive: true,
          },
        },
      },
      {
        id: 2,
        productId: 5,
        variantId: 12,
        quantity: 1,
        variant: {
          id: 12,
          productId: 5,
          weight: '1kg',
          price: 65000,
          stock: 4,
          product: {
            id: 5,
            name: 'Lampung Robusta',
            isActive: true,
          },
        },
      },
    ],
  };
}

describe('OrdersService.create', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: ReturnType<typeof buildPrismaMock>['tx'];

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = buildPrismaMock();
    prisma = mocks.prisma;
    tx = mocks.tx;
    tx.user.findUnique.mockResolvedValue({
      cityCode: '32.73',
      address: 'Jl. Braga No. 1',
    });
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new OrdersService();
  });

  it('creates the order with price snapshots and clears the cart in one transaction', async () => {
    tx.cart.findUnique.mockResolvedValue(cartWithItems());
    tx.order.create.mockResolvedValue({ id: 42 });
    tx.cartItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.order.findUnique.mockResolvedValue({ id: 42, items: [] });

    const result = await service.create(7, 'REGULAR');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 42, items: [] });

    const createCalls = tx.order.create.mock.calls as unknown[][];
    const createArgs = createCalls[0][0] as {
      data: {
        userId: number;
        status: string;
        shippingCost: number;
        totalAmount: number;
        shippingAddress: string | null;
        shippingCityCode: string | null;
        shippingCityName: string | null;
        shippingDistanceKm: number | null;
        shippingZone: string | null;
        items: {
          create: Array<{
            productId: number;
            productName: string;
            quantity: number;
            price: number;
          }>;
        };
      };
    };

    expect(createArgs.data.userId).toBe(7);
    expect(createArgs.data.status).toBe('PENDING');
    expect(createArgs.data.shippingCost).toBe(40000);
    expect(createArgs.data.totalAmount).toBe(95000 * 2 + 65000 + 40000);
    expect(createArgs.data.shippingAddress).toBe('Jl. Braga No. 1');
    expect(createArgs.data.shippingCityCode).toBe('32.73');
    expect(createArgs.data.shippingCityName).toBe('Kota Bandung');
    expect(createArgs.data.shippingDistanceKm).toBeCloseTo(103.81, 2);
    expect(createArgs.data.shippingZone).toBe('ZONE_5');
    expect(createArgs.data.items.create).toEqual([
      {
        productId: 2,
        variantId: 11,
        productName: 'Gayo Arabica',
        variantWeight: '250g',
        quantity: 2,
        price: 95000,
      },
      {
        productId: 5,
        variantId: 12,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 1,
        price: 65000,
      },
    ]);

    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 3 },
    });
    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
      include: { items: true },
    });
  });

  it('uses the FAST shipping cost', async () => {
    tx.cart.findUnique.mockResolvedValue(cartWithItems());
    tx.order.create.mockResolvedValue({ id: 43 });
    tx.cartItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.order.findUnique.mockResolvedValue({ id: 43, items: [] });

    await service.create(7, 'FAST');

    const createCalls = tx.order.create.mock.calls as unknown[][];
    const createArgs = createCalls[0][0] as {
      data: { shippingCost: number; totalAmount: number };
    };
    expect(createArgs.data.shippingCost).toBe(60000);
    expect(createArgs.data.totalAmount).toBe(95000 * 2 + 65000 + 60000);
  });

  it('rejects checkout when the buyer has no city', async () => {
    tx.cart.findUnique.mockResolvedValue(cartWithItems());
    tx.user.findUnique.mockResolvedValue({
      cityCode: null,
      address: 'Jl. Braga No. 1',
    });

    await expect(service.create(7, 'REGULAR')).rejects.toThrow(
      'Lengkapi kota/kabupaten di profil sebelum checkout.',
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('does not create an order or clear the cart when the cart is empty', async () => {
    tx.cart.findUnique.mockResolvedValue({ id: 3, userId: 7, items: [] });

    await expect(service.create(7, 'REGULAR')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('does not create an order or clear the cart when there is no cart', async () => {
    tx.cart.findUnique.mockResolvedValue(null);

    await expect(service.create(7, 'REGULAR')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('fails and keeps the cart when stock is insufficient', async () => {
    const cart = cartWithItems();
    cart.items[0].quantity = 99;
    tx.cart.findUnique.mockResolvedValue(cart);

    await expect(service.create(7, 'REGULAR')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('fails and keeps the cart when a product is inactive', async () => {
    const cart = cartWithItems();
    cart.items[1].variant.product.isActive = false;
    tx.cart.findUnique.mockResolvedValue(cart);

    await expect(service.create(7, 'REGULAR')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('creates an order only from selected cart items and removes only those items', async () => {
    tx.cart.findUnique.mockResolvedValue(cartWithItems());
    tx.order.create.mockResolvedValue({ id: 44 });
    tx.cartItem.deleteMany.mockResolvedValue({ count: 1 });
    prisma.order.findUnique.mockResolvedValue({ id: 44, items: [] });

    await service.create(7, 'REGULAR', [2]);

    const createCalls = tx.order.create.mock.calls as unknown[][];
    const createArgs = createCalls[0][0] as {
      data: {
        totalAmount: number;
        items: {
          create: Array<{
            variantId: number;
            productName: string;
            quantity: number;
            price: number;
          }>;
        };
      };
    };

    expect(createArgs.data.items.create).toEqual([
      {
        productId: 5,
        variantId: 12,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 1,
        price: 65000,
      },
    ]);
    expect(createArgs.data.totalAmount).toBe(65000 + 40000);
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 3, id: { in: [2] } },
    });
  });

  it('rejects selected items that are not in the cart', async () => {
    tx.cart.findUnique.mockResolvedValue(cartWithItems());

    await expect(service.create(7, 'REGULAR', [999])).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects an empty cart item selection before starting a transaction', async () => {
    await expect(service.create(7, 'REGULAR', [])).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid shipping method before starting a transaction', async () => {
    await expect(
      service.create(7, 'SAME_DAY' as 'REGULAR'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('completes SHIPPED orders after 48 hours when listing orders', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([
        {
          id: 42,
          orderStatusLog: [
            { changedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
          ],
        },
      ])
      .mockResolvedValueOnce([{ id: 42, status: 'COMPLETED' }]);
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.orderStatusLog.create.mockResolvedValue({});

    const result = await service.findAll(7);

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: 'SHIPPED', userId: 7 },
      data: { status: 'COMPLETED' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 42, status: 'COMPLETED' },
    });
    expect(result).toEqual([{ id: 42, status: 'COMPLETED' }]);
  });

  it('does not complete a SHIPPED order before 48 hours', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([
        {
          id: 42,
          orderStatusLog: [
            { changedAt: new Date(Date.now() - 47 * 60 * 60 * 1000) },
          ],
        },
      ])
      .mockResolvedValueOnce([]);

    await service.findAll(7);

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
  });
});

function ownedOrder(status: string) {
  return {
    id: 42,
    userId: 7,
    status,
  };
}

describe('OrdersService.updateStatus', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: ReturnType<typeof buildPrismaMock>['tx'];

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = buildPrismaMock();
    prisma = mocks.prisma;
    tx = mocks.tx;
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new OrdersService();
  });

  it('completes an owned SHIPPED order atomically', async () => {
    tx.order.findFirst.mockResolvedValue(ownedOrder('SHIPPED'));
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.orderStatusLog.create.mockResolvedValue({});
    prisma.order.findFirst.mockResolvedValue(ownedOrder('COMPLETED'));

    const result = await service.updateStatus(42, 7, 'COMPLETED');

    expect(result).toEqual(ownedOrder('COMPLETED'));
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, userId: 7, status: 'SHIPPED' },
      data: { status: 'COMPLETED' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 42, status: 'COMPLETED' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a buyer trying to mark an order as PAID', async () => {
    await expect(
      service.updateStatus(42, 7, 'PAID' as 'COMPLETED'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED'])(
    'rejects completion from %s',
    async (status) => {
      tx.order.findFirst.mockResolvedValue(ownedOrder(status));

      await expect(
        service.updateStatus(42, 7, 'COMPLETED'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    },
  );

  it('rejects an order owned by another buyer', async () => {
    tx.order.findFirst.mockResolvedValue(null);

    await expect(
      service.updateStatus(42, 99, 'COMPLETED'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when a concurrent request already changed the order', async () => {
    tx.order.findFirst.mockResolvedValue(ownedOrder('SHIPPED'));
    tx.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    tx.orderStatusLog.create.mockResolvedValue({});
    prisma.order.findFirst.mockResolvedValue(ownedOrder('COMPLETED'));

    const results = await Promise.allSettled([
      service.updateStatus(42, 7, 'COMPLETED'),
      service.updateStatus(42, 7, 'COMPLETED'),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(ConflictException);
    }
    expect(tx.orderStatusLog.create).toHaveBeenCalledTimes(1);
  });
});

describe('OrdersService.cancel', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: ReturnType<typeof buildPrismaMock>['tx'];

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = buildPrismaMock();
    prisma = mocks.prisma;
    tx = mocks.tx;
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new OrdersService();
  });

  it('cancels an owned PENDING order atomically', async () => {
    tx.order.findFirst.mockResolvedValue(ownedOrder('PENDING'));
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.orderStatusLog.create.mockResolvedValue({});
    prisma.order.findFirst.mockResolvedValue(ownedOrder('CANCELLED'));

    const result = await service.cancel(42, 7);

    expect(result).toEqual(ownedOrder('CANCELLED'));
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, userId: 7, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 42, status: 'CANCELLED' },
    });
  });

  it.each(['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'])(
    'rejects cancelling a %s order',
    async (status) => {
      tx.order.findFirst.mockResolvedValue(ownedOrder(status));

      await expect(service.cancel(42, 7)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    },
  );

  it('rejects cancelling an order owned by another buyer', async () => {
    tx.order.findFirst.mockResolvedValue(null);

    await expect(service.cancel(42, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when a concurrent request already changed the order', async () => {
    tx.order.findFirst.mockResolvedValue(ownedOrder('PENDING'));
    tx.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    tx.orderStatusLog.create.mockResolvedValue({});
    prisma.order.findFirst.mockResolvedValue(ownedOrder('CANCELLED'));

    const results = await Promise.allSettled([
      service.cancel(42, 7),
      service.cancel(42, 7),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(ConflictException);
    }
    expect(tx.orderStatusLog.create).toHaveBeenCalledTimes(1);
  });
});
