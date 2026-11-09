import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Password lama wajib diisi' })
  @MinLength(1, { message: 'Password lama wajib diisi' })
  @MaxLength(72, { message: 'Password lama maksimal 72 karakter' })
  currentPassword!: string;

  @IsString({ message: 'Password baru wajib diisi' })
  @MinLength(6, { message: 'Password baru minimal 6 karakter' })
  @MaxLength(72, { message: 'Password baru maksimal 72 karakter' })
  newPassword!: string;
}
