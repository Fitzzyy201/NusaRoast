import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class loginAuthDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password!: string;
}
