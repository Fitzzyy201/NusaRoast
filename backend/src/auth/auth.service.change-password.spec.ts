import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compareSync, hashSync } from 'bcryptjs';
import { getPrismaClient } from '../prisma';
import { AuthService } from './auth.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

type UserRow = { id: number; password: string; role?: string };

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('AuthService changePassword', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    service = new AuthService();
  });

  it('updates the password with a bcrypt hash', async () => {
    const existing: UserRow = { id: 7, password: hashSync('old-secret', 10) };
    prisma.user.findUnique.mockResolvedValue(existing);

    let savedId = 0;
    let savedHash = '';
    prisma.user.update.mockImplementation(
      (args: { where: { id: number }; data: { password: string } }) => {
        savedId = args.where.id;
        savedHash = args.data.password;
        return Promise.resolve({ id: args.where.id });
      },
    );

    const result = await service.changePassword(7, {
      currentPassword: 'old-secret',
      newPassword: 'new-secret-123',
    });

    expect(result).toEqual({ message: 'Password berhasil diganti' });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(savedId).toBe(7);
    expect(savedHash).not.toBe('new-secret-123');
    expect(compareSync('new-secret-123', savedHash)).toBe(true);
  });

  it('rejects a wrong current password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      password: hashSync('old-secret', 10),
    });

    await expect(
      service.changePassword(7, {
        currentPassword: 'wrong-password',
        newPassword: 'new-secret-123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password as the new one', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      password: hashSync('old-secret', 10),
    });

    await expect(
      service.changePassword(7, {
        currentPassword: 'old-secret',
        newPassword: 'old-secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects seller accounts from changing their password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      password: hashSync('old-secret', 10),
      role: 'SELLER',
    });

    await expect(
      service.changePassword(1, {
        currentPassword: 'old-secret',
        newPassword: 'new-secret-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws when the account no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.changePassword(99, {
        currentPassword: 'old-secret',
        newPassword: 'new-secret-123',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
