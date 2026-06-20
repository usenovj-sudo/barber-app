import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Айгерим Бекова' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+77012345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'aigul@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '1995-03-15' })
  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @ApiPropertyOptional({ example: 'Любит острое, аллергия на орехи' })
  @IsString()
  @IsOptional()
  preferences?: string;

  @ApiPropertyOptional({ description: 'Referral code of the person who invited this client' })
  @IsString()
  @IsOptional()
  referredByCode?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() birthdate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() preferences?: string;
}
