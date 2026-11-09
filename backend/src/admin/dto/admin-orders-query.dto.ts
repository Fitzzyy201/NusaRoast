import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class AdminOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Status pesanan tidak valid' })
  status?: OrderStatus;
}
