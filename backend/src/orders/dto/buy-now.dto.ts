import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class buyNowDto {
  @Type(() => Number)
  @IsInt({ message: 'Varian tidak valid' })
  @Min(1, { message: 'Varian tidak valid' })
  variantId!: number;

  @Type(() => Number)
  @IsInt({ message: 'Kuantitas harus berupa bilangan bulat' })
  @Min(1, { message: 'Kuantitas minimal 1' })
  quantity!: number;

  @IsIn(['REGULAR', 'FAST'], { message: 'Metode pengiriman tidak valid' })
  shippingMethod!: 'REGULAR' | 'FAST';
}
