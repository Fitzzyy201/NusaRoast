import {
  Injectable,
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { getPrismaClient } from '../prisma';
import { OrdersService, ShippingMethod } from '../orders/orders.service';
import {
  decrementStockForOrder,
  restoreStockForOrder,
} from '../orders/order-stock';
import axios from 'axios';
import { createHash, timingSafeEqual } from 'crypto';

// Midtrans configuration
const IS_SANDBOX = process.env.MIDTRANS_ENV !== 'production';
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';

if (!SERVER_KEY) {
  throw new Error(
    'MIDTRANS_SERVER_KEY environment variable is required - payment service cannot start without it',
  );
}

if (!CLIENT_KEY) {
  throw new Error(
    'MIDTRANS_CLIENT_KEY environment variable is required - frontend Midtrans integration will not work',
  );
}

// Midtrans Snap API endpoint - using official Core API endpoint for transactions
// Sandbox: https://app.sandbox.midtrans.com/snap/v1/transactions
// Production: https://app.midtrans.com/snap/v1/transactions
const MIDTRANS_SNAP_ENDPOINT = IS_SANDBOX
  ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
  : 'https://app.midtrans.com/snap/v1/transactions';

const MIDTRANS_STATUS_ENDPOINT = IS_SANDBOX
  ? 'https://api.sandbox.midtrans.com/v2'
  : 'https://api.midtrans.com/v2';

const PAYMENT_WINDOW_MS = 20 * 60 * 1000;

function isPaymentExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() >= PAYMENT_WINDOW_MS;
}

function signatureMatches(expectedHex: string, received: unknown): boolean {
  if (typeof received !== 'string') {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'utf8');
  const actual = Buffer.from(received.trim().toLowerCase(), 'utf8');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function scalarToString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function amountToCents(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    const cents = Math.round(value * 100);
    return Number.isSafeInteger(cents) ? cents : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));

  return Number.isSafeInteger(cents) ? cents : null;
}

const SENSITIVE_LOG_VALUES = [SERVER_KEY, CLIENT_KEY].filter(
  (value) => value.length > 0,
);

function redactSecrets(value: string): string {
  return SENSITIVE_LOG_VALUES.reduce(
    (text, secret) => text.split(secret).join('[redacted]'),
    value,
  );
}

function sanitizeLogString(value: unknown, maxLength = 500): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const singleLine = value.replace(/[\r\n]+/g, ' ');
  const redacted = redactSecrets(singleLine);

  return redacted.length > maxLength
    ? `${redacted.slice(0, maxLength)}...[truncated]`
    : redacted;
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const messages = value
    .map((item) => sanitizeLogString(item))
    .filter((item): item is string => item !== null && item.length > 0)
    .slice(0, 10);

  return messages.length > 0 ? messages : undefined;
}

function sanitizeMidtransErrorBody(data: unknown): Record<string, unknown> {
  if (typeof data === 'string') {
    const body = sanitizeLogString(data, 1000);
    return body ? { body } : {};
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  const source = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const key of ['status_code', 'status_message']) {
    const value = sanitizeLogString(source[key]);
    if (value !== null && value.length > 0) {
      sanitized[key] = value;
    }
  }

  for (const key of ['validation_messages', 'error_messages']) {
    const messages = sanitizeStringArray(source[key]);
    if (messages) {
      sanitized[key] = messages;
    }
  }

  return sanitized;
}

function resolveCallbackStatus(
  currentStatus: OrderStatus,
  transactionStatus: string,
  fraudStatus: string,
  statusCode: string,
): OrderStatus | null {
  const isPending = currentStatus === 'PENDING';

  if (transactionStatus === 'settlement') {
    if (fraudStatus === 'deny' || fraudStatus === 'reject') {
      return isPending ? 'CANCELLED' : null;
    }

    if (fraudStatus === 'challenge') {
      return null;
    }

    if (statusCode !== '200') {
      return null;
    }

    return isPending ? 'PAID' : null;
  }

  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') {
      return statusCode === '200' && isPending ? 'PAID' : null;
    }

    if (fraudStatus === 'deny' || fraudStatus === 'reject') {
      return isPending ? 'CANCELLED' : null;
    }

    return null;
  }

  if (transactionStatus === 'pending') {
    return null;
  }

  if (
    transactionStatus === 'deny' ||
    transactionStatus === 'expire' ||
    transactionStatus === 'cancel' ||
    transactionStatus === 'failure'
  ) {
    return isPending ? 'CANCELLED' : null;
  }

  return null;
}

// Midtrans Core API response format
interface MidtransCoreResponse {
  transaction_id?: string;
  status_code?: string;
  token: string;
  redirect_url: string;
}

// Local interfaces to avoid type export issues
interface MidtransItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

interface MidtransCustomerDetail {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface MidtransTransactionDetails {
  order_id: string;
  gross_amount: number;
}

interface MidtransCreditCard {
  secure: true;
}

interface MidtransParameter {
  transaction_details: MidtransTransactionDetails;
  credit_card: MidtransCreditCard;
  item_details?: MidtransItemDetail[];
  customer_details?: MidtransCustomerDetail;
  expiry?: {
    unit: 'minutes';
    duration: number;
  };
  callbacks?: {
    finish?: string;
    unfinish?: string;
    error?: string;
  };
  notification_url?: string;
}

interface CreateOrderResponse {
  order: {
    id: number;
    userId: number;
    totalAmount: number;
    shippingCost: number;
    shippingMethod: string;
    status: string;
    createdAt: Date;
  };
  grandTotal: number;
}

interface PaymentOrderUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
}

interface PaymentOrder {
  id: number;
  userId: number;
  totalAmount: unknown;
  shippingCost: unknown;
  shippingMethod: string;
  status: string;
  createdAt: Date;
  snapToken: string | null;
  user: PaymentOrderUser | null;
}

interface PaymentOrderItem {
  productId: number;
  variantId: number;
  productName: string;
  variantWeight: string;
  price: unknown;
  quantity: number;
  variant: {
    stock: number;
    product: {
      isActive: boolean;
    };
  } | null;
}

export interface SnapTokenResponse {
  order: {
    id: number;
    userId: number;
    totalAmount: number;
    shippingCost: number;
    shippingMethod: string;
    status: string;
    createdAt: Date;
  };
  snapToken: string;
  grandTotal: number;
  redirectUrl?: string;
  transactionId?: string;
  statusCode?: string;
}

export interface PaymentStatusSyncResult {
  orderId: number;
  status: OrderStatus;
  changed: boolean;
  verified: boolean;
}

@Injectable()
export class PaymentService {
  private prisma = getPrismaClient();
  private readonly retryInFlight = new Map<
    number,
    Promise<SnapTokenResponse>
  >();

  constructor(private readonly ordersService: OrdersService) {}

  async createOrder(
    userId: number,
    shippingMethod: ShippingMethod,
    cartItemIds?: number[],
  ): Promise<CreateOrderResponse> {
    // VALIDASI DATABASE: Validasi user ada dan bukan banned
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === 'BANNED') {
      throw new BadRequestException('User is banned and cannot make purchases');
    }

    // Order, item snapshot, dan pengosongan cart dibuat dalam satu transaksi.
    // Total dihitung dari database, bukan dari body request.
    const order = await this.ordersService.create(
      userId,
      shippingMethod,
      cartItemIds,
    );

    return {
      order: {
        id: order.id,
        userId: order.userId,
        totalAmount: Number(order.totalAmount),
        shippingCost: Number(order.shippingCost),
        shippingMethod: order.shippingMethod,
        status: order.status,
        createdAt: order.createdAt,
      },
      grandTotal: Number(order.totalAmount),
    };
  }

  async createBuyNowOrder(
    userId: number,
    variantId: number,
    quantity: number,
    shippingMethod: ShippingMethod,
  ): Promise<SnapTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === 'BANNED') {
      throw new BadRequestException('User is banned and cannot make purchases');
    }

    const order = await this.ordersService.createBuyNow(
      userId,
      variantId,
      quantity,
      shippingMethod,
    );

    return this.createMidtransSnapToken(order.id);
  }

  async retryMidtransSnapToken(userId: number, orderId: number) {
    if (!Number.isInteger(orderId) || orderId < 1) {
      throw new BadRequestException('Order tidak valid');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        snapToken: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Hanya pesanan dengan status PENDING yang dapat dicoba ulang',
      );
    }

    if (isPaymentExpired(order.createdAt)) {
      await this.transitionOrderStatus(order.id, 'PENDING', 'CANCELLED');
      throw new BadRequestException(
        'Pesanan sudah kedaluwarsa. Silakan buat pesanan baru.',
      );
    }

    if (order.snapToken) {
      throw new ConflictException('Pesanan sudah memiliki token pembayaran');
    }

    const inFlight = this.retryInFlight.get(orderId);
    if (inFlight) {
      return inFlight;
    }

    const task = this.retrySnapTokenTask(userId, orderId);
    this.retryInFlight.set(orderId, task);

    try {
      return await task;
    } finally {
      if (this.retryInFlight.get(orderId) === task) {
        this.retryInFlight.delete(orderId);
      }
    }
  }

  private async retrySnapTokenTask(
    userId: number,
    orderId: number,
  ): Promise<SnapTokenResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Hanya pesanan dengan status PENDING yang dapat dicoba ulang',
      );
    }

    if (isPaymentExpired(order.createdAt)) {
      await this.transitionOrderStatus(order.id, 'PENDING', 'CANCELLED');
      throw new BadRequestException(
        'Pesanan sudah kedaluwarsa. Silakan buat pesanan baru.',
      );
    }

    if (order.snapToken) {
      throw new ConflictException('Pesanan sudah memiliki token pembayaran');
    }

    return this.requestSnapToken(order);
  }

  async createMidtransSnapToken(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return this.requestSnapToken(order);
  }

  private async requestSnapToken(
    order: PaymentOrder,
  ): Promise<SnapTokenResponse> {
    const user = order.user;

    if (!user || user.status === 'BANNED') {
      throw new BadRequestException('User is banned or order not found');
    }

    if (order.status === 'PENDING' && isPaymentExpired(order.createdAt)) {
      await this.transitionOrderStatus(order.id, 'PENDING', 'CANCELLED');
      throw new BadRequestException(
        'Pesanan sudah kedaluwarsa. Silakan buat pesanan baru.',
      );
    }

    // Ambil snapshot item pesanan. Harga dan nama berasal dari OrderItem,
    // bukan dari Product, agar histori transaksi tidak berubah saat produk diubah.
    const orderItems: PaymentOrderItem[] = await this.prisma.orderItem.findMany(
      {
        where: { orderId: order.id },
        select: {
          productId: true,
          variantId: true,
          productName: true,
          variantWeight: true,
          price: true,
          quantity: true,
          variant: {
            select: {
              stock: true,
              product: {
                select: {
                  isActive: true,
                },
              },
            },
          },
        },
      },
    );

    if (orderItems.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    let subtotal = 0;
    const validItems: MidtransItemDetail[] = [];

    for (const item of orderItems) {
      const variant = item.variant;
      const product = variant?.product;
      const price = Number(item.price);

      if (!variant || !product || !product.isActive) {
        throw new BadRequestException(
          `Product ${item.productId} is not active`,
        );
      }

      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `Product ${item.productName} ${item.variantWeight} has insufficient stock`,
        );
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new BadRequestException('Order item is inconsistent');
      }

      subtotal += price * item.quantity;

      validItems.push({
        id: String(item.variantId),
        price,
        quantity: item.quantity,
        name: `${item.productName} ${item.variantWeight}`,
      });
    }

    // Gunakan ongkir dan total yang tersimpan di order. Nilainya dihitung sekali
    // saat order dibuat, sehingga tidak berubah bila harga produk berubah.
    const grandTotal = Number(order.totalAmount);
    const shippingCost = Number(order.shippingCost);
    const expectedSubtotal = grandTotal - shippingCost;

    if (
      !Number.isFinite(grandTotal) ||
      grandTotal <= 0 ||
      !Number.isFinite(shippingCost) ||
      shippingCost < 0 ||
      subtotal !== expectedSubtotal
    ) {
      Logger.error(
        `Order ${order.id} item snapshot total ${subtotal} does not match stored subtotal ${expectedSubtotal}`,
      );
      throw new BadRequestException('Order total is inconsistent');
    }

    if (shippingCost > 0) {
      validItems.push({
        id: 'SHIPPING',
        price: shippingCost,
        quantity: 1,
        name: 'Biaya Pengiriman',
      });
    }

    const itemDetailsTotal = validItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    if (itemDetailsTotal !== grandTotal) {
      Logger.error(
        `Order ${order.id} item_details total ${itemDetailsTotal} does not match gross_amount ${grandTotal}`,
      );
      throw new BadRequestException('Order total is inconsistent');
    }

    const remainingMinutes = Math.min(
      20,
      Math.max(
        1,
        Math.ceil(
          (order.createdAt.getTime() + PAYMENT_WINDOW_MS - Date.now()) / 60000,
        ),
      ),
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl =
      process.env.PAYMENT_CALLBACK_URL || `${frontendUrl}/api/payment/callback`;

    const parameter: MidtransParameter = {
      transaction_details: {
        order_id: String(order.id),
        gross_amount: grandTotal,
      },
      credit_card: {
        secure: true,
      },
      item_details: validItems,
      customer_details: {
        first_name: user.name || 'Buyer',
        last_name: '',
        email: user.email || '',
        phone: user.phone || '',
      },
      expiry: {
        unit: 'minutes',
        duration: remainingMinutes,
      },
      callbacks: {
        finish: `${frontendUrl}/orders`,
        unfinish: `${frontendUrl}/orders`,
        error: `${frontendUrl}/orders`,
      },
      notification_url: callbackUrl,
    };

    const authHeader =
      'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');

    let midtransData: MidtransCoreResponse;

    try {
      const midtransResponse = await axios.post(
        MIDTRANS_SNAP_ENDPOINT,
        parameter,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          timeout: 15000,
        },
      );

      midtransData = midtransResponse.data as MidtransCoreResponse;
    } catch (error: unknown) {
      const response = (
        error as { response?: { status?: unknown; data?: unknown } }
      ).response;
      const status =
        typeof response?.status === 'number' ? response.status : 'no response';
      const sanitizedBody = sanitizeMidtransErrorBody(response?.data);

      Logger.error(
        `Midtrans Snap request failed for order ${order.id} (status: ${status}) ${JSON.stringify(sanitizedBody)}`,
      );
      throw new BadGatewayException(
        'Gagal membuat pembayaran Midtrans. Silakan coba lagi.',
      );
    }

    if (!midtransData?.token) {
      Logger.error(
        `Midtrans Snap response for order ${order.id} is incomplete: missing token`,
      );
      throw new BadGatewayException(
        'Gagal membuat pembayaran Midtrans. Silakan coba lagi.',
      );
    }

    const persisted = await this.prisma.order.updateMany({
      where: {
        id: order.id,
        userId: order.userId,
        status: 'PENDING',
        snapToken: null,
      },
      data: { snapToken: midtransData.token },
    });

    if (persisted.count !== 1) {
      Logger.error(
        `Snap token for order ${order.id} could not be persisted because the order changed`,
      );
      throw new ConflictException(
        'Status pesanan berubah. Muat ulang halaman pesanan.',
      );
    }

    return {
      order: {
        id: order.id,
        userId: order.userId,
        totalAmount: grandTotal,
        shippingCost,
        shippingMethod: order.shippingMethod,
        status: order.status,
        createdAt: order.createdAt,
      },
      snapToken: midtransData.token,
      grandTotal,
      redirectUrl: midtransData.redirect_url,
      transactionId: midtransData.transaction_id ?? '',
      statusCode: midtransData.status_code ?? '201',
    };
  }

  // Fungsi verifikasi callback dari Midtrans (diteruskan dari payment.controller.ts callback)
  async verifyMidtransCallback(body: Record<string, unknown>) {
    const {
      order_id,
      gross_amount,
      status_code,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    const orderIdStr = scalarToString(order_id);
    const statusCodeStr = scalarToString(status_code);
    const grossAmountStr = scalarToString(gross_amount);

    if (
      orderIdStr === null ||
      orderIdStr === '' ||
      statusCodeStr === null ||
      statusCodeStr === '' ||
      grossAmountStr === null ||
      grossAmountStr === '' ||
      typeof signature_key !== 'string' ||
      signature_key.length === 0
    ) {
      return {
        valid: false,
        code: 'MISSING_FIELDS',
        message:
          'Missing required fields: order_id, gross_amount, status_code, signature_key',
        status: 'PENDING',
      };
    }

    // Signature resmi Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
    const expectedSignature = createHash('sha512')
      .update(`${orderIdStr}${statusCodeStr}${grossAmountStr}${SERVER_KEY}`)
      .digest('hex');

    if (!signatureMatches(expectedSignature, signature_key)) {
      Logger.warn(
        `Invalid Midtrans callback signature for order ${orderIdStr}`,
      );
      return {
        valid: false,
        code: 'INVALID_SIGNATURE',
        message: 'Callback signature invalid',
        status: 'PENDING',
      };
    }

    const orderIdNumber = Number(orderIdStr);
    if (!Number.isInteger(orderIdNumber) || orderIdNumber < 1) {
      return {
        valid: false,
        code: 'INVALID_ORDER_ID',
        message: 'Invalid order_id',
        status: 'PENDING',
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderIdNumber },
    });

    if (!order) {
      return {
        valid: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found in database',
        status: 'PENDING',
      };
    }

    const notificationAmount = amountToCents(grossAmountStr);
    const storedAmount = amountToCents(Number(order.totalAmount));

    if (
      notificationAmount === null ||
      storedAmount === null ||
      notificationAmount !== storedAmount
    ) {
      Logger.warn(
        `Midtrans callback gross_amount mismatch for order ${order.id}`,
      );
      return {
        valid: false,
        code: 'AMOUNT_MISMATCH',
        message: 'gross_amount does not match the stored order total',
        status: order.status,
      };
    }

    const transactionStatusStr = (
      scalarToString(transaction_status) ?? ''
    ).toLowerCase();
    const fraudStatusStr = (scalarToString(fraud_status) ?? '').toLowerCase();
    const nextStatus = resolveCallbackStatus(
      order.status,
      transactionStatusStr,
      fraudStatusStr,
      statusCodeStr,
    );

    if (!nextStatus || nextStatus === order.status) {
      return {
        valid: true,
        message:
          'No status change - callback already processed, out-of-order, or not a successful transaction',
        status: order.status,
      };
    }

    const result = await this.transitionOrderStatus(
      order.id,
      order.status,
      nextStatus,
    );

    if (!result.changed) {
      return {
        valid: true,
        message: 'No status change - callback already processed',
        status: result.status,
      };
    }

    return {
      valid: true,
      message: 'Status updated successfully',
      status: result.status,
      note: `Transaction status: ${transactionStatusStr} -> Order status: ${result.status}, fraud_status: ${fraudStatusStr || 'none'}`,
    };
  }

  private async transitionOrderStatus(
    orderId: number,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): Promise<{ changed: boolean; status: OrderStatus }> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: currentStatus },
        data: { status: nextStatus },
      });

      if (updated.count !== 1) {
        const current = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });

        return {
          changed: false,
          status: current?.status ?? currentStatus,
        };
      }

      if (nextStatus === 'PAID') {
        await decrementStockForOrder(tx, orderId);
      } else if (nextStatus === 'CANCELLED' && currentStatus !== 'PENDING') {
        await restoreStockForOrder(tx, orderId);
      }

      await tx.orderStatusLog.create({
        data: { orderId, status: nextStatus },
      });

      return { changed: true, status: nextStatus };
    });
  }

  async syncMidtransStatus(
    userId: number,
    orderId: number,
  ): Promise<PaymentStatusSyncResult> {
    if (!Number.isInteger(orderId) || orderId < 1) {
      throw new BadRequestException('Order tidak valid');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        snapToken: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.status !== 'PENDING') {
      return {
        orderId: order.id,
        status: order.status,
        changed: false,
        verified: true,
      };
    }

    if (!order.snapToken) {
      throw new BadRequestException('Pesanan belum memiliki token pembayaran');
    }

    const authHeader = `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`;
    let responseData: Record<string, unknown>;

    try {
      const response = await axios.get<Record<string, unknown>>(
        `${MIDTRANS_STATUS_ENDPOINT}/${order.id}/status`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: authHeader,
          },
          timeout: 10000,
        },
      );
      responseData = response.data;
    } catch (error) {
      const response = (
        error as {
          response?: { status?: unknown; data?: unknown };
        }
      ).response;
      const upstreamStatus =
        typeof response?.status === 'number' ? response.status : null;

      if (upstreamStatus === 404) {
        return {
          orderId: order.id,
          status: order.status,
          changed: false,
          verified: false,
        };
      }

      const sanitized = sanitizeMidtransErrorBody(response?.data);
      Logger.error(
        `Midtrans status check failed for order ${order.id}: upstream=${upstreamStatus ?? 'unknown'} ${JSON.stringify(sanitized)}`,
      );
      throw new BadGatewayException(
        'Gagal memverifikasi status pembayaran ke Midtrans',
      );
    }

    const midtransOrderId = scalarToString(responseData.order_id);
    const midtransGrossAmount = scalarToString(responseData.gross_amount);
    const midtransAmount = amountToCents(responseData.gross_amount);
    const storedAmount = amountToCents(Number(order.totalAmount));
    const statusCode = scalarToString(responseData.status_code);
    const transactionStatus = (
      scalarToString(responseData.transaction_status) ?? ''
    ).toLowerCase();
    const fraudStatus = (
      scalarToString(responseData.fraud_status) ?? ''
    ).toLowerCase();

    if (
      midtransOrderId !== String(order.id) ||
      midtransGrossAmount === null ||
      midtransAmount === null ||
      storedAmount === null ||
      midtransAmount !== storedAmount ||
      !statusCode ||
      !transactionStatus
    ) {
      Logger.error(`Midtrans status response mismatch for order ${order.id}`);
      throw new BadGatewayException(
        'Respons status Midtrans tidak sesuai dengan pesanan',
      );
    }

    const signature = responseData.signature_key;
    if (typeof signature === 'string' && signature.length > 0) {
      const expectedSignature = createHash('sha512')
        .update(
          `${midtransOrderId}${statusCode}${midtransGrossAmount}${SERVER_KEY}`,
        )
        .digest('hex');

      if (!signatureMatches(expectedSignature, signature)) {
        Logger.error(`Invalid Midtrans status signature for order ${order.id}`);
        throw new BadGatewayException('Signature status Midtrans tidak valid');
      }
    }

    const nextStatus = resolveCallbackStatus(
      order.status,
      transactionStatus,
      fraudStatus,
      statusCode,
    );

    if (!nextStatus || nextStatus === order.status) {
      return {
        orderId: order.id,
        status: order.status,
        changed: false,
        verified: true,
      };
    }

    const result = await this.transitionOrderStatus(
      order.id,
      order.status,
      nextStatus,
    );

    return {
      orderId: order.id,
      status: result.status,
      changed: result.changed,
      verified: true,
    };
  }

  async checkPaymentTimer(userId: number, orderId: number) {
    if (!Number.isInteger(orderId) || orderId < 1) {
      throw new BadRequestException('Order tidak valid');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      return { status: 'not_found' };
    }

    return {
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    };
  }
}
