import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { BuyerGuard } from './buyer.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AdminGuard, BuyerGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard, BuyerGuard, JwtModule],
  imports: [
    JwtModule.register({
      // ⚠️ RULE: JWT_SECRET Wajib di-set via environment variable
      // Fallback rahasia yang mudah ditebak dihapus untuk keamanan
      // Aplikasi akan gagal mulai (throw error) jika JWT_SECRET tidak dikonfigurasi
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
})
export class AuthModule {}
