import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';
import { getPrismaClient } from '../prisma';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('ProductsService deletion', () => {
  const product = {
    findUnique: jest.fn(),
    delete: jest.fn(),
  };
  const orderItem = { count: jest.fn() };
  const cartItem = { count: jest.fn() };
  const promotion = { count: jest.fn() };
  const prisma = { product, orderItem, cartItem, promotion };

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    promotion.count.mockResolvedValue(0);
    service = new ProductsService();
  });

  it('returns 404 when updating a missing product', async () => {
    product.findUnique.mockResolvedValue(null);

    await expect(service.update(99, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(product.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when deleting a missing product', async () => {
    product.findUnique.mockResolvedValue(null);

    await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(orderItem.count).not.toHaveBeenCalled();
    expect(cartItem.count).not.toHaveBeenCalled();
  });

  it('returns 409 when the product is referenced by an order', async () => {
    product.findUnique.mockResolvedValue({ id: 1 });
    orderItem.count.mockResolvedValue(1);
    cartItem.count.mockResolvedValue(0);

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(product.delete).not.toHaveBeenCalled();
  });

  it('returns 409 when the product is still in a cart', async () => {
    product.findUnique.mockResolvedValue({ id: 1 });
    orderItem.count.mockResolvedValue(0);
    cartItem.count.mockResolvedValue(1);

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(product.delete).not.toHaveBeenCalled();
  });

  it('returns 409 when the product is used by a promotion', async () => {
    product.findUnique.mockResolvedValue({ id: 1 });
    orderItem.count.mockResolvedValue(0);
    cartItem.count.mockResolvedValue(0);
    promotion.count.mockResolvedValue(1);

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(product.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced product', async () => {
    const existing = { id: 1, name: 'Gayo' };
    product.findUnique.mockResolvedValue(existing);
    orderItem.count.mockResolvedValue(0);
    cartItem.count.mockResolvedValue(0);
    product.delete.mockResolvedValue(existing);

    await expect(service.remove(1)).resolves.toEqual(existing);
    expect(product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('maps a foreign key race to 409', async () => {
    product.findUnique.mockResolvedValue({ id: 1 });
    orderItem.count.mockResolvedValue(0);
    cartItem.count.mockResolvedValue(0);
    product.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
  });
});
