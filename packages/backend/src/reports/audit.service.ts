import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    cafeId: string,
    filters: {
      entity?: string;
      action?: string;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));

    const where: Prisma.AuditLogWhereInput = { cafeId };
    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    };
  }

  // Distinct entities/actions to populate filter dropdowns in the UI
  async getFilterOptions(cafeId: string) {
    const [entities, actions] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { cafeId },
        distinct: ['entity'],
        select: { entity: true },
      }),
      this.prisma.auditLog.findMany({
        where: { cafeId },
        distinct: ['action'],
        select: { action: true },
      }),
    ]);
    return {
      entities: entities.map((e) => e.entity).sort(),
      actions: actions.map((a) => a.action).sort(),
    };
  }
}
