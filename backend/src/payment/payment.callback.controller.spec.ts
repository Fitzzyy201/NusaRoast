import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getPrismaClient } from '../prisma';
import { BuyerGuard } from '../auth/buyer.guard';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('PaymentController payment callback and sync', () => {
  let app: INestApplication<App>;
  let paymentService: {
    verifyMidtransCallback: jest.Mock;
    syncMidtransStatus: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: 'BUYER', status: 'ACTIVE' }),
      },
    };
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);

    paymentService = {
      verifyMidtransCallback: jest.fn(),
      syncMidtransStatus: jest.fn(),
    };

    const jwt = {
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
        { provide: PaymentService, useValue: paymentService },
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

  it('returns 401 for an invalid callback signature', async () => {
    paymentService.verifyMidtransCallback.mockResolvedValue({
      valid: false,
      code: 'INVALID_SIGNATURE',
      message: 'Callback signature invalid',
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/payment/callback')
      .send({ order_id: '42' })
      .expect(401);
  });

  it('returns 400 for a callback with missing required fields', async () => {
    paymentService.verifyMidtransCallback.mockResolvedValue({
      valid: false,
      code: 'MISSING_FIELDS',
      message: 'Missing required fields',
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/payment/callback')
      .send({})
      .expect(400);
  });

  it('returns 400 for a callback with a mismatched amount', async () => {
    paymentService.verifyMidtransCallback.mockResolvedValue({
      valid: false,
      code: 'AMOUNT_MISMATCH',
      message: 'gross_amount does not match the stored order total',
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/payment/callback')
      .send({ order_id: '42' })
      .expect(400);
  });

  it('returns 404 when the callback order is not found', async () => {
    paymentService.verifyMidtransCallback.mockResolvedValue({
      valid: false,
      code: 'ORDER_NOT_FOUND',
      message: 'Order not found in database',
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/payment/callback')
      .send({ order_id: '42' })
      .expect(404);
  });

  it('returns HTTP 200 for a valid callback', async () => {
    const data = {
      valid: true,
      message: 'Status updated successfully',
      status: 'PAID',
    };
    paymentService.verifyMidtransCallback.mockResolvedValue(data);

    const response = await request(app.getHttpServer())
      .post('/payment/callback')
      .send({ order_id: '42' })
      .expect(200);

    expect(response.body).toEqual({ status: 'ok', data });
  });

  it('requires authentication before syncing a payment status', async () => {
    await request(app.getHttpServer()).post('/payment/sync/42').expect(401);

    expect(paymentService.syncMidtransStatus).not.toHaveBeenCalled();
  });

  it('syncs the authenticated buyer order', async () => {
    const result = {
      orderId: 42,
      status: 'PAID',
      changed: true,
      verified: true,
    };
    paymentService.syncMidtransStatus.mockResolvedValue(result);

    const response = await request(app.getHttpServer())
      .post('/payment/sync/42')
      .set('Authorization', 'Bearer valid-buyer-token')
      .expect(200);

    expect(response.body).toEqual(result);
    expect(paymentService.syncMidtransStatus).toHaveBeenCalledWith(7, 42);
  });
});
