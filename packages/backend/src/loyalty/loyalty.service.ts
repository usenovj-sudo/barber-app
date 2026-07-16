import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePrizeDto,
  ManualPointsDto,
  RedeemPrizeDto,
  UpdatePrizeDto,
} from './dto/loyalty.dto';
import { Prisma } from '@prisma/client';

const TIER_SILVER_THRESHOLD = 50_000;
const TIER_GOLD_THRESHOLD = 200_000;

function calcTier(totalSpent: number): 'BRONZE' | 'SILVER' | 'GOLD' {
  if (totalSpent >= TIER_GOLD_THRESHOLD) return 'GOLD';
  if (totalSpent >= TIER_SILVER_THRESHOLD) return 'SILVER';
  return 'BRONZE';
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Account ──────────────────────────────────────────────────────────────

  async getAccount(cafeId: string, clientId: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { client: { id: clientId, cafeId } },
      include: {
        client: { select: { name: true, phone: true, email: true, referralCode: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!account) throw new NotFoundException('Loyalty account not found');

    const spentNum = account.totalSpent.toNumber();
    const tierProgress = {
      current: account.tier,
      totalSpent: spentNum,
      nextTier:
        account.tier === 'BRONZE'
          ? 'SILVER'
          : account.tier === 'SILVER'
          ? 'GOLD'
          : null,
      amountToNextTier:
        account.tier === 'BRONZE'
          ? TIER_SILVER_THRESHOLD - spentNum
          : account.tier === 'SILVER'
          ? TIER_GOLD_THRESHOLD - spentNum
          : null,
    };

    return { ...account, tierProgress };
  }

  async getTransactions(cafeId: string, clientId: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { client: { id: clientId, cafeId } },
    });
    if (!account) throw new NotFoundException('Loyalty account not found');

    return this.prisma.loyaltyTransaction.findMany({
      where: { loyaltyAccountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Manual points (admin bonus / correction) ─────────────────────────────

  async addManualPoints(cafeId: string, clientId: string, dto: ManualPointsDto, userId: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { client: { id: clientId, cafeId } },
    });
    if (!account) throw new NotFoundException('Loyalty account not found');

    if (dto.points < 0 && account.points + dto.points < 0) {
      throw new BadRequestException(
        `Cannot deduct ${Math.abs(dto.points)} pts — client only has ${account.points}`,
      );
    }

    const type = dto.points > 0 ? 'BONUS' : 'SPEND';

    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          cafeId,
          type,
          points: dto.points,
        },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: dto.points } },
      }),
    ]);

    return this.getAccount(cafeId, clientId);
  }

  // ─── Prizes ───────────────────────────────────────────────────────────────

  async createPrize(cafeId: string, dto: CreatePrizeDto) {
    return this.prisma.prize.create({
      data: { cafeId, name: dto.name, pointsCost: dto.pointsCost, description: dto.description },
    });
  }

  async updatePrize(cafeId: string, prizeId: string, dto: UpdatePrizeDto) {
    const prize = await this.prisma.prize.findFirst({ where: { id: prizeId, cafeId } });
    if (!prize) throw new NotFoundException('Prize not found');
    return this.prisma.prize.update({ where: { id: prizeId }, data: dto });
  }

  async listPrizes(cafeId: string, onlyActive = true) {
    return this.prisma.prize.findMany({
      where: { cafeId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: { pointsCost: 'asc' },
    });
  }

  async redeemPrize(cafeId: string, dto: RedeemPrizeDto) {
    const [prize, account] = await Promise.all([
      this.prisma.prize.findFirst({ where: { id: dto.prizeId, cafeId, isActive: true } }),
      this.prisma.loyaltyAccount.findFirst({
        where: { client: { id: dto.clientId, cafeId } },
      }),
    ]);

    if (!prize) throw new NotFoundException('Prize not found or inactive');
    if (!account) throw new NotFoundException('Client loyalty account not found');
    if (account.points < prize.pointsCost) {
      throw new BadRequestException(
        `Not enough points: need ${prize.pointsCost}, has ${account.points}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          cafeId,
          type: 'SPEND',
          points: -prize.pointsCost,
        },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { decrement: prize.pointsCost } },
      }),
    ]);

    return {
      prize,
      remainingPoints: account.points - prize.pointsCost,
      message: `Приз "${prize.name}" успешно использован`,
    };
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  async getLeaderboard(cafeId: string, limit = 10) {
    return this.prisma.loyaltyAccount.findMany({
      where: { client: { cafeId } },
      include: { client: { select: { name: true, phone: true } } },
      orderBy: { totalSpent: 'desc' },
      take: limit,
    });
  }

  // ─── Expiry (run periodically or manually) ────────────────────────────────

  async expirePoints(cafeId: string, olderThanDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    // Find EARN transactions older than cutoff that haven't been expired
    const old = await this.prisma.loyaltyTransaction.findMany({
      where: {
        cafeId,
        type: 'EARN',
        createdAt: { lt: cutoff },
        expiresAt: null,
      },
    });

    let totalExpired = 0;
    for (const tx of old) {
      // Mark as expiring
      await this.prisma.loyaltyTransaction.update({
        where: { id: tx.id },
        data: { expiresAt: new Date() },
      });

      const account = await this.prisma.loyaltyAccount.findUnique({
        where: { id: tx.loyaltyAccountId },
      });
      if (!account || account.points <= 0) continue;

      const toExpire = Math.min(tx.points, account.points);
      if (toExpire <= 0) continue;

      await this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: tx.loyaltyAccountId,
          cafeId,
          type: 'EXPIRY',
          points: -toExpire,
          expiresAt: new Date(),
        },
      });
      await this.prisma.loyaltyAccount.update({
        where: { id: tx.loyaltyAccountId },
        data: { points: { decrement: toExpire } },
      });
      totalExpired += toExpire;
    }

    return { processedTransactions: old.length, totalPointsExpired: totalExpired };
  }
}
