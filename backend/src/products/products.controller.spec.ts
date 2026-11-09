import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { getPrismaClient } from '../prisma';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

const validProduct = {
  name: 'Gayo Arabica',
  category: 'ARABICA',
  origin: 'Gayo, Aceh',
  roastLevel: 3,
  variants: [{ weight: '250g', price: 95000, stock: 10 }],
};

const mutationRequests = [
  { path: '/products', body: validProduct },
  {
    path: '/products/2',
    body: { variants: [{ weight: '250g', price: 99000, stock: 4 }] },
  },
  { path: '/products/2/remove', body: {} },
];

describe('ProductsController mutations', () => {
  let app: INestApplication<App>;
  let jwt: { verify: jest.Mock };
  let productsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const prisma = getPrismaClient as jest.Mock;
    prisma.mockReturnValue({
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
    productsService = {
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findOne: jest.fn().mockResolvedValue({ id: 2 }),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 2 }),
      remove: jest.fn().mockResolvedValue({ id: 2 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('keeps the product list public', async () => {
    await request(app.getHttpServer()).get('/products').expect(200);

    expect(productsService.findAll).toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('keeps the product detail public', async () => {
    await request(app.getHttpServer()).get('/products/2').expect(200);

    expect(productsService.findOne).toHaveBeenCalledWith(2);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it.each(mutationRequests)(
    'rejects an unauthenticated mutation to $path',
    async ({ path, body }) => {
      await request(app.getHttpServer()).post(path).send(body).expect(401);

      expect(productsService.create).not.toHaveBeenCalled();
      expect(productsService.update).not.toHaveBeenCalled();
      expect(productsService.remove).not.toHaveBeenCalled();
    },
  );

  it.each(mutationRequests)(
    'rejects a buyer mutation to $path',
    async ({ path, body }) => {
      await request(app.getHttpServer())
        .post(path)
        .set('Authorization', 'Bearer buyer-token')
        .send(body)
        .expect(403);

      expect(productsService.create).not.toHaveBeenCalled();
      expect(productsService.update).not.toHaveBeenCalled();
      expect(productsService.remove).not.toHaveBeenCalled();
    },
  );

  it('allows a seller to create a product', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', 'Bearer seller-token')
      .send(validProduct)
      .expect(201);

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining(validProduct),
    );
  });

  it('allows a seller to update a product', async () => {
    await request(app.getHttpServer())
      .post('/products/2')
      .set('Authorization', 'Bearer seller-token')
      .send({ variants: [{ weight: '250g', price: 99000, stock: 4 }] })
      .expect(201);

    expect(productsService.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        variants: [{ weight: '250g', price: 99000, stock: 4 }],
      }),
    );
  });

  it('allows a seller to remove a product', async () => {
    await request(app.getHttpServer())
      .post('/products/2/remove')
      .set('Authorization', 'Bearer seller-token')
      .send({})
      .expect(201);

    expect(productsService.remove).toHaveBeenCalledWith(2);
  });

  it('rejects invalid product data from a seller', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', 'Bearer seller-token')
      .send({
        ...validProduct,
        variants: [{ weight: '250g', price: 95000, stock: -1 }],
      })
      .expect(400);

    expect(productsService.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid category and roast level on update', async () => {
    await request(app.getHttpServer())
      .post('/products/2')
      .set('Authorization', 'Bearer seller-token')
      .send({ category: 'LIBERICA', roastLevel: 6 })
      .expect(400);

    expect(productsService.update).not.toHaveBeenCalled();
  });
});
