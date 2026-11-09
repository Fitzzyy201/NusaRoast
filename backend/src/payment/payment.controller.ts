import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { buyNowDto } from '../orders/dto/buy-now.dto';
import { checkPaymentTimerDto } from './dto/check-payment-timer.dto';
import { BuyerGuard } from '../auth/buyer.guard';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // PROTEKSI: Menggunakan BuyerGuard yang memverifikasi JWT dan peran pembeli
  // @UseGuards menjalankan verifikasi sebelum handler dijalankan
  // Setelah guard berhasil, request.user di-set dengan payload JWT decoded
  // userId diekstrak dari request.user dan dipastikan valid sebelum proses

  @UseGuards(BuyerGuard)
  @Post('create')
  @UsePipes(ValidationPipe)
  async createPayment(
    @Req() req: AuthenticatedRequest,
    @Body()
    dto: {
      totalAmount?: number;
      shippingMethod?: 'REGULAR' | 'FAST';
      cartItemIds?: number[];
    },
  ) {
    // BuyerGuard sudah menjalankan verifikasi JWT dan menyimpannya di request.user.
    // userId TIDAK PERNAH diambil dari body request.
    const userId = req.user!.userId;
    const shippingMethod = dto.shippingMethod ?? 'REGULAR';

    // Create order - service akan validasi user, stok, dan hitung total dari database
    const orderResult = await this.paymentService.createOrder(
      userId,
      shippingMethod,
      dto.cartItemIds,
    );

    const order = orderResult.order;
    const grandTotal = orderResult.grandTotal;

    // Create Midtrans Snap token - service akan memanggil API Midtrans
    // dan mengembalikan snapToken sesungguhnya
    const snapResult = await this.paymentService.createMidtransSnapToken(
      order.id,
    );

    // Return comprehensive response dengan snapToken sesungguhnya dari Midtrans API
    // Structur response sederhana untuk menghindari type export issues
    return {
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        shippingMethod: order.shippingMethod,
        createdAt: order.createdAt,
        userId: order.userId,
      },
      // snapToken sesungguhnya dari respons API Midtrans
      snapToken: snapResult.snapToken,
      // URL redirect resmi dari Midtrans Snap (bisa dibuka langsung di browser)
      redirectUrl: snapResult.redirectUrl,
      // Grand total yang sudah dihitung dari database (subtotal + ongkir)
      grandTotal,
      // Status konfigurasi Midtrans
      midtransConfigured: true,
      // Catatan konfigurasi
      configNote: `Midtrans Sandbox configured - Client Key: ${process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ? 'set' : 'not set'}`,
    };
  }

  @UseGuards(BuyerGuard)
  @Post('buy-now')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createBuyNowPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: buyNowDto,
  ) {
    return this.paymentService.createBuyNowOrder(
      req.user!.userId,
      dto.variantId,
      dto.quantity,
      dto.shippingMethod,
    );
  }

  @UseGuards(BuyerGuard)
  @Post('retry/:orderId')
  async retryPayment(
    @Req() req: AuthenticatedRequest,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentService.retryMidtransSnapToken(
      req.user!.userId,
      orderId,
    );
  }

  @UseGuards(BuyerGuard)
  @Post('sync/:orderId')
  @HttpCode(HttpStatus.OK)
  async syncPayment(
    @Req() req: AuthenticatedRequest,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentService.syncMidtransStatus(req.user!.userId, orderId);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async midtransCallback(@Body() body: Record<string, unknown>) {
    // This endpoint is called by Midtrans server IP, not authenticated user
    // Signature verification will be done in service layer
    const result = await this.paymentService.verifyMidtransCallback(body);

    if (!result.valid) {
      if (result.code === 'INVALID_SIGNATURE') {
        throw new UnauthorizedException(result.message);
      }

      if (result.code === 'ORDER_NOT_FOUND') {
        throw new NotFoundException(result.message);
      }

      throw new BadRequestException(result.message);
    }

    return { status: 'ok', data: result };
  }

  @UseGuards(BuyerGuard)
  @Post('timer/check')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkPaymentTimer(
    @Req() req: AuthenticatedRequest,
    @Body() dto: checkPaymentTimerDto,
  ) {
    return this.paymentService.checkPaymentTimer(req.user!.userId, dto.orderId);
  }
}
