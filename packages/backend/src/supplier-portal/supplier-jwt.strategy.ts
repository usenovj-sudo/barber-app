import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface SupplierJwtPayload {
  sub: string; // SupplierUser id
  supplierId: string;
  email: string;
  type: 'supplier';
}

@Injectable()
export class SupplierJwtStrategy extends PassportStrategy(Strategy, 'supplier-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: SupplierJwtPayload): Promise<SupplierJwtPayload> {
    // Reject cafe-staff tokens — this guard is supplier-only
    if (payload.type !== 'supplier' || !payload.supplierId) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
