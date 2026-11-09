import {
  BadGatewayException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import axios from 'axios';
import { getPrismaClient } from '../prisma';
import { PaymentService } from './payment.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock('axios');

const SERVER_KEY = 'test-server-key';
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedGet = axios.get as jest.Mock;

type OrderRow = {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  snapToken: string | null;
};

function buildOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 42,
    userId: 7,
    status: 'PENDING',
    totalAmount: 113000,
    snapToken: 'snap-token',
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

function statusBody(overrides: Record<string, unknown> = {}) {
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
    signature_key: sign(
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
      findFirst: jest.fn(() => ({ ...state.order })),
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

describe('PaymentService.syncMidtransStatus', () => {
  let service: PaymentService;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: ReturnType<typeof buildPrismaMock>['tx'];
  let state: ReturnType<typeof buildPrismaMock>['state'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

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

  it('marks a PENDING order PAID after a verified settlement', async () => {
    mockedGet.mockResolvedValue({ data: statusBody() });

    const result = await service.syncMidtransStatus(7, 42);

    expect(result).toEqual({
      orderId: 42,
      status: 'PAID',
      changed: true,
      verified: true,
    });
    expect(state.order.status).toBe('PAID');
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 42, userId: 7 },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        snapToken: true,
      },
    });
    expect(mockedGet).toHaveBeenCalled();
    const [statusUrl, requestConfig] = mockedGet.mock.calls[0] as [
      string,
      { headers: { Authorization: string } },
    ];
    expect(statusUrl).toBe('https://api.sandbox.midtrans.com/v2/42/status');
    expect(requestConfig.headers.Authorization).toBe(
      `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`,
    );
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

  it('keeps the order PENDING when stock cannot be decremented', async () => {
    mockedGet.mockResolvedValue({ data: statusBody() });
    (tx.productVariant.updateMany as jest.Mock).mockResolvedValueOnce({
      count: 0,
    });

    await expect(service.syncMidtransStatus(7, 42)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(state.order.status).toBe('PENDING');
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
  });

  it('does not call Midtrans or change a non-PENDING order', async () => {
    const mocks = buildPrismaMock(buildOrder({ status: 'PAID' }));
    prisma = mocks.prisma;
    tx = mocks.tx;
    state = mocks.state;
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new PaymentService({ create: jest.fn() } as never);

    const result = await service.syncMidtransStatus(7, 42);

    expect(result).toEqual({
      orderId: 42,
      status: 'PAID',
      changed: false,
      verified: true,
    });
    expect(mockedGet).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not mark a CANCELLED order PAID', async () => {
    const mocks = buildPrismaMock(buildOrder({ status: 'CANCELLED' }));
    prisma = mocks.prisma;
    tx = mocks.tx;
    state = mocks.state;
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new PaymentService({ create: jest.fn() } as never);

    const result = await service.syncMidtransStatus(7, 42);

    expect(result).toEqual({
      orderId: 42,
      status: 'CANCELLED',
      changed: false,
      verified: true,
    });
    expect(mockedGet).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a valid response whose order_id does not match', async () => {
    mockedGet.mockResolvedValue({ data: statusBody({ order_id: '43' }) });

    await expect(service.syncMidtransStatus(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('rejects a valid response whose gross_amount does not match', async () => {
    mockedGet.mockResolvedValue({
      data: statusBody({ gross_amount: '113000.01' }),
    });

    await expect(service.syncMidtransStatus(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('rejects a status response with an invalid signature', async () => {
    const body = statusBody();
    body.signature_key = '0'.repeat(128);
    mockedGet.mockResolvedValue({ data: body });

    await expect(service.syncMidtransStatus(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(state.order.status).toBe('PENDING');
  });

  it('keeps the order PENDING when Midtrans has no transaction yet', async () => {
    mockedGet.mockRejectedValue({
      response: { status: 404, data: { status_code: '404' } },
    });

    const result = await service.syncMidtransStatus(7, 42);

    expect(result).toEqual({
      orderId: 42,
      status: 'PENDING',
      changed: false,
      verified: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns BadGateway when Midtrans status check fails', async () => {
    mockedGet.mockRejectedValue({
      response: { status: 500, data: { status_message: 'internal error' } },
    });

    await expect(service.syncMidtransStatus(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not expose another buyer order', async () => {
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.syncMidtransStatus(7, 99)).rejects.toThrow(
      'Pesanan tidak ditemukan',
    );
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('does not mark a challenge capture PAID', async () => {
    mockedGet.mockResolvedValue({
      data: statusBody({
        transaction_status: 'capture',
        fraud_status: 'challenge',
      }),
    });

    const result = await service.syncMidtransStatus(7, 42);

    expect(result).toEqual({
      orderId: 42,
      status: 'PENDING',
      changed: false,
      verified: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
