import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SupplierPortalService } from './supplier-portal.service';
import { SupplierPortalController } from './supplier-portal.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), TelegramModule],
  providers: [SupplierPortalService, SupplierJwtStrategy],
  controllers: [SupplierPortalController],
})
export class SupplierPortalModule {}
