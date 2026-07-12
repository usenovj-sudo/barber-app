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
        cafe: { select: { id: true, name: true } },
        items: {
          where: { supplierId },
          include: { ingredient: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      status: r.status,
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
}
