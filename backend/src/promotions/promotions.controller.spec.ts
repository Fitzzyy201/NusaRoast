import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getPrismaClient } from '../prisma';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('PromotionsController', () => {
  let app: INestApplication<App>;
  let jwt: { verify: jest.Mock };
  let promotionsService: {
    findPublic: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (getPrismaClient as jest.Mock).mockReturnValue({
      user: {
        findUnique: jest.fn(({ where }: { where: { id: number } }) => {
          if (where.id === 1) return { role: 'SELLER', status: 'ACTIVE' };
          if (where.id === 2) return { role: 'BUYER', status: 'ACTIVE' };
          return null;
        }),
      },
    });
    jwt = {
      verify: jest.fn((token: string) => {
        if (token === 'seller-token') return { userId: 1, role: 'SELLER' };
        if (token === 'buyer-token') return { userId: 2, role: 'BUYER' };
        throw new Error('invalid token');
      }),
    };
    promotionsService = {
      findPublic: jest.fn().mockResolvedValue([{ id: 1 }]),
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      remove: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsController, AdminPromotionsController],
      providers: [
        { provide: PromotionsService, useValue: promotionsService },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('keeps the promotion list public', async () => {
    await request(app.getHttpServer()).get('/promotions').expect(200);

    expect(promotionsService.findPublic).toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('protects admin promotion routes', async () => {
    await request(app.getHttpServer()).get('/admin/promotions').expect(401);
    await request(app.getHttpServer())
      .get('/admin/promotions')
      .set('Authorization', 'Bearer buyer-token')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/promotions')
      .set('Authorization', 'Bearer seller-token')
      .expect(200);
  });

  it('validates promotion payloads and delegates to the service', async () => {
    await request(app.getHttpServer())
      .post('/admin/promotions')
      .set('Authorization', 'Bearer seller-token')
      .send({ productId: 1, title: 'Hi', description: 'short' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/admin/promotions')
      .set('Authorization', 'Bearer seller-token')
      .send({
        productId: 1,
        title: 'Gayo spesial',
        description: 'Nikmati Gayo dengan harga spesial minggu ini.',
        sortOrder: 2,
      })
      .expect(201);

    expect(promotionsService.create).toHaveBeenCalledWith({
      productId: 1,
      title: 'Gayo spesial',
      description: 'Nikmati Gayo dengan harga spesial minggu ini.',
      sortOrder: 2,
    });
  });

  it('delegates update and remove to the service', async () => {
    await request(app.getHttpServer())
      .post('/admin/promotions/1')
      .set('Authorization', 'Bearer seller-token')
      .send({ title: 'Judul baru' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/admin/promotions/1/remove')
      .set('Authorization', 'Bearer seller-token')
      .expect(201);

    expect(promotionsService.update).toHaveBeenCalledWith(1, {
      title: 'Judul baru',
    });
    expect(promotionsService.remove).toHaveBeenCalledWith(1);
  });
});
