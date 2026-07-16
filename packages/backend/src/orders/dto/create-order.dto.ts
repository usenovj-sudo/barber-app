import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSource } from '../../common/types';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'dish_cuid' })
  @IsString()
  dishId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Без лука' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ example: 'Гость 1' })
  @IsString()
  @IsOptional()
  guestTag?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modifiers?: string[];
}

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'table_cuid' })
  @IsString()
  @IsOptional()
  tableId?: string;

  @ApiPropertyOptional({ example: 'client_cuid' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ example: 'Поздравьте именинника' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ enum: OrderSource })
  @IsEnum(OrderSource)
  @IsOptional()
  source?: OrderSource;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
