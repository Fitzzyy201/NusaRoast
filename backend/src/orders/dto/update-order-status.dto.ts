import { IsIn } from 'class-validator';

export class updateOrderStatusDto {
  @IsIn(['COMPLETED'], { message: 'Status pesanan tidak valid' })
  status!: 'COMPLETED';
}
