import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class productVariantDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID varian tidak valid' })
  @Min(1, { message: 'ID varian tidak valid' })
  id?: number;

  @IsString({ message: 'Berat harus berupa string' })
  @IsNotEmpty({ message: 'Berat tidak boleh kosong' })
  @Matches(/\S/, { message: 'Berat tidak boleh kosong' })
  @MaxLength(20, { message: 'Berat maksimal 20 karakter' })
  @Matches(/^(?!0+(?:[.,]0+)?\s?(?:g|kg)$)\d+(?:[.,]\d+)?\s?(?:g|kg)$/i, {
    message: 'Berat harus menggunakan format seperti 100g, 250g, atau 1kg',
  })
  weight!: string;

  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Harga harus berupa angka dengan maksimal 2 desimal' },
  )
  @IsPositive({ message: 'Harga harus lebih dari 0' })
  @Max(99999999.99, { message: 'Harga melebihi batas database' })
  price!: number;

  @IsInt({ message: 'Stok harus berupa bilangan bulat' })
  @Min(0, { message: 'Stok minimal 0' })
  @Max(2147483647, { message: 'Stok melebihi batas database' })
  stock!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Urutan varian harus berupa bilangan bulat' })
  @Min(0, { message: 'Urutan varian minimal 0' })
  sortOrder?: number;
}
