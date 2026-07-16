import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualPointsDto {
  @ApiProperty({ example: 200, description: 'Positive = add, negative = deduct' })
  @IsInt()
  points: number;

  @ApiProperty({ example: 'День рождения — бонус' })
  @IsString()
  reason: string;
}

export class CreatePrizeDto {
  @ApiProperty({ example: 'Бесплатный кофе' })
  @IsString()
  name: string;

  @ApiProperty({ example: 300, description: 'Points required to redeem' })
  @IsInt()
  @Min(1)
  pointsCost: number;

  @ApiPropertyOptional({ example: 'Любой напиток до 500₸' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePrizeDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() pointsCost?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

export class RedeemPrizeDto {
  @ApiProperty({ description: 'Prize ID to redeem' })
  @IsString()
  prizeId: string;

  @ApiProperty({ description: 'Client ID' })
  @IsString()
  clientId: string;
}
