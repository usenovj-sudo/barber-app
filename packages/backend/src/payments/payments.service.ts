import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenGateway } from '../kitchen/kitchen.gateway';
import { PayOrderDto } from './dto/pay-order.dto';
import { OrderStatus, PaymentMethod } from '../common/types';
import { Prisma } from '@prisma/client';

// Tier thresholds in tenge
const TIER_SILVER = 50_000;
const TIER_GOLD = 200_000;
// Points per tenge spent (1 point per 100₸)
const POINTS_RATE = 100;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchen: KitchenGateway,
  ) {}

  async payOrder(cafeId: string, orderId: string, dto: PayOrderDto, cashierId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, cafeId },
      include: { payment: true, client: { include: { loyaltyAccount: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.payment) throw new BadRequestException('Order is already paid');

    const payableStatuses: string[] = [
      OrderStatus.SERVED,
      OrderStatus.READY,
      OrderStatus.IN_KITCHEN,
      OrderStatus.PENDING,
    ];
    if (!payableStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot pay order with status ${order.status}`);
    }

    // Resolve loyalty discount
    const pointsToUse = dto.loyaltyPointsToUse ?? 0;
    let loyaltyDiscount = new Prisma.Decimal(0);

    if (pointsToUse > 0) {
      if (!order.clientId || !order.client?.loyaltyAccount) {
        throw new BadRequestException('No loyalty account attached to this order');
      }
      const account = order.client.loyaltyAccount;
      if (account.points < pointsToUse) {
        throw new BadRequestException(
          `Insufficient loyalty points: has ${account.points}, wants ${pointsToUse}`,
        );
      }
      loyaltyDiscount = new Prisma.Decimal(pointsToUse); // 1 point = 1₸
    }

    const manualDiscount = new Prisma.Decimal(dto.discountAmount ?? 0);
    const totalDiscount = loyaltyDiscount.add(manualDiscount);
    const finalAmount = Prisma.Decimal.max(
      order.totalAmount.sub(totalDiscount),
      new Prisma.Decimal(0),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          orderId,
          method: dto.method as string as PaymentMethod,
          amount: finalAmount,
          loyaltyPointsUsed: pointsToUse,
          discountAmount: totalDiscount,
        },
      });

      // Mark order PAID
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });

      // Financial record
      const margin = order.totalAmount.sub(order.costPrice);
      await tx.financialRecord.create({
        data: {
          cafeId,
          orderId,
          type: 'SALE',
          amount: finalAmount,
          costPrice: order.costPrice,
          margin,
        },
      });

      // Free the table if no other active orders
      if (order.tableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: { notIn: ['CANCELLED', 'PAID'] },
          },
        });
        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'FREE' },
          });
        }
      }

      // Loyalty: deduct used points + award earned points
      if (order.clientId && order.client?.loyaltyAccount) {
        const account = order.client.loyaltyAccount;

        if (pointsToUse > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              loyaltyAccountId: account.id,
              cafeId,
              orderId,
              type: 'SPEND',
              points: -pointsToUse,
            },
          });
          await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: { points: { decrement: pointsToUse } },
          });
        }

        // Earn points on final amount (1 point per POINTS_RATE tenge)
        const earned = Math.floor(finalAmount.toNumber() / POINTS_RATE);
        if (earned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              loyaltyAccountId: account.id,
              cafeId,
              orderId,
              type: 'EARN',
              points: earned,
            },
          });

          const newPoints = account.points - pointsToUse + earned;
          const newTotalSpent = account.totalSpent.add(finalAmount);
          const newTier =
            newTotalSpent.gte(TIER_GOLD)
              ? 'GOLD'
              : newTotalSpent.gte(TIER_SILVER)
              ? 'SILVER'
              : 'BRONZE';

          await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
              points: newPoints,
              totalSpent: newTotalSpent,
              tier: newTier,
            },
          });
        }
      }

      return payment;
    });

    // Emit table freed
    if (order.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: order.tableId },
        select: { status: true },
      });
      if (table?.status === 'FREE') {
        this.kitchen.emitTableStatus(cafeId, { tableId: order.tableId, status: 'FREE' });
      }
    }

    await this.auditLog(cafeId, cashierId, 'Payment', result.id, 'CREATE', {
      orderId,
      method: dto.method,
      amount: finalAmount,
    } as object);

    return {
      payment: result,
      earnedPoints: order.clientId
        ? Math.floor(finalAmount.toNumber() / POINTS_RATE)
        : 0,
    };
  }

  async getPayment(cafeId: string, orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, order: { cafeId } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getDailyReport(cafeId: string, date: string) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);

    const [revenue, byMethod] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalAmount: true, costPrice: true },
        _count: true,
        where: { cafeId, status: 'PAID', updatedAt: { gte: d, lt: next } },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        _count: true,
        where: {
          order: { cafeId, status: 'PAID' },
          createdAt: { gte: d, lt: next },
        },
      }),
    ]);

    const totalRevenue = revenue._sum.totalAmount ?? new Prisma.Decimal(0);
    const totalCost = revenue._sum.costPrice ?? new Prisma.Decimal(0);

    return {
      date,
      orderCount: revenue._count,
      totalRevenue,
      totalCost,
      totalMargin: totalRevenue.sub(totalCost),
      marginPct: totalRevenue.isZero()
        ? 0
        : totalRevenue.sub(totalCost).div(totalRevenue).mul(100).toDecimalPlaces(1),
      byMethod: byMethod.map((m) => ({
        method: m.method,
        amount: m._sum.amount,
        count: m._count,
      })),
    };
  }

  private async auditLog(
    cafeId: string,
    userId: string,
    entity: string,
    entityId: string,
    action: string,
    diff: object,
  ) {
    await this.prisma.auditLog.create({
      data: { cafeId, userId, entity, entityId, action, diff: diff as object },
    });
  }
}
