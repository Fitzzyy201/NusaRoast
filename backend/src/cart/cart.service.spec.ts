import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getPrismaClient } from '../prisma';
import { CartService } from './cart.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

function buildPrismaMock() {
  return {
    productVariant: { findUnique: jest.fn() },
    cart: { findUnique: jest.fn(), create: jest.fn() },
    cartItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe('CartService.addItem stock validation', () => {
  let service: CartService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new CartService();
  });

  it('rejects when the existing cart quantity plus the new quantity exceeds stock', async () => {
    prisma.productVariant.findUnique.mockResolvedValue({
      id: 2,
      productId: 2,
      stock: 10,
      product: { id: 2, isActive: true },
    });
    prisma.cart.findUnique.mockResolvedValue({ id: 3 });
    prisma.cartItem.findFirst.mockResolvedValue({
      id: 4,
      cartId: 3,
      productId: 2,
      variantId: 2,
      quantity: 7,
    });

    await expect(service.addItem(7, 2, 4)).rejects.toThrow(
      new BadRequestException('Stok tidak mencukupi'),
    );

    expect(prisma.cartItem.update).not.toHaveBeenCalled();
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('allows the combined quantity when it exactly matches stock', async () => {
    prisma.productVariant.findUnique.mockResolvedValue({
      id: 2,
      productId: 2,
      stock: 10,
      product: { id: 2, isActive: true },
    });
    prisma.cart.findUnique
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 3, items: [] });
    prisma.cartItem.findFirst.mockResolvedValue({
      id: 4,
      cartId: 3,
      productId: 2,
      variantId: 2,
      quantity: 7,
    });
    prisma.cartItem.update.mockResolvedValue({ id: 4, quantity: 10 });

    await service.addItem(7, 2, 3);

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { quantity: 10 },
    });
  });

  it('rejects a new quantity that exceeds stock', async () => {
    prisma.productVariant.findUnique.mockResolvedValue({
      id: 2,
      productId: 2,
      stock: 10,
      product: { id: 2, isActive: true },
    });

    await expect(service.addItem(7, 2, 11)).rejects.toThrow(
      new BadRequestException('Stok tidak mencukupi'),
    );

    expect(prisma.cart.findUnique).not.toHaveBeenCalled();
  });
});

describe('CartService.updateItem', () => {
  let service: CartService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new CartService();
  });

  it('updates the quantity when it does not exceed stock', async () => {
    prisma.cart.findUnique
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 3, items: [] });
    prisma.cartItem.findFirst.mockResolvedValue({
      id: 4,
      cartId: 3,
      quantity: 2,
      variant: { stock: 10, product: { isActive: true } },
    });
    prisma.cartItem.update.mockResolvedValue({ id: 4, quantity: 5 });

    const result = await service.updateItem(7, 4, 5);

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { quantity: 5 },
    });
    expect(result).toEqual({ id: 3, items: [] });
  });

  it('rejects a quantity above stock', async () => {
    prisma.cart.findUnique.mockResolvedValue({ id: 3 });
    prisma.cartItem.findFirst.mockResolvedValue({
      id: 4,
      cartId: 3,
      quantity: 2,
      variant: { stock: 10, product: { isActive: true } },
    });

    await expect(service.updateItem(7, 4, 11)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.cartItem.update).not.toHaveBeenCalled();
  });

  it('rejects an item that does not belong to the buyer cart', async () => {
    prisma.cart.findUnique.mockResolvedValue({ id: 3 });
    prisma.cartItem.findFirst.mockResolvedValue(null);

    await expect(service.updateItem(7, 99, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.cartItem.update).not.toHaveBeenCalled();
  });
});
