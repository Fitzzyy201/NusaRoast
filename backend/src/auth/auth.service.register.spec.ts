import { hash } from 'bcryptjs';
import { getPrismaClient } from '../prisma';
import { AuthService } from './auth.service';

jest.mock('../prisma', () => ({
  getPrismaClient: jest.fn(),
}));

const mockedGetPrismaClient = getPrismaClient as jest.Mock;

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('AuthService registration and profile', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    mockedGetPrismaClient.mockReturnValue(prisma);
    service = new AuthService();
  });

  it('persists city and city code during registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 1,
          ...data,
          avatarBase64: null,
          createdAt: new Date(),
        }),
    );

    const result = await service.register({
      name: 'Buyer Test',
      email: 'buyer@test.com',
      phone: '081234567890',
      address: 'Jl. Braga No. 1',
      city: 'Kota Bandung',
      cityCode: '32.73',
      password: 'password123',
    });

    const [createArgs] = prisma.user.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(createArgs.data).toMatchObject({
      phone: '081234567890',
      city: 'Kota Bandung',
      cityCode: '32.73',
    });
    expect(result.user).toMatchObject({
      id: 1,
      email: 'buyer@test.com',
      avatarBase64: null,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('returns the avatar on login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Buyer Test',
      email: 'buyer@test.com',
      password: await hash('password123', 10),
      role: 'BUYER',
      status: 'ACTIVE',
      avatarBase64: 'avatar-data',
    });

    const result = await service.login({
      email: 'buyer@test.com',
      password: 'password123',
    });

    expect(result.user.avatarBase64).toBe('avatar-data');
  });

  it('updates profile fields and clears an empty avatar', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    prisma.user.update.mockResolvedValue({
      id: 1,
      name: 'Buyer Test',
      email: 'buyer@test.com',
      phone: '081234567890',
      address: 'Jl. Braga No. 1',
      city: 'Kota Bandung',
      cityCode: '32.73',
      avatarBase64: null,
      role: 'BUYER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    await service.updateProfile(1, {
      phone: '081234567890',
      city: 'Kota Bandung',
      cityCode: '32.73',
      avatarBase64: '',
    });

    const [updateArgs] = prisma.user.update.mock.calls[0] as [
      { data: Record<string, unknown>; select: Record<string, unknown> },
    ];
    expect(updateArgs.data).toEqual({
      phone: '081234567890',
      city: 'Kota Bandung',
      cityCode: '32.73',
      avatarBase64: null,
    });
    expect(updateArgs.select).toMatchObject({
      city: true,
      cityCode: true,
      avatarBase64: true,
    });
  });
});
