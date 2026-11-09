import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { createOrderDto } from './dto/create-order.dto';
import { buyNowDto } from './dto/buy-now.dto';
import { updateOrderStatusDto } from './dto/update-order-status.dto';
import { BuyerGuard } from '../auth/buyer.guard';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @UseGuards(BuyerGuard)
  @Get()
  @UsePipes(ValidationPipe)
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.ordersService.findAll(req.user!.userId);
  }

  @UseGuards(BuyerGuard)
  @Get(':id')
  @UsePipes(ValidationPipe)
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.findOne(Number(id), req.user!.userId);
  }

  @UseGuards(BuyerGuard)
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Req() req: AuthenticatedRequest, @Body() dto: createOrderDto) {
    return this.ordersService.create(
      req.user!.userId,
      dto.shippingMethod,
      dto.cartItemIds,
    );
  }

  @UseGuards(BuyerGuard)
  @Post('buy-now')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createBuyNow(@Req() req: AuthenticatedRequest, @Body() dto: buyNowDto) {
    return this.ordersService.createBuyNow(
      req.user!.userId,
      dto.variantId,
      dto.quantity,
      dto.shippingMethod,
    );
  }

  @UseGuards(BuyerGuard)
  @Post(':id/status')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: updateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      Number(id),
      req.user!.userId,
      dto.status,
    );
  }

  @UseGuards(BuyerGuard)
  @Post(':id/cancel')
  @UsePipes(ValidationPipe)
  async cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.cancel(Number(id), req.user!.userId);
  }
}
