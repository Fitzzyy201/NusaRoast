import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class updateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
