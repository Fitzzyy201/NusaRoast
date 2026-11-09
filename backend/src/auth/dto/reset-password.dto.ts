import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class resetPasswordDto {
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token tidak boleh kosong' })
  @MaxLength(256, { message: 'Token tidak valid' })
  token!: string;

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @MaxLength(72, { message: 'Password maksimal 72 karakter' })
  newPassword!: string;
}
