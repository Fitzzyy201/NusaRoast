import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateResiDto {
  @IsString({ message: 'Nomor resi harus berupa string' })
  @IsNotEmpty({ message: 'Nomor resi tidak boleh kosong' })
  @Matches(/\S/, { message: 'Nomor resi tidak boleh kosong' })
  @MaxLength(100, { message: 'Nomor resi maksimal 100 karakter' })
  resiNumber!: string;
}
