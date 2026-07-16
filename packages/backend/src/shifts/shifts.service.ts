import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto, CloseShiftDto } from './dto/shift.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async openShift(cafeId: string, cashierId: string, dto: OpenShiftDto) {
    const existing = await this.prisma.shift.findFirst({
      where: { cafeId, closedAt: null },
    });
    if (existing) {
      throw new BadRequestException('A shift is already open. Close it first.');
    }

    return this.prisma.shift.create({
      data: {
        cafeId,
        cashierId,
        openingBalance: new Prisma.Decimal(dto.openingBalance),
      },
      include: { cashier: { select: { id: true, name: true } } },
    });
  }

  async closeShift(cafeId: string, shiftId: string, dto: CloseShiftDto) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, cafeId, closedAt: null },
    });
    if (!shift) throw new NotFoundException('Active shift not found');

    // Sum cash sales during shift
    const cashSales = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        method: { in: ['CASH', 'MIXED'] },
        order: { cafeId, status: 'PAID' },
        createdAt: { gte: shift.openedAt },
      },
    });

    const cashRevenue = cashSales._sum.amount ?? new Prisma.Decimal(0);
    const expectedAmount = shift.openingBalance.add(cashRevenue);
    const actual = new Prisma.Decimal(dto.actualAmount);
    const discrepancy = actual.sub(expectedAmount);

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        closedAt: new Date(),
        actualAmount: actual,
        expectedAmount,
        closingBalance: actual,
        discrepancy,
        notes: dto.notes,
      },
      include: { cashier: { select: { id: true, name: true } } },
    });
  }

  async getActiveShift(cafeId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { cafeId, closedAt: null },
      include: { cashier: { select: { id: true, name: true } } },
    });
    if (!shift) throw new NotFoundException('No active shift');
    return shift;
  }

  async findAll(cafeId: string) {
    return this.prisma.shift.findMany({
      where: { cafeId },
      include: { cashier: { select: { id: true, name: true } } },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findOne(cafeId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, cafeId },
      include: { cashier: { select: { id: true, name: true } } },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    // Revenue summary for this shift
    const summary = await this.prisma.payment.aggregate({
      _sum: { amount: true, discountAmount: true },
      _count: true,
      where: {
        order: { cafeId, status: 'PAID' },
        createdAt: {
          gte: shift.openedAt,
          ...(shift.closedAt ? { lte: shift.closedAt } : {}),
        },
      },
    });

    const revenue = await this.prisma.order.aggregate({
      _sum: { totalAmount: true, costPrice: true },
      _count: true,
      where: {
        cafeId,
        status: 'PAID',
        updatedAt: {
          gte: shift.openedAt,
          ...(shift.closedAt ? { lte: shift.closedAt } : {}),
        },
      },
    });

    const totalRevenue = revenue._sum.totalAmount ?? new Prisma.Decimal(0);
    const totalCost = revenue._sum.costPrice ?? new Prisma.Decimal(0);

    return {
      ...shift,
      summary: {
        orderCount: revenue._count,
        totalRevenue,
        totalCost,
        totalMargin: totalRevenue.sub(totalCost),
        totalDiscount: summary._sum.discountAmount ?? new Prisma.Decimal(0),
        paymentCount: summary._count,
      },
    };
  }
}
