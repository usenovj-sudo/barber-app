import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ example: 50000, description: 'Opening cash balance in tenge' })
  @IsNumber()
  @Min(0)
  openingBalance: number;
}

export class CloseShiftDto {
  @ApiProperty({ example: 87500, description: 'Actual cash counted at close' })
  @IsNumber()
  @Min(0)
  actualAmount: number;

  @ApiPropertyOptional({ example: 'Всё сошлось' })
  @IsString()
  @IsOptional()
  notes?: string;
}
