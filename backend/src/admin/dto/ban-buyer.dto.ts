import { IsBoolean, IsInt, IsPositive } from 'class-validator';

export class banBuyerDto {
  @IsInt({ message: 'ID pembeli tidak valid' })
  @IsPositive({ message: 'ID pembeli tidak valid' })
  userId!: number;

  @IsBoolean({ message: 'Status blokir tidak valid' })
  banned!: boolean;
}
