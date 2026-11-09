import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BuyerGuard } from './buyer.guard';
import { getPrismaClient } from '../prisma';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

describe('BuyerGuard', () => {
  const findUnique = jest.fn();
  const verify = jest.fn();
  const guard = new BuyerGuard({ verify } as unknown as JwtService);

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

  it('allows an active buyer', async () => {
    verify.mockReturnValue({ userId: 7, role: 'BUYER' });
    findUnique.mockResolvedValue({ role: 'BUYER', status: 'ACTIVE' });

    await expect(
      guard.canActivate(contextFor('Bearer buyer-token')),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { role: true, status: true },
    });
  });

  it('rejects a banned buyer even with a valid token', async () => {
    verify.mockReturnValue({ userId: 7, role: 'BUYER' });
    findUnique.mockResolvedValue({ role: 'BUYER', status: 'BANNED' });

    await expect(
      guard.canActivate(contextFor('Bearer buyer-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a seller', async () => {
    verify.mockReturnValue({ userId: 1, role: 'SELLER' });
    findUnique.mockResolvedValue({ role: 'SELLER', status: 'ACTIVE' });

    await expect(
      guard.canActivate(contextFor('Bearer seller-token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a missing user', async () => {
    verify.mockReturnValue({ userId: 99, role: 'BUYER' });
    findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor('Bearer buyer-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
