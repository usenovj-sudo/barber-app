import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 'table_cuid' })
  @IsString()
  tableId: string;

  @ApiPropertyOptional({ description: 'Client ID if known' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ example: '2026-06-21T19:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  guestsCount: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  deposit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isBanquet?: boolean;
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'] })
  @IsEnum(['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'])
  status: 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}
