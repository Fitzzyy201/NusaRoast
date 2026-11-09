import { OrderStatus } from '@prisma/client';

export class getAdminOrderDto {
  id!: number;
  userId!: number;
  totalAmount!: number;
  shippingMethod!: string;
  resiNumber?: string;
  status!: OrderStatus;
  paymentStatus!: string;
}
