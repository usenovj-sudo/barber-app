import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/types';

export class PayOrderDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 500, description: 'Loyalty points to spend (each = 1 tenge)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  loyaltyPointsToUse?: number;

  @ApiPropertyOptional({ example: 0, description: 'Manual discount in tenge' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;
}
