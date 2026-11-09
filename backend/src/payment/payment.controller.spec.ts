import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getPrismaClient } from '../prisma';
import { BuyerGuard } from '../auth/buyer.guard';
import { OrdersService } from '../orders/orders.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('PaymentController payment timer', () => {
  let app: INestApplication<App>;
  let jwt: { verify: jest.Mock };
  let prisma: {
    order: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      order: { findFirst: jest.fn() },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: 'BUYER', status: 'ACTIVE' }),
      },
    };
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    jwt = {
      verify: jest.fn((token: string) => {
        if (token === 'valid-buyer-token') {
          return { userId: 7, role: 'BUYER' };
        }
        throw new Error('invalid token');
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        { provide: OrdersService, useValue: { create: jest.fn() } },
        BuyerGuard,
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a request without a JWT', async () => {
    await request(app.getHttpServer())
      .post('/payment/timer/check')
      .send({ orderId: 42 })
      .expect(401);

    expect(prisma.order.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a valid token for a buyer that has been banned', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: 'BUYER',
      status: 'BANNED',
    });

    await request(app.getHttpServer())
      .post('/payment/timer/check')
      .set('Authorization', 'Bearer valid-buyer-token')
      .send({ orderId: 42 })
      .expect(401);

    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('checks the timer only for the authenticated buyer order', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    prisma.order.findFirst.mockResolvedValue({
      id: 42,
      userId: 7,
      status: 'PENDING',
      totalAmount: 208000,
      createdAt,
    });
    const response = await request(app.getHttpServer())
      .post('/payment/timer/check')
      .set('Authorization', 'Bearer valid-buyer-token')
      .send({ orderId: 42 })
      .expect(201);

    expect(response.body).toEqual({
      status: 'PENDING',
      totalAmount: 208000,
      createdAt: createdAt.toISOString(),
    });
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 42, userId: 7 },
    });
  });

  it('does not expose an order owned by another buyer', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .post('/payment/timer/check')
      .set('Authorization', 'Bearer valid-buyer-token')
      .send({ orderId: 99 })
      .expect(201);

    expect(response.body).toEqual({ status: 'not_found' });
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 99, userId: 7 },
    });
  });

  it('rejects an invalid orderId body', async () => {
    await request(app.getHttpServer())
      .post('/payment/timer/check')
      .set('Authorization', 'Bearer valid-buyer-token')
      .send({ orderId: 'not-a-number' })
      .expect(400);

    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });
});
