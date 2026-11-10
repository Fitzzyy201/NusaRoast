import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { getPrismaClient } from '../prisma';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

const product = {
  id: 1,
  name: 'Gayo Arabica',
  category: 'ARABICA',
  origin: 'Gayo, Aceh',
  description: 'Kopi arabika',
  roastLevel: 3,
  imageBase64: 'data:image/png;base64,abc',
  isActive: true,
  variants: [
    {
      id: 1,
      productId: 1,
      weight: '250g',
      price: 95000,
      stock: 10,
      sortOrder: 0,
    },
  ],
};

const promotion = {
  id: 1,
  title: 'Gayo spesial',
  description: 'Nikmati Gayo dengan harga spesial minggu ini.',
  sortOrder: 0,
  productId: 1,
  createdAt: new Date('2026-10-26T00:00:00Z'),
  updatedAt: new Date('2026-10-26T00:00:00Z'),
  product,
};

describe('PromotionsService', () => {
  const promotionModel = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const productModel = { findUnique: jest.fn() };
  const prisma = { promotion: promotionModel, product: productModel };

  let service: PromotionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new PromotionsService();
  });

  it('returns only promotions for active products publicly', async () => {
    promotionModel.findMany.mockResolvedValue([promotion]);

    const result = await service.findPublic();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      title: 'Gayo spesial',
      product: { id: 1, stock: 10 },
    });
    expect(promotionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product: { isActive: true } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('returns all promotions for the admin', async () => {
    promotionModel.findMany.mockResolvedValue([promotion]);

    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(promotionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('creates a promotion for an active product', async () => {
    productModel.findUnique.mockResolvedValue({ id: 1, isActive: true });
    promotionModel.create.mockResolvedValue(promotion);

    await expect(
      service.create({
        productId: 1,
        title: '  Gayo spesial  ',
        description: '  Nikmati Gayo dengan harga spesial minggu ini.  ',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 1 }));

    expect(promotionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          productId: 1,
          title: 'Gayo spesial',
          description: 'Nikmati Gayo dengan harga spesial minggu ini.',
          sortOrder: 0,
        },
      }),
    );
  });

  it('rejects a missing or inactive product', async () => {
    productModel.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.create({
        productId: 99,
        title: 'Promo',
        description: 'Deskripsi promosi yang cukup panjang.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    productModel.findUnique.mockResolvedValueOnce({ id: 1, isActive: false });
    await expect(
      service.create({
        productId: 1,
        title: 'Promo',
        description: 'Deskripsi promosi yang cukup panjang.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects updates and deletes for a missing promotion', async () => {
    promotionModel.findUnique.mockResolvedValue(null);

    await expect(
      service.update(99, { title: 'Judul baru' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a promotion and validates a replacement product', async () => {
    promotionModel.findUnique.mockResolvedValue({ id: 1 });
    productModel.findUnique.mockResolvedValue({ id: 2, isActive: true });
    promotionModel.update.mockResolvedValue({
      ...promotion,
      productId: 2,
      title: 'Judul baru',
    });

    await expect(
      service.update(1, {
        productId: 2,
        title: '  Judul baru  ',
        sortOrder: 3,
      }),
    ).resolves.toEqual(expect.objectContaining({ title: 'Judul baru' }));

    expect(promotionModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          productId: 2,
          title: 'Judul baru',
          description: undefined,
          sortOrder: 3,
        },
      }),
    );
  });

  it('allows editing a promotion whose product became inactive', async () => {
    promotionModel.findUnique.mockResolvedValue({ id: 1, productId: 1 });
    promotionModel.update.mockResolvedValue({
      ...promotion,
      product: { ...product, isActive: false },
    });

    await expect(
      service.update(1, {
        productId: 1,
        title: 'Judul baru',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 1 }));

    expect(productModel.findUnique).not.toHaveBeenCalled();
  });

  it('removes an existing promotion', async () => {
    promotionModel.findUnique.mockResolvedValue({ id: 1 });
    promotionModel.delete.mockResolvedValue(promotion);

    await expect(service.remove(1)).resolves.toEqual(
      expect.objectContaining({ id: 1 }),
    );
    expect(promotionModel.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });
});
