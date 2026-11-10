import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ADMIN_ORDER_STATUSES = [
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export class UpdateAdminOrderStatusDto {
  @IsIn(ADMIN_ORDER_STATUSES, {
    message: 'Status pesanan tidak dapat diubah oleh admin',
  })
  status!: AdminOrderStatus;

  @IsOptional()
  @IsString({ message: 'Alasan penolakan harus berupa teks' })
  @MaxLength(255, { message: 'Alasan penolakan maksimal 255 karakter' })
  reason?: string;
}
