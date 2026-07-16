import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import { Prisma } from '@prisma/client';

// Buffer window: a table is blocked 1h before and 2h after reservation
const BUFFER_BEFORE_MS = 60 * 60 * 1000;
const BUFFER_AFTER_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cafeId: string, dto: CreateReservationDto) {
    const table = await this.prisma.table.findFirst({
      where: { id: dto.tableId, cafeId },
    });
    if (!table) throw new NotFoundException('Table not found');

    const date = new Date(dto.date);

    // Check for overlapping reservations in the buffer window
    const windowStart = new Date(date.getTime() - BUFFER_BEFORE_MS);
    const windowEnd = new Date(date.getTime() + BUFFER_AFTER_MS);

    const conflict = await this.prisma.reservation.findFirst({
      where: {
        tableId: dto.tableId,
        cafeId,
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
        date: { gte: windowStart, lte: windowEnd },
      },
    });

    if (conflict) {
      throw new BadRequestException(
        `Стол занят: уже есть бронь на ${conflict.date.toLocaleString('ru-RU')}`,
      );
    }

    return this.prisma.reservation.create({
      data: {
        cafeId,
        tableId: dto.tableId,
        clientId: dto.clientId,
        date,
        guestsCount: dto.guestsCount,
        deposit: new Prisma.Decimal(dto.deposit ?? 0),
        note: dto.note,
        isBanquet: dto.isBanquet ?? false,
        status: 'PENDING',
      },
      include: {
        table: { include: { hall: { select: { name: true } } } },
        client: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async findAll(cafeId: string, filters: { date?: string; status?: string; tableId?: string }) {
    const where: Prisma.ReservationWhereInput = { cafeId };

    if (filters.status) where.status = filters.status as never;
    if (filters.tableId) where.tableId = filters.tableId;
    if (filters.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        table: { include: { hall: { select: { name: true } } } },
        client: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(cafeId: string, id: string) {
    const r = await this.prisma.reservation.findFirst({
      where: { id, cafeId },
      include: {
        table: { include: { hall: { select: { name: true } } } },
        client: { select: { id: true, name: true, phone: true, loyaltyAccount: { select: { tier: true, points: true } } } },
      },
    });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  async updateStatus(cafeId: string, id: string, dto: UpdateReservationStatusDto) {
    const r = await this.findOne(cafeId, id);

    const allowed: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['SEATED', 'CANCELLED'],
      SEATED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!allowed[r.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition ${r.status} → ${dto.status}`,
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note ?? r.note,
      },
    });

    // When client is seated, set table to OCCUPIED (if not already)
    if (dto.status === 'SEATED' && r.tableId) {
      await this.prisma.table.update({
        where: { id: r.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    // When completed/cancelled, try to free table if no active orders
    if (['COMPLETED', 'CANCELLED'].includes(dto.status) && r.tableId) {
      const activeOrders = await this.prisma.order.count({
        where: {
          tableId: r.tableId,
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
      });
      if (activeOrders === 0) {
        await this.prisma.table.update({
          where: { id: r.tableId },
          data: { status: 'FREE' },
        });
      }
    }

    return updated;
  }

  async checkAvailability(cafeId: string, date: string, guestsCount: number) {
    const d = new Date(date);
    const windowStart = new Date(d.getTime() - BUFFER_BEFORE_MS);
    const windowEnd = new Date(d.getTime() + BUFFER_AFTER_MS);

    // Find tables with conflicts
    const busyTableIds = await this.prisma.reservation.findMany({
      where: {
        cafeId,
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
        date: { gte: windowStart, lte: windowEnd },
      },
      select: { tableId: true },
    });

    const busyIds = new Set(busyTableIds.map((r) => r.tableId));

    const availableTables = await this.prisma.table.findMany({
      where: {
        cafeId,
        capacity: { gte: guestsCount },
        id: { notIn: [...busyIds] },
      },
      include: { hall: { select: { name: true } } },
      orderBy: { capacity: 'asc' },
    });

    return {
      date,
      guestsCount,
      availableTables,
      hasAvailability: availableTables.length > 0,
    };
  }
}
