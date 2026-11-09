import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { getPrismaClient } from '../prisma';

interface JwtPayload {
  userId: number;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token autentikasi tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    let decoded: JwtPayload;

    try {
      decoded = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'Token autentikasi tidak valid atau kedaluwarsa',
      );
    }

    if (!decoded || !Number.isInteger(decoded.userId)) {
      throw new UnauthorizedException(
        'Token autentikasi tidak valid atau kedaluwarsa',
      );
    }

    const user = await getPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { status: true },
    });

    if (!user || user.status === 'BANNED') {
      throw new UnauthorizedException('Akun tidak aktif atau tidak ditemukan');
    }

    request.user = decoded;
    return true;
  }
}
