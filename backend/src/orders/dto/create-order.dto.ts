import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class createOrderDto {
  @IsIn(['REGULAR', 'FAST'], { message: 'Metode pengiriman tidak valid' })
  shippingMethod!: 'REGULAR' | 'FAST';

  @IsOptional()
  totalAmount?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  cartItemIds?: number[];
}
