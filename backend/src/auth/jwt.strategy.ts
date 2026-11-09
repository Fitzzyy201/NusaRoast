import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '../prisma';

@Injectable()
export class JwtStrategy {
  async validate(userId: number) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!user || user.status === 'BANNED') {
      return null;
    }

    return user;
  }
}
