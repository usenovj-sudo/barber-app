import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteItemDto, SupplierLoginDto, SupplierProductDto } from './dto/supplier-portal.dto';

// Purchase-request statuses a supplier can act on
const ACTIONABLE = ['SENT', 'QUOTED', 'CONFIRMED'];

@Injectable()
export class SupplierPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: SupplierLoginDto) {
    const user = await this.prisma.supplierUser.findUnique({
      where: { email: dto.email },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Неверный логин или пароль');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный логин или пароль');

    const accessToken = this.jwt.sign(
      { sub: user.id, supplierId: user.supplierId, email: user.email, type: 'supplier' },
      { secret: process.env.JWT_SECRET, expiresIn: '12h' },
    );

    return {
      accessToken,
      supplier: { id: user.supplier.id, name: user.supplier.name, userName: user.name },
    };
  }

  // ─── Profile & reputation ──────────────────────────────────────────────────

  async getProfile(supplierId: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { _count: { select: { products: true, reviews: true, cafeSuppliers: true } } },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return {
      id: s.id,
      name: s.name,
      contactInfo: s.contactInfo,
      region: s.region,
      rating: Number(s.rating),
      reviewCount: s.reviewCount,
      productCount: s._count.products,
      cafeCount: s._count.cafeSuppliers,
    };
  }

  async getReviews(supplierId: string) {
    return this.prisma.supplierReview.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── Own catalogue & prices ────────────────────────────────────────────────

  async listProducts(supplierId: string) {
    const products = await this.prisma.supplierProduct.findMany({
      where: { supplierId },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      ...p,
      price: Number(p.price),
      minOrderQty: Number(p.minOrderQty),
      stockQty: p.stockQty != null ? Number(p.stockQty) : null,
    }));
  }

  async addProduct(supplierId: string, dto: SupplierProductDto) {
    return this.prisma.supplierProduct.create({
      data: {
        supplierId,
        name: dto.name,
        unit: dto.unit,
        price: new Prisma.Decimal(dto.price),
        minOrderQty: new Prisma.Decimal(dto.minOrderQty ?? 0),
        category: dto.category,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async updateProduct(supplierId: string, productId: string, dto: SupplierProductDto) {
    const existing = await this.prisma.supplierProduct.findFirst({
      where: { id: productId, supplierId },
    });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.supplierProduct.update({
      where: { id: productId },
      data: {
        name: dto.name,
        unit: dto.unit,
        price: new Prisma.Decimal(dto.price),
        minOrderQty: new Prisma.Decimal(dto.minOrderQty ?? 0),
        category: dto.category,
        isAvailable: dto.isAvailable ?? existing.isAvailable,
      },
    });
  }

  // ─── Incoming purchase requests (from cafes) ───────────────────────────────

  async listRequests(supplierId: string) {
    const requests = await this.prisma.purchaseRequest.findMany({
      where: {
        status: { in: ACTIONABLE as never },
        items: { some: { supplierId } },
      },
      include: {
        cafe: { select: { id: true, name: true, address: true } },
        items: {
          where: { supplierId },
          include: { ingredient: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      deliveryStatus: r.deliveryStatus,
      deliveryMethod: r.deliveryMethod,
      respondBy: r.respondBy,
      shipBy: r.shipBy,
      // overdue when the relevant deadline has passed and the step isn't done
      respondOverdue:
        !!r.respondBy && ['SENT', 'QUOTED'].includes(r.status) && r.respondBy.getTime() < now,
      shipOverdue:
        !!r.shipBy && r.status === 'CONFIRMED' && r.deliveryStatus !== 'DELIVERED' && r.shipBy.getTime() < now,
      cafe: r.cafe,
      createdAt: r.createdAt,
      items: r.items.map((it) => ({
        id: it.id,
        ingredientName: it.ingredient.name,
        unit: it.ingredient.unit,
        quantity: Number(it.quantity),
        unitPrice: it.unitPrice != null ? Number(it.unitPrice) : null,
        confirmed: it.confirmed,
      })),
    }));
  }

  // Supplier quotes prices for its items → moves request to QUOTED
  async submitQuote(supplierId: string, requestId: string, quotes: QuoteItemDto[]) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, items: { some: { supplierId } } },
      include: { items: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!ACTIONABLE.includes(request.status)) {
      throw new BadRequestException(`Cannot quote a request in status ${request.status}`);
    }

    const myItemIds = new Set(request.items.filter((i) => i.supplierId === supplierId).map((i) => i.id));

    await this.prisma.$transaction(
      quotes
        .filter((q) => myItemIds.has(q.itemId))
        .map((q) =>
          this.prisma.purchaseRequestItem.update({
            where: { id: q.itemId },
            data: { unitPrice: new Prisma.Decimal(q.unitPrice), confirmed: true },
          }),
        ),
    );

    // Recompute request total and mark QUOTED
    const items = await this.prisma.purchaseRequestItem.findMany({ where: { requestId } });
    const total = items.reduce(
      (s, i) => s.add(i.unitPrice ? i.unitPrice.mul(i.quantity) : new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );

    return this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'QUOTED', totalAmount: total },
    });
  }

  // Supplier accepts the request → CONFIRMED, picks a delivery method, gets a ship deadline
  async acceptRequest(supplierId: string, requestId: string, deliveryMethod?: string) {
    const request = await this.ownedRequest(supplierId, requestId);
    if (!['SENT', 'QUOTED'].includes(request.status)) {
      throw new BadRequestException(`Cannot accept a request in status ${request.status}`);
    }
    const method = ['SELF', 'COURIER', 'TAXI'].includes(deliveryMethod ?? '')
      ? (deliveryMethod as never)
      : 'SELF';
    return this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: 'CONFIRMED',
        deliveryStatus: 'PREPARING',
        deliveryMethod: method,
        shipBy: new Date(Date.now() + 24 * 3600_000), // ship within 24h of accepting
      },
    });
  }

  // Supplier declines the whole request
  async rejectRequest(supplierId: string, requestId: string, reason: string) {
    const request = await this.ownedRequest(supplierId, requestId);
    if (!['SENT', 'QUOTED'].includes(request.status)) {
      throw new BadRequestException(`Cannot reject a request in status ${request.status}`);
    }
    return this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectionReason: reason || 'Отклонено поставщиком' },
    });
  }

  // Advance the shipping status (собрано → отправлено → в пути → доставлено)
  async updateDelivery(supplierId: string, requestId: string, deliveryStatus: string) {
    const allowed = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
    if (!allowed.includes(deliveryStatus)) {
      throw new BadRequestException('Invalid delivery status');
    }
    const request = await this.ownedRequest(supplierId, requestId);
    if (request.status !== 'CONFIRMED') {
      throw new BadRequestException('Delivery tracking is available only for confirmed requests');
    }
    const updated = await this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { deliveryStatus: deliveryStatus as never },
    });

    // On final delivery, draw down the supplier's own stock
    if (deliveryStatus === 'DELIVERED') {
      await this.autoOutboundForDelivery(supplierId, requestId);
    }
    return updated;
  }

  private async ownedRequest(supplierId: string, requestId: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, items: { some: { supplierId } } },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  // ─── Own warehouse: stock levels & movements ───────────────────────────────

  async recordMovement(
    supplierId: string,
    productId: string,
    delta: number,
    type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT',
    note?: string,
  ) {
    const product = await this.prisma.supplierProduct.findFirst({
      where: { id: productId, supplierId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const current = product.stockQty ?? new Prisma.Decimal(0);
    const newQty = current.add(delta);
    if (newQty.lessThan(0)) {
      throw new BadRequestException(
        `Недостаточно на складе: остаток ${current}, списание ${Math.abs(delta)}`,
      );
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.supplierStockMovement.create({
        data: { productId, type, quantity: new Prisma.Decimal(delta), note },
      }),
      this.prisma.supplierProduct.update({
        where: { id: productId },
        data: { stockQty: newQty },
      }),
    ]);

    return { ...updated, stockQty: Number(updated.stockQty) };
  }

  async getMovements(supplierId: string, productId?: string) {
    const movements = await this.prisma.supplierStockMovement.findMany({
      where: {
        product: { supplierId },
        ...(productId ? { productId } : {}),
      },
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return movements.map((m) => ({
      id: m.id,
      productName: m.product.name,
      unit: m.product.unit,
      type: m.type,
      quantity: Number(m.quantity),
      note: m.note,
      createdAt: m.createdAt,
    }));
  }

  // Best-effort automatic outbound when goods are marked delivered: decrement the
  // supplier's own stock for each delivered item (mapped via SupplierIngredientLink).
  private async autoOutboundForDelivery(supplierId: string, requestId: string) {
    try {
      const request = await this.prisma.purchaseRequest.findUnique({
        where: { id: requestId },
        include: { items: { where: { supplierId } } },
      });
      if (!request) return;

      for (const item of request.items) {
        const link = await this.prisma.supplierIngredientLink.findFirst({
          where: { supplierId, cafeId: request.cafeId, ingredientId: item.ingredientId },
        });
        if (!link) continue;
        const product = await this.prisma.supplierProduct.findUnique({
          where: { id: link.supplierProductId },
        });
        if (!product || product.stockQty == null) continue;

        const qty = item.quantity;
        const newQty = Prisma.Decimal.max(product.stockQty.sub(qty), new Prisma.Decimal(0));
        await this.prisma.$transaction([
          this.prisma.supplierStockMovement.create({
            data: {
              productId: product.id,
              type: 'OUTBOUND',
              quantity: qty.negated(),
              note: 'Отгрузка по заявке',
            },
          }),
          this.prisma.supplierProduct.update({
            where: { id: product.id },
            data: { stockQty: newQty },
          }),
        ]);
      }
    } catch {
      // Stock bookkeeping must never break the delivery flow
    }
  }

  // ─── Supplier analytics: revenue & history per cafe, top products ──────────

  async getAnalytics(supplierId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { supplierId },
      include: { items: { include: { ingredient: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    // Invoice has cafeId but no cafe relation — resolve names in one query
    const cafeIds = [...new Set(invoices.map((i) => i.cafeId))];
    const cafes = await this.prisma.cafe.findMany({
      where: { id: { in: cafeIds } },
      select: { id: true, name: true },
    });
    const cafeName = new Map(cafes.map((c) => [c.id, c.name]));

    let totalRevenue = new Prisma.Decimal(0);
    const byCafe = new Map<string, { name: string; revenue: Prisma.Decimal; deliveries: number }>();
    const byProduct = new Map<string, { name: string; qty: Prisma.Decimal; revenue: Prisma.Decimal }>();

    for (const inv of invoices) {
      totalRevenue = totalRevenue.add(inv.total);
      const name = cafeName.get(inv.cafeId) ?? 'Кафе';
      const c = byCafe.get(inv.cafeId) ?? { name, revenue: new Prisma.Decimal(0), deliveries: 0 };
      c.revenue = c.revenue.add(inv.total);
      c.deliveries += 1;
      byCafe.set(inv.cafeId, c);

      for (const it of inv.items) {
        const p = byProduct.get(it.ingredientId) ?? {
          name: it.ingredient.name,
          qty: new Prisma.Decimal(0),
          revenue: new Prisma.Decimal(0),
        };
        p.qty = p.qty.add(it.quantity);
        p.revenue = p.revenue.add(it.unitPrice.mul(it.quantity));
        byProduct.set(it.ingredientId, p);
      }
    }

    return {
      totalRevenue: totalRevenue.toNumber(),
      deliveryCount: invoices.length,
      cafeCount: byCafe.size,
      byCafe: [...byCafe.values()]
        .map((c) => ({ name: c.name, revenue: c.revenue.toNumber(), deliveries: c.deliveries }))
        .sort((a, b) => b.revenue - a.revenue),
      topProducts: [...byProduct.values()]
        .map((p) => ({ name: p.name, qty: p.qty.toNumber(), revenue: p.revenue.toNumber() }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      recentDeliveries: invoices.slice(0, 10).map((inv) => ({
        id: inv.id,
        cafeName: cafeName.get(inv.cafeId) ?? 'Кафе',
        total: inv.total.toNumber(),
        date: inv.createdAt,
      })),
    };
  }
}
