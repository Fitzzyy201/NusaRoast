import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RegionsModule } from './regions/regions.module';
import { ShippingModule } from './shipping/shipping.module';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    AdminModule,
    PromotionsModule,
    RegionsModule,
    ShippingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
