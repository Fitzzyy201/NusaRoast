import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { productVariantDto } from './product-variant.dto';

export class updateProductDto {
  @IsOptional()
  @IsString({ message: 'Nama produk harus berupa string' })
  @IsNotEmpty({ message: 'Nama produk tidak boleh kosong' })
  @Matches(/\S/, { message: 'Nama produk tidak boleh kosong' })
  @MaxLength(255, { message: 'Nama produk maksimal 255 karakter' })
  name?: string;

  @IsOptional()
  @IsIn(['ARABICA', 'ROBUSTA'], { message: 'Kategori produk tidak valid' })
  category?: 'ARABICA' | 'ROBUSTA';

  @IsOptional()
  @IsString({ message: 'Origin harus berupa string' })
  @IsNotEmpty({ message: 'Origin tidak boleh kosong' })
  @Matches(/\S/, { message: 'Origin tidak boleh kosong' })
  @MaxLength(255, { message: 'Origin maksimal 255 karakter' })
  origin?: string;

  @IsOptional()
  @IsString({ message: 'Deskripsi harus berupa string' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Flavor notes harus berupa array' })
  @IsString({ each: true, message: 'Flavor notes harus berupa string' })
  flavorNotes?: string[];

  @IsOptional()
  @IsInt({ message: 'Roast level harus berupa bilangan bulat' })
  @Min(1, { message: 'Roast level minimal 1' })
  @Max(5, { message: 'Roast level maksimal 5' })
  roastLevel?: number;

  @IsOptional()
  @IsArray({ message: 'Varian berat harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal satu varian berat' })
  @ArrayMaxSize(20, { message: 'Maksimal 20 varian berat' })
  @ValidateNested({ each: true })
  @Type(() => productVariantDto)
  variants?: productVariantDto[];

  @IsOptional()
  @IsString({ message: 'Gambar harus berupa string' })
  imageBase64?: string;

  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  isActive?: boolean;
}
