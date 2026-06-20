import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmDeliveryDto,
  CreateSupplierDto,
  CreateSupplierProductDto,
  LinkIngredientDto,
  SupplierQuoteDto,
  SupplierReviewDto,
  UpdateSupplierDto,
  UpdateSupplierProductDto,
} from './dto/supplier.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Cafe supplier list ───────────────────────────────────────────────────

  async findAllForCafe(cafeId: string) {
    return this.prisma.cafeSupplier.findMany({
      where: { cafeId },
      include: {
        supplier: {
          include: {
            products: { where: { isAvailable: true } },
            reviews: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { addedAt: 'desc' }],
    });
  }

  async findOneForCafe(cafeId: string, supplierId: string) {
    const link = await this.prisma.cafeSupplier.findUnique({
      where: { cafeId_supplierId: { cafeId, supplierId } },
      include: {
        supplier: {
          include: {
            products: true,
            reviews: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    if (!link) throw new NotFoundException('Supplier not linked to this cafe');
    return link;
  }

  // ─── Create supplier & link to cafe ──────────────────────────────────────

  async createAndLink(cafeId: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({
      data: { name: dto.name, contactInfo: dto.contactInfo, region: dto.region },
    });
    await this.prisma.cafeSupplier.create({ data: { cafeId, supplierId: supplier.id } });
    return supplier;
  }

  async linkExisting(cafeId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const existing = await this.prisma.cafeSupplier.findUnique({
      where: { cafeId_supplierId: { cafeId, supplierId } },
    });
    if (existing) throw new ConflictException('Supplier already linked');

    return this.prisma.cafeSupplier.create({ data: { cafeId, supplierId } });
  }

  async unlinkFromCafe(cafeId: string, supplierId: string) {
    await this.prisma.cafeSupplier.delete({
      where: { cafeId_supplierId: { cafeId, supplierId } },
    });
    return { message: 'Supplier unlinked' };
  }

  async updateSupplier(supplierId: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id: supplierId },
      data: dto,
    });
  }

  async setFavorite(cafeId: string, supplierId: string, isFavorite: boolean) {
    return this.prisma.cafeSupplier.update({
      where: { cafeId_supplierId: { cafeId, supplierId } },
      data: { isFavorite },
    });
  }

  // ─── Global supplier search ───────────────────────────────────────────────

  async searchGlobal(query: string) {
    return this.prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { region: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { _count: { select: { cafeSuppliers: true } } },
      orderBy: { rating: 'desc' },
    });
  }

  // ─── Supplier products ────────────────────────────────────────────────────

  async addProduct(supplierId: string, dto: CreateSupplierProductDto) {
    return this.prisma.supplierProduct.create({
      data: {
        supplierId,
        name: dto.name,
        unit: dto.unit,
        price: new Prisma.Decimal(dto.price),
        minOrderQty: new Prisma.Decimal(dto.minOrderQty ?? 0),
        category: dto.category,
        description: dto.description,
      },
    });
  }

  async updateProduct(productId: string, dto: UpdateSupplierProductDto) {
    return this.prisma.supplierProduct.update({
      where: { id: productId },
      data: {
        ...(dto.price != null ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.minOrderQty != null ? { minOrderQty: new Prisma.Decimal(dto.minOrderQty) } : {}),
        ...(dto.isAvailable != null ? { isAvailable: dto.isAvailable } : {}),
        ...(dto.description != null ? { description: dto.description } : {}),
      },
    });
  }

  async getProducts(supplierId: string) {
    return this.prisma.supplierProduct.findMany({
      where: { supplierId },
      orderBy: { category: 'asc' },
    });
  }

  // ─── Ingredient link ──────────────────────────────────────────────────────

  async linkIngredient(cafeId: string, dto: LinkIngredientDto) {
    const product = await this.prisma.supplierProduct.findUnique({
      where: { id: dto.supplierProductId },
    });
    if (!product) throw new NotFoundException('Supplier product not found');

    return this.prisma.supplierIngredientLink.upsert({
      where: {
        cafeId_ingredientId_supplierProductId: {
          cafeId,
          ingredientId: dto.ingredientId,
          supplierProductId: dto.supplierProductId,
        },
      },
      create: {
        cafeId,
        ingredientId: dto.ingredientId,
        supplierId: dto.supplierId,
        supplierProductId: dto.supplierProductId,
        isVerified: true,
      },
      update: { isVerified: true },
    });
  }

  // ─── Purchase request supplier flow ───────────────────────────────────────

  async submitQuote(cafeId: string, requestId: string, dto: SupplierQuoteDto) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId, status: 'SENT' },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('Purchase request not found or not in SENT state');

    let total = new Prisma.Decimal(0);

    await this.prisma.$transaction(async (tx) => {
      for (const quote of dto.items) {
        const item = req.items.find((i) => i.id === quote.itemId);
        if (!item) continue;

        const qty = quote.quantity != null ? new Prisma.Decimal(quote.quantity) : item.quantity;
        const price = new Prisma.Decimal(quote.unitPrice);
        total = total.add(qty.mul(price));

        await tx.purchaseRequestItem.update({
          where: { id: quote.itemId },
          data: {
            unitPrice: price,
            quantity: qty,
            confirmed: true,
          },
        });
      }

      await tx.purchaseRequest.update({
        where: { id: requestId },
        data: { status: 'QUOTED', totalAmount: total, adminEdits: { note: dto.note } as Prisma.InputJsonValue },
      });
    });

    return this.prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { ingredient: { select: { name: true, unit: true } } } } },
    });
  }

  async confirmRequest(cafeId: string, requestId: string) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId, status: { in: ['QUOTED', 'SENT'] } },
    });
    if (!req) throw new NotFoundException('Purchase request not found or not in QUOTED/SENT state');

    return this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'CONFIRMED' },
    });
  }

  async confirmDelivery(cafeId: string, requestId: string, dto: ConfirmDeliveryDto) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId, status: 'CONFIRMED' },
      include: {
        items: {
          include: { ingredient: true, supplier: true },
        },
      },
    });
    if (!req) throw new NotFoundException('Purchase request not found or not confirmed');

    const actualMap = new Map(
      (dto.actualItems ?? []).map((a) => [a.itemId, a.quantity]),
    );

    await this.prisma.$transaction(async (tx) => {
      // Build invoice
      let invoiceTotal = new Prisma.Decimal(0);
      const supplierId = req.items[0]?.supplierId;
      if (!supplierId) throw new BadRequestException('No supplier on request items');

      const invoice = await tx.invoice.create({
        data: {
          type: 'INBOUND',
          cafeId,
          supplierId,
          total: new Prisma.Decimal(0),
        },
      });

      for (const item of req.items) {
        const qty = new Prisma.Decimal(actualMap.get(item.id) ?? item.quantity.toNumber());
        const price = item.unitPrice ?? new Prisma.Decimal(0);
        const lineTotal = qty.mul(price);
        invoiceTotal = invoiceTotal.add(lineTotal);

        // Invoice line
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            ingredientId: item.ingredientId,
            quantity: qty,
            unitPrice: price,
          },
        });

        // Update ingredient stock
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { stockQty: { increment: qty } },
        });
      }

      // Update invoice total
      await tx.invoice.update({ where: { id: invoice.id }, data: { total: invoiceTotal } });

      // Mark request DELIVERED
      await tx.purchaseRequest.update({
        where: { id: requestId },
        data: { status: 'DELIVERED' },
      });
    });

    return this.prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { ingredient: { select: { name: true, unit: true, stockQty: true } } } } },
    });
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  async addReview(cafeId: string, requestId: string, userId: string, dto: SupplierReviewDto) {
    const req = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, cafeId, status: 'DELIVERED' },
      include: { items: { select: { supplierId: true } } },
    });
    if (!req) throw new NotFoundException('Purchase request not found or not yet delivered');

    const supplierId = req.items[0]?.supplierId;
    if (!supplierId) throw new BadRequestException('No supplier on this request');

    const review = await this.prisma.supplierReview.create({
      data: {
        cafeId,
        supplierId,
        purchaseRequestId: requestId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // Recalculate supplier average rating
    const agg = await this.prisma.supplierReview.aggregate({
      _avg: { rating: true },
      _count: true,
      where: { supplierId },
    });

    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: {
        rating: new Prisma.Decimal(agg._avg.rating ?? dto.rating),
        reviewCount: agg._count,
      },
    });

    // Update AgentSupplierPreference based on rating
    // Good review (4-5) → +preference, bad (1-2) → -preference
    const prefDelta = dto.rating >= 4 ? 5 : dto.rating <= 2 ? -8 : 0;
    if (prefDelta !== 0) {
      for (const item of req.items) {
        if (!item.supplierId) continue;
        const existing = await this.prisma.agentSupplierPreference.findFirst({
          where: { cafeId, supplierId: item.supplierId },
        });
        if (existing) {
          const newScore = Math.min(100, Math.max(0, existing.preferenceScore.toNumber() + prefDelta));
          await this.prisma.agentSupplierPreference.update({
            where: { id: existing.id },
            data: { preferenceScore: new Prisma.Decimal(newScore) },
          });
        }
      }
    }

    return review;
  }

  async getReviews(supplierId: string) {
    return this.prisma.supplierReview.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
