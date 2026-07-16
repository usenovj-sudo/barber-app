import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { OrdersModule } from '../orders/orders.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [OrdersModule, MenuModule],
  controllers: [PublicController],
})
export class PublicModule {}
