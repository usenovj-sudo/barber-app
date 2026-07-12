import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SupplierPortalService } from './supplier-portal.service';
import { SupplierPortalController } from './supplier-portal.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [SupplierPortalService, SupplierJwtStrategy],
  controllers: [SupplierPortalController],
})
export class SupplierPortalModule {}
