import { Injectable, ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupplierJwtPayload } from './supplier-jwt.strategy';

@Injectable()
export class SupplierJwtGuard extends AuthGuard('supplier-jwt') {}

// Injects the authenticated supplier user into a handler param
export const CurrentSupplier = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupplierJwtPayload => {
    return ctx.switchToHttp().getRequest().user as SupplierJwtPayload;
  },
);
