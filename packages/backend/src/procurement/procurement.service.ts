import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService, IngredientAnalysis, SupplierCandidate } from '../ai/ai.service';
import { KitchenGateway } from '../kitchen/kitchen.gateway';
import {
  ApprovePurchaseDto,
  RejectPurchaseDto,
  RunProcurementDto,
  SetProcurementLevelDto,
} from './dto/procurement.dto';
import { Prisma } from '@prisma/client';

const ANALYSIS_WINDOW_DAYS = 14;

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly kitchen: KitchenGateway,
  ) {}

  // ─── Run procurement analysis ─────────────────────────────────────────────

  async runAnalysis(cafeId: string, userId: string, dto: RunProcurementDto) {
    const cafe = await this.prisma.cafe.findUnique({
      where: { id: cafeId },
      include: { aiSettings: true },
    });
    if (!cafe) throw new NotFoundException('Cafe not found');

    const level = cafe.aiSettings?.procurementLevel ?? 2;
    const safetyStockPct = cafe.aiSettings?.defaultSafetyStockPct ?? new Prisma.Decimal(25);
    const defaultLeadTime = cafe.aiSettings?.defaultLeadTimeDays ?? 2;

    // 1. Gather ingredient data
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        cafeId,
        ...(dto.ingredientIds?.length ? { id: { in: dto.ingredientIds } } : {}),
      },
      include: {
        procurementSettings: true,
        supplierLinks: {
          include: {
            supplier: true,
            supplierProduct: true,
          },
        },
        agentPreferences: {
          where: { cafeId },
        },
      },
    });

    // 2. Compute avg daily usage from last ANALYSIS_WINDOW_DAYS days
    const usageMap = await this.computeAvgDailyUsage(cafeId);

    // 3. Identify which ingredients need restocking
    const toRestock: IngredientAnalysis[] = [];

    for (const ing of ingredients) {
      const settings = ing.procurementSettings;
      const avgDaily = usageMap.get(ing.id) ?? 0;
      const leadTime = settings?.leadTimeDays ?? defaultLeadTime;
      const safePct = settings?.safetyStockPct?.toNumber() ?? safetyStockPct.toNumber();
      const safetyStock = avgDaily * leadTime * (safePct / 100);
      const reorderPoint = avgDaily * leadTime + safetyStock;
      const parLevel = settings?.parLevel?.toNumber() ?? ing.minStockLevel.mul(3).toNumber();
      const current = ing.stockQty.toNumber();
      const daysUntilStockout = avgDaily > 0 ? current / avgDaily : Infinity;

      // Only include if below reorder point or no parLevel set and below minStock
      const needsRestock = settings
        ? current <= reorderPoint
        : current <= ing.minStockLevel.toNumber();

      if (!needsRestock) continue;

      const neededQty = Math.max(parLevel - current, 0);

      // Build supplier candidates
      const prefMap = new Map(ing.agentPreferences.map((p) => [p.supplierId, p.preferenceScore.toNumber()]));

      const rawCandidates = ing.supplierLinks
        .filter((l) => l.supplier.rating.toNumber() >= 0)
        .map((l) => ({
          supplierId: l.supplierId,
          supplierName: l.supplier.name,
          productName: l.supplierProduct.name,
          price: l.supplierProduct.price.toNumber(),
          rating: l.supplier.rating.toNumber(),
          preferenceScore: prefMap.get(l.supplierId) ?? 50,
          minOrderQty: l.supplierProduct.minOrderQty.toNumber(),
        }));

      const candidates: SupplierCandidate[] = this.ai.scoreSuppliers(rawCandidates);

      toRestock.push({
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        currentStock: current,
        minStockLevel: ing.minStockLevel.toNumber(),
        parLevel,
        leadTimeDays: leadTime,
        safetyStockPct: safePct,
        avgDailyUsage: Math.round(avgDaily * 1000) / 1000,
        reorderPoint: Math.round(reorderPoint * 1000) / 1000,
        daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
        neededQty: Math.round(neededQty * 1000) / 1000,
        candidates,
      });
    }

    if (!toRestock.length) {
      return { message: 'Все запасы в норме. Закупки не требуются.', procurementRunId: null };
    }

    // 4. Call AI for supplier selection & justification
    const plan = await this.ai.generateProcurementPlan(cafe.name, toRestock);

    // 5. Save ProcurementRun
    const run = await this.prisma.procurementRun.create({
      data: {
        cafeId,
        triggeredBy: userId,
        analysisData: toRestock as unknown as Prisma.InputJsonValue,
        agentOutput: plan as unknown as Prisma.InputJsonValue,
      },
    });

    // 6. Level 1 — alerts only
    if (level === 1) {
      this.kitchen.emitLowStock(cafeId, toRestock.map((i) => ({
        id: i.id,
        name: i.name,
        currentStock: i.currentStock,
        daysUntilStockout: i.daysUntilStockout,
        urgency: plan.items.find((pi) => pi.ingredientId === i.id)?.urgency ?? 'NORMAL',
      })));

      await this.saveAiReport(cafeId, userId, 'PROCUREMENT_ALERT', run.id, plan);
      return { level: 1, message: 'Уведомления отправлены. Заявки не созданы.', procurementRunId: run.id, plan };
    }

    // 7. Level 2 or 3 — create PurchaseRequest
    const status = level >= 3 ? 'SENT' : 'PENDING_APPROVAL';
    const approvedBy = level >= 3 ? userId : undefined;
    const approvedAt = level >= 3 ? new Date() : undefined;

    const request = await this.prisma.purchaseRequest.create({
      data: {
        cafeId,
        procurementRunId: run.id,
        aiGenerated: true,
        aiJustification: plan.summary,
        status,
        approvedBy,
        approvedAt,
        sentAt: level >= 3 ? new Date() : undefined,
        totalAmount: new Prisma.Decimal(plan.totalEstimatedAmount),
        items: {
          create: plan.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: new Prisma.Decimal(item.quantity),
            supplierId: item.selectedSupplierId,
            unitPrice: item.unitPrice != null ? new Prisma.Decimal(item.unitPrice) : undefined,
            aiScore: new Prisma.Decimal(item.aiScore),
            aiReasoning: item.reasoning,
            alternativeQuotes: item.alternativeQuotes as unknown as Prisma.InputJsonValue,
          })),
        },
      },
      include: { items: { include: { ingredient: true, supplier: true } } },
    });

    await this.saveAiReport(cafeId, userId, 'PROCUREMENT_PLAN', run.id, plan);

    if (level >= 3) {
      this.logger.log(`Level 3: auto-sent purchase request ${request.id}`);
    }

    return {
      level,
      procurementRunId: run.id,
      purchaseRequest: request,
      plan,
    };
  }

  // ─── Approve request (manager can override items) ─────────────────────────

  async approveRequest(cafeId: string, requestId: string, userId: string, dto: ApprovePurchaseDto) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId, status: 'PENDING_APPROVAL' },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('Purchase request not found or not pending');

    // Apply per-item overrides and update preference scores
    if (dto.overrides?.length) {
      for (const ov of dto.overrides) {
        const item = req.items.find((i) => i.id === ov.itemId);
        if (!item) continue;

        await this.prisma.purchaseRequestItem.update({
          where: { id: ov.itemId },
          data: {
            supplierId: ov.supplierId ?? item.supplierId,
            quantity: ov.quantity != null ? new Prisma.Decimal(ov.quantity) : item.quantity,
            adminOverride: true,
          },
        });

        // If manager changed supplier → boost new supplier preference, drop old
        if (ov.supplierId && ov.supplierId !== item.supplierId) {
          await this.upsertPreference(cafeId, item.ingredientId, ov.supplierId, +5);
          if (item.supplierId) {
            await this.upsertPreference(cafeId, item.ingredientId, item.supplierId, -10);
          }
        }
      }
    }

    return this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'SENT', approvedBy: userId, approvedAt: new Date(), sentAt: new Date() },
      include: { items: { include: { ingredient: true, supplier: true } } },
    });
  }

  // ─── Reject request ───────────────────────────────────────────────────────

  async rejectRequest(cafeId: string, requestId: string, userId: string, dto: RejectPurchaseDto) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId, status: { in: ['PENDING_APPROVAL', 'DRAFT'] } },
    });
    if (!req) throw new NotFoundException('Purchase request not found or not pending');

    // Penalise all AI-selected suppliers
    const items = await this.prisma.purchaseRequestItem.findMany({ where: { requestId } });
    for (const item of items) {
      if (item.supplierId && !item.adminOverride) {
        await this.upsertPreference(cafeId, item.ingredientId, item.supplierId, -5);
      }
    }

    return this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectionReason: dto.reason },
    });
  }

  // ─── Get requests ─────────────────────────────────────────────────────────

  async findAllRequests(cafeId: string, status?: string) {
    return this.prisma.purchaseRequest.findMany({
      where: { cafeId, ...(status ? { status: status as never } : {}) },
      include: {
        items: { include: { ingredient: { select: { name: true, unit: true } }, supplier: { select: { name: true } } } },
        procurementRun: { select: { id: true, triggeredAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRequest(cafeId: string, requestId: string) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId },
      include: {
        items: { include: { ingredient: true, supplier: true } },
        procurementRun: true,
      },
    });
    if (!req) throw new NotFoundException('Purchase request not found');
    return req;
  }

  // ─── AI settings ──────────────────────────────────────────────────────────

  async setProcurementLevel(cafeId: string, dto: SetProcurementLevelDto) {
    if (dto.level < 1 || dto.level > 3) {
      throw new BadRequestException('Level must be 1, 2, or 3');
    }
    return this.prisma.cafeAiSettings.upsert({
      where: { cafeId },
      create: { cafeId, procurementLevel: dto.level, isEnabled: true },
      update: { procurementLevel: dto.level, isEnabled: true },
    });
  }

  async getAiSettings(cafeId: string) {
    return this.prisma.cafeAiSettings.findUnique({ where: { cafeId } });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async computeAvgDailyUsage(cafeId: string): Promise<Map<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - ANALYSIS_WINDOW_DAYS);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          cafeId,
          status: { in: ['IN_KITCHEN', 'READY', 'SERVED', 'PAID'] },
          createdAt: { gte: since },
        },
      },
      select: { recipeId: true, quantity: true },
    });

    if (!orderItems.length) return new Map();

    // Load recipe items for all unique recipe IDs
    const recipeIds = [...new Set(orderItems.map((i) => i.recipeId))];
    const recipeItems = await this.prisma.recipeItem.findMany({
      where: { recipeId: { in: recipeIds } },
      select: { recipeId: true, ingredientId: true, quantity: true },
    });

    const riByRecipe = new Map<string, typeof recipeItems>();
    for (const ri of recipeItems) {
      const list = riByRecipe.get(ri.recipeId) ?? [];
      list.push(ri);
      riByRecipe.set(ri.recipeId, list);
    }

    const totalUsage = new Map<string, number>();
    for (const oi of orderItems) {
      const ris = riByRecipe.get(oi.recipeId) ?? [];
      for (const ri of ris) {
        const used = ri.quantity.toNumber() * oi.quantity;
        totalUsage.set(ri.ingredientId, (totalUsage.get(ri.ingredientId) ?? 0) + used);
      }
    }

    const avgUsage = new Map<string, number>();
    for (const [id, total] of totalUsage) {
      avgUsage.set(id, total / ANALYSIS_WINDOW_DAYS);
    }
    return avgUsage;
  }

  private async upsertPreference(
    cafeId: string,
    ingredientId: string,
    supplierId: string,
    delta: number,
  ) {
    const existing = await this.prisma.agentSupplierPreference.findUnique({
      where: { cafeId_ingredientId_supplierId: { cafeId, ingredientId, supplierId } },
    });

    const newScore = Math.min(100, Math.max(0, (existing?.preferenceScore.toNumber() ?? 50) + delta));

    await this.prisma.agentSupplierPreference.upsert({
      where: { cafeId_ingredientId_supplierId: { cafeId, ingredientId, supplierId } },
      create: { cafeId, ingredientId, supplierId, preferenceScore: new Prisma.Decimal(newScore), lastUsedAt: new Date() },
      update: { preferenceScore: new Prisma.Decimal(newScore), lastUsedAt: new Date() },
    });
  }

  private async saveAiReport(cafeId: string, userId: string, reportType: string, runId: string, data: object) {
    await this.prisma.aiReport.create({
      data: {
        cafeId,
        reportType,
        inputData: { procurementRunId: runId } as Prisma.InputJsonValue,
        result: data as unknown as Prisma.InputJsonValue,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }
}
