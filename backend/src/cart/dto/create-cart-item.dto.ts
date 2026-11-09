import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class createCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
