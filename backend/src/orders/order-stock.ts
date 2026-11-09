import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type StockItem = {
  variantId: number;
  productName: string;
  variantWeight: string;
  quantity: number;
};

function aggregateItems(items: StockItem[]) {
  const totals = new Map<
    number,
    {
      variantId: number;
      productName: string;
      variantWeight: string;
      quantity: number;
    }
  >();

  for (const item of items) {
    const current = totals.get(item.variantId);

    if (current) {
      current.quantity += item.quantity;
      continue;
    }

    totals.set(item.variantId, { ...item });
  }

  return [...totals.values()].sort((a, b) => a.variantId - b.variantId);
}

export async function decrementStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: number,
) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      variantId: true,
      productName: true,
      variantWeight: true,
      quantity: true,
    },
  });

  for (const item of aggregateItems(items)) {
    const updated = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        stock: { gte: item.quantity },
        product: { isActive: true },
      },
      data: { stock: { decrement: item.quantity } },
    });

    if (updated.count !== 1) {
      throw new BadRequestException(
        `Stok ${item.productName} ${item.variantWeight} tidak mencukupi untuk menyelesaikan pembayaran`,
      );
    }
  }
}

export async function restoreStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: number,
) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      variantId: true,
      productName: true,
      variantWeight: true,
      quantity: true,
    },
  });

  for (const item of aggregateItems(items)) {
    await tx.productVariant.updateMany({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}
