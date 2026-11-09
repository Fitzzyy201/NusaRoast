import { IsString, Matches } from 'class-validator';

export class findRegenciesQueryDto {
  @IsString({ message: 'Kode provinsi harus berupa string' })
  @Matches(/^\d{2}$/, { message: 'Kode provinsi tidak valid' })
  provinceCode!: string;
}
