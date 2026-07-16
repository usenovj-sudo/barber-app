import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_ORDER_STATUSES = ['PENDING', 'IN_KITCHEN', 'READY', 'SERVED'];

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // Floor plan for the POS: halls with their tables, each table carrying its
  // current active (unpaid) order summary so the waiter sees occupancy at a glance.
  async listTables(cafeId: string) {
    const [halls, tables] = await Promise.all([
      this.prisma.hall.findMany({ where: { cafeId }, orderBy: { name: 'asc' } }),
      this.prisma.table.findMany({
        where: { cafeId },
        orderBy: { number: 'asc' },
        include: {
          orders: {
            where: { status: { in: ACTIVE_ORDER_STATUSES as never } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, totalAmount: true, createdAt: true },
          },
        },
      }),
    ]);

    const decorate = (t: (typeof tables)[number]) => {
      const active = t.orders[0];
      return {
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        hallId: t.hallId,
        status: t.status,
        activeOrder: active
          ? {
              id: active.id,
              status: active.status,
              totalAmount: Number(active.totalAmount),
              createdAt: active.createdAt,
            }
          : null,
      };
    };

    const grouped = halls.map((h) => ({
      id: h.id,
      name: h.name,
      tables: tables.filter((t) => t.hallId === h.id).map(decorate),
    }));

    // Tables not assigned to any hall
    const orphan = tables.filter((t) => !t.hallId).map(decorate);
    if (orphan.length) {
      grouped.push({ id: 'none', name: 'Без зала', tables: orphan });
    }

    return grouped;
  }
}
