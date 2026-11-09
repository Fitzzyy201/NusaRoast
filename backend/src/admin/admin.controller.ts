import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { banBuyerDto } from './dto/ban-buyer.dto';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { UpdateAdminOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateResiDto } from './dto/update-resi.dto';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @UseGuards(AdminGuard)
  @Get('dashboard')
  @UsePipes(ValidationPipe)
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @UseGuards(AdminGuard)
  @Get('products')
  @UsePipes(ValidationPipe)
  async getProducts() {
    return this.adminService.getProducts();
  }

  @UseGuards(AdminGuard)
  @Get('buyers')
  @UsePipes(ValidationPipe)
  async getBuyers() {
    return this.adminService.getBuyers();
  }

  @UseGuards(AdminGuard)
  @Post('buyers/ban')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async banBuyer(@Body() dto: banBuyerDto) {
    return this.adminService.banBuyer(dto);
  }

  @UseGuards(AdminGuard)
  @Get('orders')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getOrders(@Query() query: AdminOrdersQueryDto) {
    return this.adminService.getOrders({ status: query.status });
  }

  @UseGuards(AdminGuard)
  @Post('orders/:id/status')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status, dto.reason);
  }

  @UseGuards(AdminGuard)
  @Post('orders/:id/resi')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async inputResi(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResiDto,
  ) {
    return this.adminService.inputResi(id, dto.resiNumber);
  }
}
