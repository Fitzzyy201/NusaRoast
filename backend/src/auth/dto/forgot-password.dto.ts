import { IsEmail, MaxLength } from 'class-validator';

export class forgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(191, { message: 'Email terlalu panjang' })
  email!: string;
}
