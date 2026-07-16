import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Куриное филе' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'kg', description: 'Unit of measure: kg, g, l, pcs' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockQty?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerUnit?: number;

  @ApiPropertyOptional({ example: 2, description: 'Alert threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStockLevel?: number;
}
