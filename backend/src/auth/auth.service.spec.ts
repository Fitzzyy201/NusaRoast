import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { compare } from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { getPrismaClient } from '../prisma';
import { AuthService } from './auth.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const GENERIC_MESSAGE =
  'If an account with this email exists, a reset link has been sent.';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

type ResetTokenRow = {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

const SMTP_ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'FRONTEND_URL',
] as const;

const originalEnv = Object.fromEntries(
  SMTP_ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof SMTP_ENV_KEYS)[number], string | undefined>;

function setSmtpEnv() {
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'mailer@test.com';
  process.env.SMTP_PASS = 'app-password';
  process.env.SMTP_FROM = 'no-reply@test.com';
  process.env.FRONTEND_URL = 'http://localhost:3000';
}

function buildPrismaMock() {
  const tx = {
    passwordResetToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return { prisma, tx };
}

describe('AuthService password reset', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: ReturnType<typeof buildPrismaMock>['tx'];
  let sendMail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setSmtpEnv();
    const mocks = buildPrismaMock();
    prisma = mocks.prisma;
    tx = mocks.tx;

    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    service = new AuthService();
  });

  afterAll(() => {
    for (const key of SMTP_ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('forgotPassword', () => {
    it('returns the same generic response and stores only a hash of the token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'buyer@test.com',
      });
      tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      tx.passwordResetToken.create.mockResolvedValue({});

      const before = Date.now();
      const result = await service.forgotPassword({ email: 'buyer@test.com' });

      expect(result).toEqual({ message: GENERIC_MESSAGE });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'buyer@test.com' },
      });
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'mailer@test.com',
          pass: 'app-password',
        },
      });

      expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 7, usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });

      const createCalls = tx.passwordResetToken.create.mock.calls as Array<
        [{ data: { userId: number; tokenHash: string; expiresAt: Date } }]
      >;
      const created = createCalls[0][0].data;
      expect(created.userId).toBe(7);
      expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(created.expiresAt.getTime()).toBeGreaterThan(before);
      expect(created.expiresAt.getTime()).toBeLessThanOrEqual(
        before + 60 * 60 * 1000 + 1000,
      );

      expect(sendMail).toHaveBeenCalledTimes(1);
      const mailCalls = sendMail.mock.calls as Array<
        [{ from: string; text: string; html: string }]
      >;
      const mail = mailCalls[0][0];
      expect(mail.from).toBe('"NusaRoast" <no-reply@test.com>');
      expect(mail.html).toContain(
        'http://localhost:3000/reset-password?token=',
      );
      const tokenMatch = /[?&]token=([a-f0-9]+)/.exec(mail.text);
      expect(tokenMatch).not.toBeNull();
      const rawToken = tokenMatch![1];

      expect(rawToken).not.toBe(created.tokenHash);
      expect(created.tokenHash).toBe(sha256(rawToken));
      expect(JSON.stringify(result)).not.toContain(rawToken);
      expect(Object.keys(result)).toEqual(['message']);
    });

    it('does not reveal whether the email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nobody@test.com' });

      expect(result).toEqual({ message: GENERIC_MESSAGE });
      expect(tx.passwordResetToken.create).not.toHaveBeenCalled();
      expect(tx.passwordResetToken.updateMany).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('uses implicit TLS when SMTP port is 465', async () => {
      process.env.SMTP_PORT = '465';
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'buyer@test.com',
      });
      tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      tx.passwordResetToken.create.mockResolvedValue({});

      await service.forgotPassword({ email: 'buyer@test.com' });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465, secure: true }),
      );
    });

    it('fails before looking up the account when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      await expect(
        service.forgotPassword({ email: 'buyer@test.com' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('reports a service error when email delivery fails', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'buyer@test.com',
      });
      tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      tx.passwordResetToken.create.mockResolvedValue({});
      sendMail.mockRejectedValue(new Error('SMTP connection refused'));
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        await expect(
          service.forgotPassword({ email: 'buyer@test.com' }),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
      } finally {
        consoleError.mockRestore();
      }

      expect(tx.passwordResetToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    const rawToken = 'a'.repeat(64);

    function activeToken(
      overrides: Partial<ResetTokenRow> = {},
    ): ResetTokenRow {
      return {
        id: 11,
        userId: 7,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: null,
        ...overrides,
      };
    }

    it('consumes the token, updates the owning user, and invalidates other tokens', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(activeToken());
      tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      tx.user.update.mockResolvedValue({});

      const result = await service.resetPassword({
        token: rawToken,
        newPassword: 'new-password-123',
      });

      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256(rawToken) },
      });

      expect(tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
        where: {
          id: 11,
          usedAt: null,
          expiresAt: { gt: expect.any(Date) as Date },
        },
        data: { usedAt: expect.any(Date) as Date },
      });
      expect(tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: { userId: 7, usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { password: expect.any(String) as string },
      });
      const updateCalls = tx.user.update.mock.calls as Array<
        [{ data: { password: string } }]
      >;
      const storedHash = updateCalls[0][0].data.password;
      await expect(compare('new-password-123', storedHash)).resolves.toBe(true);
    });

    it('rejects an unknown token without touching any user', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'new-password-123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a token that was already used', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(
        activeToken({ usedAt: new Date() }),
      );

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'new-password-123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(
        activeToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'new-password-123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects when the token was consumed concurrently', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(activeToken());
      tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'new-password-123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });
});
