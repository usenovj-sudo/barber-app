import { Controller, Post, Body, Res, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new staff user (admin only)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login and receive access token' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  refresh(@CurrentUser() user: JwtPayload) {
    return this.authService.refresh(user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
