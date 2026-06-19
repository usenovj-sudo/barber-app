import { IsArray, IsString, IsNumber, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @ApiProperty({ example: 'ingredient_cuid' })
  @IsString()
  ingredientId: string;

  @ApiProperty({ example: 0.3, description: 'Quantity per 1 portion (in the ingredient unit)' })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity: number;
}

export class UpsertRecipeDto {
  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}
