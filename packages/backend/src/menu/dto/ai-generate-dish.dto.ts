import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiGenerateDishDto {
  @ApiProperty({ example: 'Плов узбекский', description: 'Name of the dish to generate a recipe for' })
  @IsString()
  @MinLength(2)
  dishName: string;
}
