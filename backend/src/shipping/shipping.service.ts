import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPrismaClient } from '../prisma';
import { getShippingQuoteForCity } from './shipping';

@Injectable()
export class ShippingService {
  private prisma = getPrismaClient();

  async getQuoteForUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cityCode: true },
    });

    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    if (!user.cityCode) {
      throw new BadRequestException(
        'Lengkapi kota/kabupaten di profil sebelum checkout.',
      );
    }

    return getShippingQuoteForCity(user.cityCode);
  }
}
