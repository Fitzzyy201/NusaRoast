import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { getPrismaClient } from '../prisma';
import { PaymentService } from './payment.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock('axios');

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedPost = axios.post as jest.Mock;

function buildPrismaMock() {
  const tx = {
    order: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    orderStatusLog: {
      create: jest.fn(),
    },
  };

  return {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    orderStatusLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    tx,
  };
}

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    userId: 7,
    totalAmount: 208000,
    shippingCost: 18000,
    shippingMethod: 'REGULAR',
    status: 'PENDING',
    snapToken: null,
    createdAt: new Date(Date.now() - 60 * 1000),
    user: {
      id: 7,
      name: 'Buyer',
      email: 'buyer@test.com',
      phone: '08123456789',
      status: 'ACTIVE',
    },
    ...overrides,
  };
}

function buildItems() {
  return [
    {
      productId: 2,
      variantId: 11,
      productName: 'Gayo Arabica',
      variantWeight: '250g',
      price: 95000,
      quantity: 2,
      variant: { stock: 10, product: { isActive: true } },
    },
  ];
}

describe('PaymentService.retryMidtransSnapToken', () => {
  let service: PaymentService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = buildPrismaMock();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    loggerError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    service = new PaymentService({ create: jest.fn() } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function arrangeSuccessfulOrder(order = buildOrder()) {
    prisma.order.findFirst.mockResolvedValue(order);
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.orderItem.findMany.mockResolvedValue(buildItems());
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockedPost.mockResolvedValue({
      data: {
        transaction_id: 'tx-1',
        token: 'snap-token-1',
        redirect_url: 'https://example.test/pay',
        status_code: '201',
      },
    });
  }

  it('creates a Snap token for the existing PENDING order without duplicating order data', async () => {
    arrangeSuccessfulOrder();

    const result = await service.retryMidtransSnapToken(7, 42);

    expect(result).toMatchObject({
      snapToken: 'snap-token-1',
      grandTotal: 208000,
      transactionId: 'tx-1',
      order: { id: 42, userId: 7, status: 'PENDING' },
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const call = mockedPost.mock.calls[0] as [unknown, unknown, unknown];
    const payload = call[1] as {
      transaction_details: { order_id: string; gross_amount: number };
      item_details: Array<{
        id: string;
        price: number;
        quantity: number;
        name: string;
      }>;
      signature_key?: string;
    };
    expect(payload.transaction_details).toEqual({
      order_id: '42',
      gross_amount: 208000,
    });
    expect(payload.item_details).toEqual([
      {
        id: '11',
        price: 95000,
        quantity: 2,
        name: 'Gayo Arabica 250g',
      },
      {
        id: 'SHIPPING',
        price: 18000,
        quantity: 1,
        name: 'Biaya Pengiriman',
      },
    ]);
    expect(payload).not.toHaveProperty('signature_key');

    const options = call[2] as {
      headers: { Authorization: string; 'Content-Type': string };
    };
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toMatch(/^Basic /);

    const itemDetailsTotal = payload.item_details.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    expect(itemDetailsTotal).toBe(payload.transaction_details.gross_amount);
    expect(itemDetailsTotal).toBe(208000);

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 42,
        userId: 7,
        status: 'PENDING',
        snapToken: null,
      },
      data: { snapToken: 'snap-token-1' },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.orderItem.create).not.toHaveBeenCalled();
  });

  it('does not add a shipping line when the order has zero shipping cost', async () => {
    arrangeSuccessfulOrder(
      buildOrder({ totalAmount: 190000, shippingCost: 0 }),
    );

    await service.retryMidtransSnapToken(7, 42);

    const call = mockedPost.mock.calls[0] as [unknown, unknown];
    const payload = call[1] as {
      transaction_details: { gross_amount: number };
      item_details: Array<{
        id: string;
        price: number;
        quantity: number;
        name: string;
      }>;
    };

    expect(payload.item_details).toEqual([
      {
        id: '11',
        price: 95000,
        quantity: 2,
        name: 'Gayo Arabica 250g',
      },
    ]);

    const itemDetailsTotal = payload.item_details.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    expect(itemDetailsTotal).toBe(190000);
    expect(itemDetailsTotal).toBe(payload.transaction_details.gross_amount);
  });

  it('returns a clear 502 error and does not persist a token when Midtrans rejects the request', async () => {
    arrangeSuccessfulOrder();
    mockedPost.mockRejectedValue({
      response: { status: 401, data: { message: 'Unauthorized' } },
    });

    const error = await service
      .retryMidtransSnapToken(7, 42)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadGatewayException);
    expect((error as Error).message).toBe(
      'Gagal membuat pembayaran Midtrans. Silakan coba lagi.',
    );
    expect((error as Error).message).not.toContain('Unauthorized');
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('logs Midtrans HTTP status and only sanitized error fields', async () => {
    arrangeSuccessfulOrder();
    mockedPost.mockRejectedValue({
      response: {
        status: 400,
        data: {
          status_code: '400',
          status_message: 'Invalid payload\r\nserver=test-server-key',
          validation_messages: [
            'transaction_details.gross_amount is not equal to the sum of item_details',
            'client=test-client-key',
            'line one\nline two',
          ],
          error_messages: ['Safe validation error'],
          authorization: 'Basic dGVzdC1zZXJ2ZXIta2V5Og==',
          server_key: 'test-server-key',
          client_key: 'test-client-key',
          token: 'secret-snap-token',
          nested: { secret: 'test-server-key' },
        },
      },
    });

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    expect(loggerError).toHaveBeenCalledTimes(1);
    const [message] = loggerError.mock.calls[0] as [string];

    expect(message).toContain('status: 400');
    expect(message).toContain('Invalid payload');
    expect(message).toContain(
      'transaction_details.gross_amount is not equal to the sum of item_details',
    );
    expect(message).toContain('Safe validation error');
    expect(message).not.toContain('test-server-key');
    expect(message).not.toContain('test-client-key');
    expect(message).not.toContain('secret-snap-token');
    expect(message).not.toContain('Basic ');
    expect(message).not.toContain('authorization');
    expect(message).not.toContain('server_key');
    expect(message).not.toContain('client_key');
    expect(message).not.toContain('\n');
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('logs no response status when Midtrans cannot be reached', async () => {
    arrangeSuccessfulOrder();
    mockedPost.mockRejectedValue({ code: 'ECONNABORTED' });

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    const [message] = loggerError.mock.calls[0] as [string];

    expect(message).toContain('status: no response');
    expect(message).toContain('{}');
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('redacts secrets and truncates a string error body', async () => {
    arrangeSuccessfulOrder();
    mockedPost.mockRejectedValue({
      response: {
        status: 502,
        data: `Bad gateway\nserver=test-server-key ${'x'.repeat(2000)}`,
      },
    });

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    const [message] = loggerError.mock.calls[0] as [string];

    expect(message).toContain('status: 502');
    expect(message).toContain('[redacted]');
    expect(message).toContain('[truncated]');
    expect(message).not.toContain('test-server-key');
    expect(message).not.toContain('\n');
  });

  it('rejects an order owned by another buyer', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(service.retryMidtransSnapToken(99, 42)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('cancels and rejects a retry after the 20 minute payment window', async () => {
    prisma.order.findFirst.mockResolvedValue(
      buildOrder({ createdAt: new Date(Date.now() - 21 * 60 * 1000) }),
    );
    prisma.tx.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.tx.orderStatusLog.create.mockResolvedValue({});

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    expect(prisma.tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: { orderId: 42, status: 'CANCELLED' },
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('rejects an order that already has a Snap token', async () => {
    prisma.order.findFirst.mockResolvedValue(
      buildOrder({ snapToken: 'existing-token' }),
    );

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it.each(['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'])(
    'rejects an order with status %s',
    async (status) => {
      prisma.order.findFirst.mockResolvedValue(buildOrder({ status }));

      await expect(
        service.retryMidtransSnapToken(7, 42),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockedPost).not.toHaveBeenCalled();
    },
  );

  it('rejects when the stored item snapshot does not match the stored total', async () => {
    arrangeSuccessfulOrder(buildOrder({ totalAmount: 999999 }));

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockedPost).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('does not return a token when the order changes before the token is persisted', async () => {
    arrangeSuccessfulOrder();
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.retryMidtransSnapToken(7, 42)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('serializes concurrent retries for the same order', async () => {
    arrangeSuccessfulOrder();

    let releasePost!: (value: unknown) => void;
    const postRequest = new Promise((resolve) => {
      releasePost = resolve;
    });
    mockedPost.mockReturnValue(postRequest);

    const first = service.retryMidtransSnapToken(7, 42);
    const second = service.retryMidtransSnapToken(7, 42);

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(mockedPost).toHaveBeenCalledTimes(1);

    releasePost({
      data: {
        transaction_id: 'tx-1',
        token: 'snap-token-1',
        redirect_url: 'https://example.test/pay',
        status_code: '201',
      },
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
    expect(firstResult.snapToken).toBe('snap-token-1');
    expect(secondResult.snapToken).toBe('snap-token-1');
  });
});
