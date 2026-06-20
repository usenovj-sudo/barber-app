import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { RecipesModule } from './recipes/recipes.module';
import { MenuModule } from './menu/menu.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { OrdersModule } from './orders/orders.module';
import { PublicModule } from './public/public.module';
import { ShiftsModule } from './shifts/shifts.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    IngredientsModule,
    RecipesModule,
    MenuModule,
    KitchenModule,
    OrdersModule,
    PublicModule,
    ShiftsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
