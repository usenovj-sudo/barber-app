import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Positive = add stock, negative = remove stock' })
  @IsNumber()
  @Type(() => Number)
  delta: number;

  @ApiPropertyOptional({ example: 'Инвентаризация 15.01.2025' })
  @IsOptional()
  @IsString()
  reason?: string;
}
