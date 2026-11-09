// Persistent Prisma client for NusaRoast.
//
// The project uses Prisma 7, which talks to the database through a driver
// adapter. For MySQL/MariaDB that adapter is `@prisma/adapter-mariadb`.
//
// This module returns a real PrismaClient backed by the MySQL/MariaDB database
// referenced by DATABASE_URL. It wraps the client with a thin compatibility
// layer so the existing service layer keeps working unchanged:
//
//   * `Product.flavorNotes` is stored as a JSON string but exposed as a
//     `string[]`, matching what the API returned before.
//   * Prisma `Decimal` values (price, totalAmount, shippingCost) are returned
//     as plain numbers so the API contract stays numeric.
//   * `mode: 'insensitive'` is stripped from product search filters because the
//     MySQL connector does not support it (MySQL string comparison is already
//     case-insensitive under the default collation).
//
// Only this file knows about persistence; the service layer still speaks the
// Prisma query API.

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const MODELS = [
  'user',
  'product',
  'productVariant',
  'cart',
  'cartItem',
  'order',
  'orderItem',
  'orderStatusLog',
  'passwordResetToken',
  'promotion',
] as const;

type ModelName = (typeof MODELS)[number];

interface MariaDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

function buildAdapterConfig(): MariaDbConfig {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in backend/.env to connect to MySQL/MariaDB.',
    );
  }

  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!database) {
    throw new Error('DATABASE_URL does not contain a database name.');
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
  };
}

// --- Contract-preserving value transforms -----------------------------------

function decodeFlavorNotes(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) {
    return value;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

function isDecimal(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function' &&
    typeof (value as { toFixed?: unknown }).toFixed === 'function'
  );
}

function toPlain(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (
    value instanceof Date ||
    value instanceof Uint8Array ||
    Buffer.isBuffer(value)
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toPlain);
  }

  if (isDecimal(value)) {
    return value.toNumber();
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    result[key] =
      key === 'flavorNotes'
        ? decodeFlavorNotes(source[key])
        : toPlain(source[key]);
  }
  return result;
}

function encodeProductData(data: unknown): unknown {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  const source = data as Record<string, unknown>;
  if (!Array.isArray(source.flavorNotes)) {
    return data;
  }

  return { ...source, flavorNotes: JSON.stringify(source.flavorNotes) };
}

function sanitizeProductWhere(where: unknown): unknown {
  if (where === null || typeof where !== 'object') {
    return where;
  }

  const source = where as Record<string, unknown>;
  const name = source.name;
  if (name === null || typeof name !== 'object') {
    return where;
  }

  const rest = { ...(name as Record<string, unknown>) };
  delete rest.mode;
  return { ...source, name: rest };
}

function transformArgs(
  model: ModelName,
  method: string,
  args: unknown,
): unknown {
  if (model !== 'product' || args === null || typeof args !== 'object') {
    return args;
  }

  const next = { ...(args as Record<string, unknown>) };
  if (next.where) {
    next.where = sanitizeProductWhere(next.where);
  }
  if (next.data && method !== 'delete' && method !== 'deleteMany') {
    next.data = encodeProductData(next.data);
  }
  return next;
}

// --- Client factory ---------------------------------------------------------

export function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    adapter: new PrismaMariaDb(buildAdapterConfig()),
  });

  const modelCache = new Map<string, unknown>();

  return new Proxy(base, {
    get(target, property, receiver) {
      if (
        typeof property === 'string' &&
        (MODELS as readonly string[]).includes(property)
      ) {
        const cached = modelCache.get(property);
        if (cached) {
          return cached;
        }

        const modelName = property as ModelName;
        const model = Reflect.get(target, property, receiver) as Record<
          string,
          unknown
        >;

        const wrapped = new Proxy(model, {
          get(modelTarget, method) {
            const fn = modelTarget[method as keyof typeof modelTarget];
            if (typeof fn !== 'function') {
              return fn;
            }

            const callable = fn as (...callArgs: unknown[]) => unknown;
            return (args?: unknown) => {
              const result: unknown = Reflect.apply(callable, modelTarget, [
                transformArgs(modelName, String(method), args),
              ]);
              return Promise.resolve(result).then(toPlain);
            };
          },
        });

        modelCache.set(property, wrapped);
        return wrapped;
      }

      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value === 'function') {
        const callable = value as (...args: unknown[]) => unknown;
        return (...args: unknown[]): unknown => {
          const result: unknown = Reflect.apply(callable, target, args);
          return result;
        };
      }
      return value;
    },
  });
}

let instance: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!instance) {
    instance = createPrismaClient();
  }
  return instance;
};

const prisma = getPrismaClient();
export default prisma;
