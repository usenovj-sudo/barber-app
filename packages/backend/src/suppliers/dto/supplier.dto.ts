import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'АгроПоставка KZ' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+7 727 123-45-67' })
  @IsString()
  @IsOptional()
  contactInfo?: string;

  @ApiPropertyOptional({ example: 'Алматы' })
  @IsString()
  @IsOptional()
  region?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactInfo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() region?: string;
}

export class CreateSupplierProductDto {
  @ApiProperty({ example: 'Рис длиннозёрный' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 450 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderQty?: number;

  @ApiPropertyOptional({ example: 'Зерновые' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSupplierProductDto {
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() price?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() minOrderQty?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isAvailable?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}

export class LinkIngredientDto {
  @ApiProperty({ description: 'Cafe ingredient ID' })
  @IsString()
  ingredientId: string;

  @ApiProperty({ description: 'Supplier product ID' })
  @IsString()
  supplierProductId: string;

  @ApiProperty({ description: 'Supplier ID' })
  @IsString()
  supplierId: string;
}

// ─── Purchase request supplier flow ───────────────────────────────────────

export class QuoteItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 460 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Adjusted quantity (e.g. min order' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;
}

export class SupplierQuoteDto {
  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiPropertyOptional({ example: 'Доставка 2 рабочих дня' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ConfirmDeliveryDto {
  @ApiPropertyOptional({ description: 'Actual quantities delivered (defaults to ordered qty)' })
  @IsArray()
  @IsOptional()
  actualItems?: { itemId: string; quantity: number }[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class SupplierReviewDto {
  @ApiProperty({ example: 5, description: '1-5 stars' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Привезли вовремя, качество отличное' })
  @IsString()
  @IsOptional()
  comment?: string;
}
