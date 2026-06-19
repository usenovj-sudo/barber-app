import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/types';

export class RegisterDto {
  @ApiProperty({ example: 'Айдар Сейткали' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@cafe.kz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'cuid_of_cafe' })
  @IsString()
  cafeId: string;
}
