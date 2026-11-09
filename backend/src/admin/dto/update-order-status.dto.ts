import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const SELLER_ORDER_STATUSES = [
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];

export class UpdateAdminOrderStatusDto {
  @IsIn(SELLER_ORDER_STATUSES, {
    message: 'Status pesanan tidak dapat diubah oleh penjual',
  })
  status!: SellerOrderStatus;

  @IsOptional()
  @IsString({ message: 'Alasan penolakan harus berupa teks' })
  @MaxLength(255, { message: 'Alasan penolakan maksimal 255 karakter' })
  reason?: string;
}
