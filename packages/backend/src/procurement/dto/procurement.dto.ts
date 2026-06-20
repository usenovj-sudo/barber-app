import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunProcurementDto {
  @ApiPropertyOptional({ description: 'Override: only check these ingredient IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ingredientIds?: string[];
}

export class ApprovePurchaseItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiPropertyOptional({ description: 'Override supplier' })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  quantity?: number;
}

export class ApprovePurchaseDto {
  @ApiPropertyOptional({ type: [ApprovePurchaseItemDto], description: 'Optional per-item overrides before approving' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovePurchaseItemDto)
  @IsOptional()
  overrides?: ApprovePurchaseItemDto[];
}

export class RejectPurchaseDto {
  @ApiProperty({ example: 'Слишком высокая цена, найдём сами' })
  @IsString()
  reason: string;
}

export class SetProcurementLevelDto {
  @ApiProperty({ example: 2, description: '1=alerts only, 2=draft (default), 3=auto-send' })
  @IsInt()
  @Min(1)
  level: number;
}
