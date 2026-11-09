import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PromotionsService } from './promotions.service';
import { createPromotionDto } from './dto/create-promotion.dto';
import { updatePromotionDto } from './dto/update-promotion.dto';

@UseGuards(AdminGuard)
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  async findAll() {
    return this.promotionsService.findAll();
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: createPromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Post(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: updatePromotionDto,
  ) {
    return this.promotionsService.update(id, dto);
  }

  @Post(':id/remove')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
