import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/admin.guard';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('AdminController', () => {
  let app: INestApplication<App>;
  const adminService = {
    getDashboard: jest.fn(),
    getBuyers: jest.fn(),
    banBuyer: jest.fn(),
    getOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
    inputResi: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    adminService.getOrders.mockResolvedValue([]);
    adminService.updateOrderStatus.mockResolvedValue({ id: 1 });
    adminService.inputResi.mockResolvedValue({ id: 1 });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: JwtService, useValue: { verify: jest.fn() } },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes the status query to the service', async () => {
    await request(app.getHttpServer())
      .get('/admin/orders?status=PAID')
      .expect(200);

    expect(adminService.getOrders).toHaveBeenCalledWith({ status: 'PAID' });
  });

  it('rejects an invalid status query', async () => {
    await request(app.getHttpServer())
      .get('/admin/orders?status=UNKNOWN')
      .expect(400);

    expect(adminService.getOrders).not.toHaveBeenCalled();
  });

  it('validates the order id and status body', async () => {
    await request(app.getHttpServer())
      .post('/admin/orders/not-a-number/status')
      .send({ status: 'PROCESSING' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/admin/orders/1/status')
      .send({ status: 'PAID' })
      .expect(400);

    expect(adminService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('updates order status using the route id', async () => {
    await request(app.getHttpServer())
      .post('/admin/orders/7/status')
      .send({ status: 'PROCESSING' })
      .expect(201);

    expect(adminService.updateOrderStatus).toHaveBeenCalledWith(
      7,
      'PROCESSING',
      undefined,
    );
  });

  it('passes the rejection reason when cancelling an order', async () => {
    await request(app.getHttpServer())
      .post('/admin/orders/7/status')
      .send({ status: 'CANCELLED', reason: 'Stok habis' })
      .expect(201);

    expect(adminService.updateOrderStatus).toHaveBeenCalledWith(
      7,
      'CANCELLED',
      'Stok habis',
    );
  });

  it('validates the resi body', async () => {
    await request(app.getHttpServer())
      .post('/admin/orders/1/resi')
      .send({ resiNumber: '   ' })
      .expect(400);

    expect(adminService.inputResi).not.toHaveBeenCalled();
  });

  it('saves a trimmed resi using the route id', async () => {
    await request(app.getHttpServer())
      .post('/admin/orders/7/resi')
      .send({ resiNumber: 'JNE123' })
      .expect(201);

    expect(adminService.inputResi).toHaveBeenCalledWith(7, 'JNE123');
  });

  it('validates the ban buyer payload', async () => {
    await request(app.getHttpServer())
      .post('/admin/buyers/ban')
      .send({ userId: '2', banned: 'yes' })
      .expect(400);

    expect(adminService.banBuyer).not.toHaveBeenCalled();
  });
});
