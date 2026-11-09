import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class checkPaymentTimerDto {
  @Type(() => Number)
  @IsInt({ message: 'Order tidak valid' })
  @Min(1, { message: 'Order tidak valid' })
  orderId!: number;
}
