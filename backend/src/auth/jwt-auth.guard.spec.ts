import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getPrismaClient } from '../prisma';
import { JwtAuthGuard } from './jwt-auth.guard';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

interface TestRequest {
  headers: { authorization?: string };
  user?: unknown;
}

function contextFor(authorization?: string) {
  const request: TestRequest = { headers: {} };
  if (authorization) request.headers.authorization = authorization;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: { verify: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    jwt = { verify: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    (getPrismaClient as jest.Mock).mockReturnValue(prisma);
    guard = new JwtAuthGuard(jwt as never);
  });

  it('rejects a request without a Bearer token', async () => {
    const { context } = contextFor();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token autentikasi tidak ditemukan'),
    );

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired token', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const { context } = contextFor('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Token autentikasi tidak valid atau kedaluwarsa',
      ),
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token without a numeric user id', async () => {
    jwt.verify.mockReturnValue({ role: 'BUYER' });
    const { context } = contextFor('Bearer malformed-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Token autentikasi tidak valid atau kedaluwarsa',
      ),
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows an active buyer and attaches the token payload to the request', async () => {
    const payload = { userId: 7, role: 'BUYER' };
    jwt.verify.mockReturnValue(payload);
    prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    const { context, request } = contextFor('Bearer buyer-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { status: true },
    });
    expect(request.user).toEqual(payload);
  });

  it('rejects a banned buyer token', async () => {
    jwt.verify.mockReturnValue({ userId: 7, role: 'BUYER' });
    prisma.user.findUnique.mockResolvedValue({ status: 'BANNED' });
    const { context, request } = contextFor('Bearer old-buyer-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Akun tidak aktif atau tidak ditemukan'),
    );

    expect(request.user).toBeUndefined();
  });

  it('rejects a token for a user that no longer exists', async () => {
    jwt.verify.mockReturnValue({ userId: 99, role: 'BUYER' });
    prisma.user.findUnique.mockResolvedValue(null);
    const { context } = contextFor('Bearer deleted-user-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Akun tidak aktif atau tidak ditemukan'),
    );
  });

  it('allows an active admin without changing the token role', async () => {
    const payload = { userId: 1, role: 'ADMIN' };
    jwt.verify.mockReturnValue(payload);
    prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    const { context, request } = contextFor('Bearer admin-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual(payload);
  });
});
