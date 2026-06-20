import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { Prisma } from '@prisma/client';

// Referral bonus points
const REFERRER_BONUS = 500;
const REFERRED_BONUS = 200;

function generateReferralCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁ0-9]/gi, '')
    .slice(0, 4);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cafeId: string, dto: CreateClientDto) {
    // Resolve referrer
    let referredById: string | undefined;
    let referrerId: string | undefined;

    if (dto.referredByCode) {
      const referrer = await this.prisma.client.findFirst({
        where: { referralCode: dto.referredByCode, cafeId },
      });
      if (referrer) {
        referredById = referrer.id;
        referrerId = referrer.id;
      }
    }

    const referralCode = generateReferralCode(dto.name);

    const client = await this.prisma.client.create({
      data: {
        cafeId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
        preferences: dto.preferences,
        referralCode,
        referredById,
      },
    });

    // Create loyalty account
    const account = await this.prisma.loyaltyAccount.create({
      data: { clientId: client.id },
    });

    // Award referral bonuses
    if (referrerId) {
      // Bonus for referred (new) client
      await this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          cafeId,
          type: 'REFERRAL',
          points: REFERRED_BONUS,
        },
      });
      await this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: REFERRED_BONUS } },
      });

      // Bonus for referrer
      const referrerAccount = await this.prisma.loyaltyAccount.findFirst({
        where: { clientId: referrerId },
      });
      if (referrerAccount) {
        await this.prisma.loyaltyTransaction.create({
          data: {
            loyaltyAccountId: referrerAccount.id,
            cafeId,
            type: 'REFERRAL',
            points: REFERRER_BONUS,
          },
        });
        await this.prisma.loyaltyAccount.update({
          where: { id: referrerAccount.id },
          data: { points: { increment: REFERRER_BONUS } },
        });
      }
    }

    return this.findOne(cafeId, client.id);
  }

  async findAll(cafeId: string, search?: string) {
    return this.prisma.client.findMany({
      where: {
        cafeId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        loyaltyAccount: { select: { points: true, tier: true, totalSpent: true } },
        _count: { select: { orders: true, reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(cafeId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, cafeId },
      include: {
        loyaltyAccount: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        orders: {
          where: { status: 'PAID' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, totalAmount: true, createdAt: true, status: true },
        },
        reservations: {
          orderBy: { date: 'desc' },
          take: 5,
          select: { id: true, date: true, guestsCount: true, status: true },
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(cafeId: string, clientId: string, dto: UpdateClientDto) {
    await this.findOne(cafeId, clientId);
    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
        preferences: dto.preferences,
      },
    });
  }

  async getOrderHistory(cafeId: string, clientId: string) {
    await this.findOne(cafeId, clientId);
    return this.prisma.order.findMany({
      where: { clientId, cafeId },
      include: {
        items: { include: { dish: { select: { name: true } } } },
        payment: { select: { method: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
