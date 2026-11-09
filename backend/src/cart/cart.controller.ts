import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';
import { createCartItemDto } from './dto/create-cart-item.dto';
import { updateCartItemDto } from './dto/update-cart-item.dto';
import { BuyerGuard } from '../auth/buyer.guard';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @UseGuards(BuyerGuard)
  @Get()
  @UsePipes(ValidationPipe)
  async getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user!.userId);
  }

  @UseGuards(BuyerGuard)
  @Post('items')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async addItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: createCartItemDto,
  ) {
    return this.cartService.addItem(
      req.user!.userId,
      dto.variantId,
      dto.quantity,
    );
  }

  @UseGuards(BuyerGuard)
  @Patch('items/:itemId')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: updateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user!.userId, itemId, dto.quantity);
  }

  @UseGuards(BuyerGuard)
  @Post('items/:itemId/remove')
  @UsePipes(ValidationPipe)
  async removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(req.user!.userId, itemId);
  }

  @UseGuards(BuyerGuard)
  @Post('clear')
  @UsePipes(ValidationPipe)
  async clearCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.clearCart(req.user!.userId);
  }
}
