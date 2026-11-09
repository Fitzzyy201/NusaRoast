import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class createAuthDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @Matches(/\S/, { message: 'Nama tidak boleh kosong' })
  name!: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString({ message: 'Nomor telepon harus berupa string' })
  @Matches(/^\d{10,14}$/, {
    message: 'Nomor telepon harus terdiri dari 10 sampai 14 digit angka',
  })
  phone!: string;

  @IsOptional()
  @IsString({ message: 'Alamat harus berupa string' })
  address?: string;

  @IsString({ message: 'Kota harus berupa string' })
  @IsNotEmpty({ message: 'Kota tidak boleh kosong' })
  @Matches(/\S/, { message: 'Kota tidak boleh kosong' })
  @MaxLength(100, { message: 'Kota maksimal 100 karakter' })
  city!: string;

  @IsString({ message: 'Kode kota harus berupa string' })
  @Matches(/^\d{2}\.\d{2}$/, { message: 'Kode kota tidak valid' })
  cityCode!: string;

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;
}
