import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { BuyerGuard } from '../auth/buyer.guard';
import { ShippingService } from './shipping.service';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @UseGuards(BuyerGuard)
  @Get('quote')
  async getQuote(@Req() req: AuthenticatedRequest) {
    return this.shippingService.getQuoteForUser(req.user!.userId);
  }
}
