import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class createPromotionDto {
  @IsInt({ message: 'Produk promosi tidak valid' })
  @Min(1, { message: 'Produk promosi tidak valid' })
  productId!: number;

  @IsString({ message: 'Judul promosi harus berupa string' })
  @IsNotEmpty({ message: 'Judul promosi tidak boleh kosong' })
  @Matches(/\S/, { message: 'Judul promosi tidak boleh kosong' })
  @MinLength(3, { message: 'Judul promosi minimal 3 karakter' })
  @MaxLength(120, { message: 'Judul promosi maksimal 120 karakter' })
  title!: string;

  @IsString({ message: 'Deskripsi promosi harus berupa string' })
  @IsNotEmpty({ message: 'Deskripsi promosi tidak boleh kosong' })
  @Matches(/\S/, { message: 'Deskripsi promosi tidak boleh kosong' })
  @MinLength(10, { message: 'Deskripsi promosi minimal 10 karakter' })
  @MaxLength(400, { message: 'Deskripsi promosi maksimal 400 karakter' })
  description!: string;

  @IsOptional()
  @IsInt({ message: 'Urutan promosi harus berupa bilangan bulat' })
  @Min(0, { message: 'Urutan promosi minimal 0' })
  @Max(99, { message: 'Urutan promosi maksimal 99' })
  sortOrder?: number;
}
