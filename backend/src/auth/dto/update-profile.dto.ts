import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class updateProfileDto {
  @IsOptional()
  @IsString({ message: 'Nama harus berupa string' })
  @MinLength(1, { message: 'Nama tidak boleh kosong' })
  @Matches(/\S/, { message: 'Nama tidak boleh kosong' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Nomor telepon harus berupa string' })
  @Matches(/^\d{10,14}$/, {
    message: 'Nomor telepon harus terdiri dari 10 sampai 14 digit angka',
  })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Alamat harus berupa string' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Kota harus berupa string' })
  @MinLength(1, { message: 'Kota tidak boleh kosong' })
  @Matches(/\S/, { message: 'Kota tidak boleh kosong' })
  @MaxLength(100, { message: 'Kota maksimal 100 karakter' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Kode kota harus berupa string' })
  @Matches(/^\d{2}\.\d{2}$/, { message: 'Kode kota tidak valid' })
  cityCode?: string;

  @IsOptional()
  @IsString({ message: 'Foto profil harus berupa string' })
  @MaxLength(120_000, { message: 'Foto profil terlalu besar' })
  avatarBase64?: string;
}
