import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SupplierLoginDto {
  @ApiProperty({ example: 'agro@postavka.kz' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'agro123' })
  @IsString()
  password: string;
}

export class SupplierProductDto {
  @ApiProperty({ example: 'Рис длиннозёрный' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 450 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class QuoteItemDto {
  @ApiProperty({ description: 'PurchaseRequestItem id' })
  @IsString()
  itemId: string;

  @ApiProperty({ example: 460, description: 'Quoted unit price' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;
}

export class StockMovementDto {
  @ApiProperty({ example: 50, description: 'Signed quantity: + приход, − расход' })
  @IsNumber()
  @Type(() => Number)
  delta: number;

  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND', 'ADJUSTMENT'] })
  @IsEnum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT'])
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';

  @ApiPropertyOptional({ example: 'Поступление от фермера' })
  @IsOptional()
  @IsString()
  note?: string;
}
