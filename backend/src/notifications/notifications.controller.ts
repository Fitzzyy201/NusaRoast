import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { BuyerGuard } from '../auth/buyer.guard';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(BuyerGuard)
  @Get()
  async getNotifications(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.getNotifications(req.user!.userId);
  }

  @UseGuards(BuyerGuard)
  @Post(':id/read')
  async markAsRead(@Param('id') id: number, @Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAsRead(Number(id), req.user!.userId);
  }

  @UseGuards(BuyerGuard)
  @Post('read-all')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user!.userId);
  }
}
