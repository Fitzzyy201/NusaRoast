import { BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { getPrismaClient } from '../prisma';
import { PaymentService } from './payment.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

const SERVER_KEY = 'test-server-key';

type OrderRow = {
  id: number;
  userId: number;
  totalAmount: number;
  shippingCost: number;
  shippingMethod: string;
  status: string;
  snapToken: string | null;
  createdAt: Date;
};

function buildOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 42,
    userId: 7,
    totalAmount: 113000,
    shippingCost: 18000,
    shippingMethod: 'REGULAR',
    status: 'PENDING',
    snapToken: 'snap-token',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function sign(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = SERVER_KEY,
): string {
  return createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

function callbackBody(
  overrides: Record<string, unknown> = {},
  signature?: string,
): Record<string, unknown> {
  const fields = {
    order_id: '42',
    status_code: '200',
    gross_amount: '113000.00',
    transaction_status: 'settlement',
    fraud_status: 'accept',
    ...overrides,
  };

  return {
    ...fields,
    signature_key:
      signature ??
      sign(
        String(fields.order_id),
        String(fields.status_code),
        String(fields.gross_amount),
      ),
  };
}

function buildPrismaMock(initialOrder: OrderRow) {
  const state = { order: { ...initialOrder } };

  const tx = {
    order: {
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: number; status: string };
          data: { status: string };
        }) => {
          if (
            state.order.id !== where.id ||
            state.order.status !== where.status
          ) {
            return { count: 0 };
          }

          state.order.status = data.status;
          return { count: 1 };
        },
      ),
      findUnique: jest.fn(() => ({ status: state.order.status })),
    },
    orderItem: {
      findMany: jest.fn(() => [
        {
          variantId: 11,
          productName: 'Gayo Arabica',
          variantWeight: '250g',
          quantity: 1,
        },
      ]),
    },
    productVariant: {
      updateMany: jest.fn(() => ({ count: 1 })),
    },
    orderStatusLog: {
      create: jest.fn(() => ({})),
    },
  };

  const prisma = {
    order: {
      findUnique: jest.fn(() => ({ ...state.order })),
    },
    orderStatusLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        const snapshot = { ...state.order };

        try {
          return await callback(tx);
        } catch (error) {
          state.order = snapshot;
          throw error;
        }
      },
    ),
  };

  return { prisma, tx, state };
}

describe('PaymentService.verifyMidtransCallback', () => {
  let service: PaymentService;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: ReturnType<typeof buildPrismaMock>['tx'];
  let state: ReturnType<typeof buildPrismaMock>['state'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);

    const mocks = buildPrismaMock(buildOrder());
    prisma = mocks.prisma;
    tx = mocks.tx;
    state = mocks.state;

    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new PaymentService({ create: jest.fn() } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a valid settlement and updates status with one status log', async () => {
    const result = await service.verifyMidtransCallback(callbackBody());

    expect(result).toMatchObject({
      valid: true,
      status: 'PAID',
      message: 'Status updated successfully',
    });
    expect(state.order.status).toBe('PAID');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: 'PENDING' },
      data: { status: 'PAID' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 42, status: 'PAID' },
    });
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: {
        id: 11,
        stock: { gte: 1 },
        product: { isActive: true },
      },
      data: { stock: { decrement: 1 } },
    });
  });

  it('keeps the order pending when stock cannot be decremented', async () => {
    (tx.productVariant.updateMany as jest.Mock).mockResolvedValueOnce({
      count: 0,
    });

    await expect(
      service.verifyMidtransCallback(callbackBody()),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(state.order.status).toBe('PENDING');
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature without touching the order or log', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({}, '0'.repeat(128)),
    );

    expect(result).toMatchObject({
      valid: false,
      message: 'Callback signature invalid',
    });
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('rejects a valid signature whose gross_amount does not match the order', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({ gross_amount: '113000.01' }),
    );

    expect(result).toMatchObject({
      valid: false,
      message: 'gross_amount does not match the stored order total',
      status: 'PENDING',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('accepts a nominal with a different string format when the value matches', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({ gross_amount: '113000' }),
    );

    expect(result).toMatchObject({ valid: true, status: 'PAID' });
  });

  it('does not update or log a duplicate settlement for an already paid order', async () => {
    const mocks = buildPrismaMock(buildOrder({ status: 'PAID' }));
    prisma = mocks.prisma;
    tx = mocks.tx;
    state = mocks.state;
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new PaymentService({ create: jest.fn() } as never);

    const result = await service.verifyMidtransCallback(callbackBody());

    expect(result).toMatchObject({ valid: true, status: 'PAID' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PAID');
  });

  it('does not write a status log when another callback changed the order first', async () => {
    (tx.order.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (tx.order.findUnique as jest.Mock).mockResolvedValueOnce({
      status: 'PAID',
    });

    const result = await service.verifyMidtransCallback(callbackBody());

    expect(result).toMatchObject({ valid: true, status: 'PAID' });
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
  });

  it.each(['pending', 'expire', 'deny', 'cancel'])(
    'does not downgrade a PAID order on a late %s notification',
    async (transactionStatus) => {
      const mocks = buildPrismaMock(buildOrder({ status: 'PAID' }));
      prisma = mocks.prisma;
      tx = mocks.tx;
      state = mocks.state;
      (getPrismaClient as jest.Mock).mockReturnValue(prisma);
      service = new PaymentService({ create: jest.fn() } as never);

      const result = await service.verifyMidtransCallback(
        callbackBody({ transaction_status: transactionStatus }),
      );

      expect(result).toMatchObject({ valid: true, status: 'PAID' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
      expect(state.order.status).toBe('PAID');
    },
  );

  it('cancels a PENDING order on expire', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({ transaction_status: 'expire' }),
    );

    expect(result).toMatchObject({ valid: true, status: 'CANCELLED' });
    expect(state.order.status).toBe('CANCELLED');
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 42, status: 'CANCELLED' },
    });
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('marks a PENDING order PAID on capture with fraud_status accept', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({ transaction_status: 'capture', fraud_status: 'accept' }),
    );

    expect(result).toMatchObject({ valid: true, status: 'PAID' });
    expect(state.order.status).toBe('PAID');
  });

  it('does not mark an order PAID on capture with fraud_status challenge', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({
        transaction_status: 'capture',
        fraud_status: 'challenge',
      }),
    );

    expect(result).toMatchObject({ valid: true, status: 'PENDING' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('cancels a PENDING order on capture with fraud_status deny', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({ transaction_status: 'capture', fraud_status: 'deny' }),
    );

    expect(result).toMatchObject({ valid: true, status: 'CANCELLED' });
    expect(state.order.status).toBe('CANCELLED');
  });

  it('does not mark settlement PAID when status_code is not 200', async () => {
    const result = await service.verifyMidtransCallback(
      callbackBody({ status_code: '201' }),
    );

    expect(result).toMatchObject({ valid: true, status: 'PENDING' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('rolls back the status update when writing OrderStatusLog fails', async () => {
    (tx.orderStatusLog.create as jest.Mock).mockRejectedValue(
      new Error('log write failed'),
    );

    await expect(
      service.verifyMidtransCallback(callbackBody()),
    ).rejects.toThrow('log write failed');

    expect(tx.order.updateMany).toHaveBeenCalledTimes(1);
    expect(state.order.status).toBe('PENDING');
  });
});
