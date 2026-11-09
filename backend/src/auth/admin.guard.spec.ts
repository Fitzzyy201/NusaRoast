import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminGuard } from './admin.guard';
import { getPrismaClient } from '../prisma';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('AdminGuard', () => {
  const findUnique = jest.fn();
  const verify = jest.fn();
  const guard = new AdminGuard({ verify } as unknown as JwtService);

  const contextFor = (authorization?: string): ExecutionContext => {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: { authorization },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPrismaClient as jest.Mock).mockReturnValue({
      user: { findUnique },
    });
  });

  it('allows an active seller', async () => {
    verify.mockReturnValue({ userId: 1, role: 'SELLER' });
    findUnique.mockResolvedValue({ role: 'SELLER', status: 'ACTIVE' });

    await expect(
      guard.canActivate(contextFor('Bearer seller-token')),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { role: true, status: true },
    });
  });

  it('rejects a banned seller even with a valid token', async () => {
    verify.mockReturnValue({ userId: 1, role: 'SELLER' });
    findUnique.mockResolvedValue({ role: 'SELLER', status: 'BANNED' });

    await expect(
      guard.canActivate(contextFor('Bearer seller-token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a buyer', async () => {
    verify.mockReturnValue({ userId: 2, role: 'BUYER' });
    findUnique.mockResolvedValue({ role: 'BUYER', status: 'ACTIVE' });

    await expect(
      guard.canActivate(contextFor('Bearer buyer-token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a missing user', async () => {
    verify.mockReturnValue({ userId: 99, role: 'SELLER' });
    findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor('Bearer seller-token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid token', async () => {
    verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(
      guard.canActivate(contextFor('Bearer invalid-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a request without a token', async () => {
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
