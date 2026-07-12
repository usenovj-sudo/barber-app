import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateModifierDto {
  @ApiProperty({ example: 'Двойная порция' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 500, description: 'Price surcharge in tenge (can be 0)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceDelta?: number;
}
