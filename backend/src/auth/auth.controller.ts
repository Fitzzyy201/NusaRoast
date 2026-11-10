import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { createAuthDto } from './dto/create-auth.dto';
import { loginAuthDto } from './dto/login-auth.dto';
import { forgotPasswordDto } from './dto/forgot-password.dto';
import { resetPasswordDto } from './dto/reset-password.dto';
import { updateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: updateProfileDto,
  ) {
    return this.authService.updateProfile(req.user!.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    if (req.user!.role === 'ADMIN') {
      throw new UnauthorizedException(
        'Admin tidak diizinkan mengubah password',
      );
    }
    return this.authService.changePassword(req.user!.userId, dto);
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async register(@Body() dto: createAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async login(@Body() dto: loginAuthDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async forgotPassword(@Body() dto: forgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async resetPassword(@Body() dto: resetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
