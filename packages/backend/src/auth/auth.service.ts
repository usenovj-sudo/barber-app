import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, UserRole } from '../common/types';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const cafe = await this.prisma.cafe.findUnique({ where: { id: dto.cafeId } });
    if (!cafe) throw new NotFoundException('Cafe not found');

    const existing = await this.prisma.user.findUnique({
      where: { email_cafeId: { email: dto.email, cafeId: dto.cafeId } },
    });
    if (existing) throw new ConflictException('User with this email already exists in this cafe');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as string as never,
        cafeId: dto.cafeId,
      },
      select: { id: true, name: true, email: true, role: true, cafeId: true },
    });

    return user;
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email_cafeId: { email: dto.email, cafeId: dto.cafeId } },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      cafeId: user.cafeId,
      role: user.role as unknown as UserRole,
      email: user.email,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Refresh token in httpOnly cookie — never exposed to JS
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cafeId: user.cafeId,
      },
    };
  }

  async refresh(payload: JwtPayload) {
    // Re-validate user still exists and is active
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const newPayload: JwtPayload = {
      sub: user.id,
      cafeId: user.cafeId,
      role: user.role as unknown as UserRole,
      email: user.email,
    };

    return { accessToken: this.generateAccessToken(newPayload) };
  }

  logout(res: Response) {
    res.clearCookie('refresh_token');
    return { message: 'Logged out' };
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: REFRESH_TOKEN_TTL,
    });
  }
}
