import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decrementStockForOrder, restoreStockForOrder } from './order-stock';

type OrderItemRow = {
  variantId: number;
  productName: string;
  variantWeight: string;
  quantity: number;
};

function buildTx(items: OrderItemRow[]) {
  const orderItem = {
    findMany: jest.fn().mockResolvedValue(items),
  };
  const productVariant = {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };

  return {
    tx: { orderItem, productVariant } as unknown as Prisma.TransactionClient,
    orderItem,
    productVariant,
  };
}

describe('decrementStockForOrder', () => {
  it('aggregates duplicate variants and updates them in variant id order', async () => {
    const { tx, orderItem, productVariant } = buildTx([
      {
        variantId: 5,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 1,
      },
      {
        variantId: 2,
        productName: 'Gayo Arabica',
        variantWeight: '250g',
        quantity: 2,
      },
      {
        variantId: 5,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 3,
      },
    ]);

    await decrementStockForOrder(tx, 42);

    expect(orderItem.findMany).toHaveBeenCalledWith({
      where: { orderId: 42 },
      select: {
        variantId: true,
        productName: true,
        variantWeight: true,
        quantity: true,
      },
    });
    expect(productVariant.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 2,
        stock: { gte: 2 },
        product: { isActive: true },
      },
      data: { stock: { decrement: 2 } },
    });
    expect(productVariant.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 5,
        stock: { gte: 4 },
        product: { isActive: true },
      },
      data: { stock: { decrement: 4 } },
    });
  });

  it('rejects the whole change when a variant cannot satisfy the quantity', async () => {
    const { tx, productVariant } = buildTx([
      {
        variantId: 2,
        productName: 'Gayo Arabica',
        variantWeight: '250g',
        quantity: 2,
      },
      {
        variantId: 5,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 4,
      },
    ]);
    productVariant.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(decrementStockForOrder(tx, 42)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(productVariant.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('restoreStockForOrder', () => {
  it('aggregates duplicate variants before restoring stock', async () => {
    const { tx, productVariant } = buildTx([
      {
        variantId: 5,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 1,
      },
      {
        variantId: 2,
        productName: 'Gayo Arabica',
        variantWeight: '250g',
        quantity: 2,
      },
      {
        variantId: 5,
        productName: 'Lampung Robusta',
        variantWeight: '1kg',
        quantity: 3,
      },
    ]);

    await restoreStockForOrder(tx, 42);

    expect(productVariant.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { stock: { increment: 2 } },
    });
    expect(productVariant.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 5 },
      data: { stock: { increment: 4 } },
    });
  });
});
