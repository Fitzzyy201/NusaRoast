import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { getPrismaClient } from '../prisma';
import { createAuthDto } from './dto/create-auth.dto';
import { loginAuthDto } from './dto/login-auth.dto';
import { forgotPasswordDto } from './dto/forgot-password.dto';
import { resetPasswordDto } from './dto/reset-password.dto';
import { updateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { getCityByCode } from '../shipping/shipping';
import { hash, compare } from 'bcryptjs';
import { sign, type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const GENERIC_RESET_MESSAGE =
  'If an account with this email exists, a reset link has been sent.';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private prisma = getPrismaClient();
  private readonly JWT_SECRET =
    process.env.JWT_SECRET || 'SECRET_KEY_RAHASIA_KITA';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  constructor() {}

  async register(dto: createAuthDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const city = getCityByCode(dto.cityCode);

    if (!city) {
      throw new BadRequestException('Kode kota tidak valid');
    }

    const hashedPassword = await hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone.trim(),
          address: dto.address?.trim(),
          city: city.name,
          cityCode: city.code,
          password: hashedPassword,
          role: 'BUYER',
          status: 'ACTIVE',
        },
      });

      const result = { ...user };
      delete (result as { password?: string }).password;
      return {
        ...result,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarBase64: user.avatarBase64,
        },
        token: this.generateToken(user.id, user.role),
      };
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      const message = (error as { message?: string }).message;
      if (code === 'P2002' || message?.includes('Unique constraint')) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(dto: loginAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status === 'BANNED') {
      throw new UnauthorizedException('Invalid credentials or account banned');
    }

    const isPasswordValid = await compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarBase64: user.avatarBase64,
      },
      token: this.generateToken(user.id, user.role),
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        cityCode: true,
        avatarBase64: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    return user;
  }

  async updateProfile(userId: number, dto: updateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    const data: {
      name?: string;
      phone?: string;
      address?: string;
      city?: string;
      cityCode?: string;
      avatarBase64?: string | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.address !== undefined) data.address = dto.address.trim();
    if (dto.cityCode !== undefined) {
      const city = getCityByCode(dto.cityCode);

      if (!city) {
        throw new BadRequestException('Kode kota tidak valid');
      }

      data.cityCode = city.code;
      data.city = city.name;
    } else if (dto.city !== undefined) {
      data.city = dto.city.trim();
    }
    if (dto.avatarBase64 !== undefined) {
      data.avatarBase64 = dto.avatarBase64.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return this.getProfile(userId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        cityCode: true,
        avatarBase64: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    if (user.role === 'SELLER') {
      throw new UnauthorizedException(
        'Penjual tidak diizinkan mengubah password',
      );
    }

    const isCurrentValid = await compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Password lama salah');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Password baru harus berbeda dari password lama',
      );
    }

    const hashedPassword = await hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password berhasil diganti' };
  }

  async forgotPassword(dto: forgotPasswordDto) {
    const smtp = this.getSmtpConfig();

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim() },
    });

    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
    });

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const frontendUrl = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL)
      .split(',')[0]
      .trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: smtp.from,
      to: user.email,
      subject: 'Reset Password NusaRoast',
      text: `Klik link berikut untuk mereset password: ${resetUrl}`,
      html: `<p>Klik link berikut untuk mereset password:</p>
             <a href="${resetUrl}">
               <strong>Reset Password</strong>
             </a>
             <p>Link ini akan kedaluwarsa setelah 1 jam.</p>
             <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
             <br>
             <p>Salam,<br>
             Tim NusaRoast</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Reset password email sent to:', user.email);
    } catch (error) {
      console.error(
        'Failed to send reset password email:',
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException(
        'Reset email could not be sent. Please try again later.',
      );
    }

    return { message: GENERIC_RESET_MESSAGE };
  }

  async resetPassword(dto: resetPasswordDto) {
    const tokenHash = hashResetToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      await tx.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    return { message: 'Password has been reset successfully' };
  }

  private getSmtpConfig(): SmtpConfig {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT?.trim() || DEFAULT_SMTP_PORT);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const fromAddress = process.env.SMTP_FROM?.trim() || user;

    if (
      !host ||
      !user ||
      !pass ||
      !fromAddress ||
      !Number.isInteger(port) ||
      port <= 0 ||
      port > 65535
    ) {
      throw new ServiceUnavailableException(
        'Email service is not configured. Please contact the administrator.',
      );
    }

    return {
      host,
      port,
      secure: port === 465,
      user,
      pass,
      from: fromAddress.includes('<')
        ? fromAddress
        : `"NusaRoast" <${fromAddress}>`,
    };
  }

  private generateToken(userId: number, role: string) {
    return sign({ userId, role }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
  }
}
