import { BadRequestException } from '@nestjs/common';
import { getPrismaClient } from '../prisma';
import { PaymentService } from './payment.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

function buildPrismaMock() {
  return {
    order: {
      findFirst: jest.fn(),
    },
  };
}

describe('PaymentService.checkPaymentTimer', () => {
  let service: PaymentService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new PaymentService({ create: jest.fn() } as never);
  });

  it('returns only the owned order timer data', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    prisma.order.findFirst.mockResolvedValue({
      id: 42,
      userId: 7,
      status: 'PENDING',
      totalAmount: 208000,
      createdAt,
    });

    const result = await service.checkPaymentTimer(7, 42);

    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 42, userId: 7 },
    });
    expect(result).toEqual({
      status: 'PENDING',
      totalAmount: 208000,
      createdAt,
    });
  });

  it('returns not_found for an order owned by another buyer', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    const result = await service.checkPaymentTimer(99, 42);

    expect(result).toEqual({ status: 'not_found' });
    expect(Object.keys(result)).toEqual(['status']);
  });

  it('rejects an invalid order id', async () => {
    await expect(service.checkPaymentTimer(7, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });
});
