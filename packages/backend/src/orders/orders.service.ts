import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenGateway } from '../kitchen/kitchen.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemStatus, OrderSource, OrderStatus } from '../common/types';
import { Prisma } from '@prisma/client';

const ORDER_WITH_ITEMS = {
  items: {
    include: { dish: { select: { id: true, name: true, photoUrl: true } } },
    orderBy: { dish: { name: 'asc' as const } },
  },
  table: { select: { id: true, number: true, hallId: true } },
  waiter: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchen: KitchenGateway,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async createOrder(cafeId: string, dto: CreateOrderDto, waiterId?: string) {
    if (!dto.items.length) throw new BadRequestException('Order must have at least one item');

    const dishIds = dto.items.map((i) => i.dishId);
    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: dishIds }, cafeId, isAvailable: true },
      include: {
        recipes: {
          where: { isActive: true },
          include: { items: { include: { ingredient: true } } },
        },
      },
    });

    if (dishes.length !== dishIds.length) {
      throw new BadRequestException('One or more dishes not found or unavailable');
    }

    const dishMap = new Map(dishes.map((d) => [d.id, d]));

    let totalAmount = new Prisma.Decimal(0);
    let totalCost = new Prisma.Decimal(0);

    const itemsData = dto.items.map((item) => {
      const dish = dishMap.get(item.dishId)!;
      const recipe = dish.recipes[0];
      const itemPrice = dish.price.mul(item.quantity);
      let itemCost = new Prisma.Decimal(0);

      if (recipe) {
        for (const ri of recipe.items) {
          itemCost = itemCost.add(ri.ingredient.pricePerUnit.mul(ri.quantity).mul(item.quantity));
        }
      }

      totalAmount = totalAmount.add(itemPrice);
      totalCost = totalCost.add(itemCost);

      return {
        dishId: item.dishId,
        recipeId: recipe?.id ?? '',
        quantity: item.quantity,
        price: dish.price,
        costPrice: itemCost,
        comment: item.comment,
        guestTag: item.guestTag,
        modifiers: (item.modifiers ?? []) as Prisma.InputJsonValue,
      };
    });

    const source = dto.source ?? (waiterId ? OrderSource.WAITER : OrderSource.QR_TABLE);

    const order = await this.prisma.order.create({
      data: {
        cafeId,
        tableId: dto.tableId,
        clientId: dto.clientId,
        waiterId,
        note: dto.note,
        source,
        totalAmount,
        costPrice: totalCost,
        items: { create: itemsData },
      },
      include: ORDER_WITH_ITEMS,
    });

    return order;
  }

  // ─── Confirm → IN_KITCHEN (deducts ingredients) ───────────────────────────

  async confirmOrder(cafeId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, cafeId },
      include: {
        items: true,
        table: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot confirm order with status ${order.status}`);
    }

    // Gather ingredient requirements
    const requirements = new Map<string, Prisma.Decimal>();

    for (const item of order.items) {
      if (!item.recipeId) continue;
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: item.recipeId },
        include: { items: { include: { ingredient: true } } },
      });
      if (!recipe) continue;

      for (const ri of recipe.items) {
        const needed = ri.quantity.mul(item.quantity);
        const prev = requirements.get(ri.ingredientId) ?? new Prisma.Decimal(0);
        requirements.set(ri.ingredientId, prev.add(needed));
      }
    }

    // Validate & deduct inside transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Check stock
      for (const [ingredientId, needed] of requirements) {
        const ing = await tx.ingredient.findUnique({ where: { id: ingredientId } });
        if (!ing) continue;
        if (ing.stockQty.lessThan(needed)) {
          throw new BadRequestException(
            `Недостаточно "${ing.name}": нужно ${needed}, есть ${ing.stockQty} ${ing.unit}`,
          );
        }
      }

      // Deduct
      for (const [ingredientId, needed] of requirements) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { stockQty: { decrement: needed } },
        });
      }

      // Update order status
      const confirmed = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.IN_KITCHEN },
        include: ORDER_WITH_ITEMS,
      });

      // Mark table OCCUPIED
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      return confirmed;
    });

    // Audit
    await this.auditLog(cafeId, userId, 'Order', orderId, 'UPDATE', {
      status: [OrderStatus.PENDING, OrderStatus.IN_KITCHEN],
    });

    // WebSocket events
    this.kitchen.emitNewOrder(cafeId, updatedOrder);
    if (order.tableId) {
      this.kitchen.emitTableStatus(cafeId, { tableId: order.tableId, status: 'OCCUPIED' });
    }

    // Low-stock alerts
    await this.checkAndEmitLowStock(cafeId, Array.from(requirements.keys()));

    return updatedOrder;
  }

  // ─── Cook updates item status ─────────────────────────────────────────────

  async updateItemStatus(
    cafeId: string,
    orderId: string,
    itemId: string,
    status: OrderItemStatus,
    userId: string,
  ) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId, order: { cafeId } },
    });
    if (!item) throw new NotFoundException('Order item not found');

    const updated = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
    });

    this.kitchen.emitOrderItemUpdated(cafeId, { orderId, itemId, status });

    // Auto-advance order to READY when all items are DONE
    const pendingItems = await this.prisma.orderItem.count({
      where: { orderId, status: { not: OrderItemStatus.DONE } },
    });

    if (pendingItems === 0) {
      await this.markReady(cafeId, orderId, userId);
    }

    return updated;
  }

  // ─── Mark READY ───────────────────────────────────────────────────────────

  async markReady(cafeId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, cafeId, status: OrderStatus.IN_KITCHEN },
    });
    if (!order) throw new NotFoundException('Order not found or not in kitchen');

    const ready = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.READY },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog(cafeId, userId, 'Order', orderId, 'UPDATE', {
      status: [OrderStatus.IN_KITCHEN, OrderStatus.READY],
    });

    this.kitchen.emitOrderReady(cafeId, ready);
    return ready;
  }

  // ─── Mark SERVED ──────────────────────────────────────────────────────────

  async markServed(cafeId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, cafeId, status: OrderStatus.READY },
    });
    if (!order) throw new NotFoundException('Order not found or not ready');

    const served = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SERVED },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog(cafeId, userId, 'Order', orderId, 'UPDATE', {
      status: [OrderStatus.READY, OrderStatus.SERVED],
    });

    return served;
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────

  async cancelOrder(cafeId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, cafeId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const status = order.status as OrderStatus;
    const nonCancellable: OrderStatus[] = [OrderStatus.PAID, OrderStatus.CANCELLED];
    if (nonCancellable.includes(status)) {
      throw new BadRequestException(`Cannot cancel order with status ${status}`);
    }

    // Restore stock if ingredients were already deducted
    const shouldRestore = [
      OrderStatus.IN_KITCHEN,
      OrderStatus.READY,
      OrderStatus.SERVED,
    ].includes(status);

    await this.prisma.$transaction(async (tx) => {
      if (shouldRestore) {
        for (const item of order.items) {
          if (!item.recipeId) continue;
          const recipe = await tx.recipe.findUnique({
            where: { id: item.recipeId },
            include: { items: true },
          });
          if (!recipe) continue;

          for (const ri of recipe.items) {
            await tx.ingredient.update({
              where: { id: ri.ingredientId },
              data: { stockQty: { increment: ri.quantity.mul(item.quantity) } },
            });
          }
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          items: { updateMany: { where: { status: { not: OrderItemStatus.DONE } }, data: { status: OrderItemStatus.CANCELLED } } },
        },
      });

      // Free table if no other active orders
      if (order.tableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.PAID] },
          },
        });
        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'FREE' },
          });
          this.kitchen.emitTableStatus(cafeId, { tableId: order.tableId, status: 'FREE' });
        }
      }
    });

    await this.auditLog(cafeId, userId, 'Order', orderId, 'UPDATE', {
      status: [order.status, OrderStatus.CANCELLED],
    });

    this.kitchen.emitOrderCancelled(cafeId, orderId);
    return { id: orderId, status: OrderStatus.CANCELLED };
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findAll(cafeId: string, filters: { status?: string; tableId?: string; date?: string }) {
    const where: Prisma.OrderWhereInput = { cafeId };

    if (filters.status) {
      where.status = filters.status as OrderStatus;
    }
    if (filters.tableId) {
      where.tableId = filters.tableId;
    }
    if (filters.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      where.createdAt = { gte: d, lt: next };
    }

    return this.prisma.order.findMany({
      where,
      include: ORDER_WITH_ITEMS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findKitchenOrders(cafeId: string) {
    return this.prisma.order.findMany({
      where: {
        cafeId,
        status: { in: [OrderStatus.IN_KITCHEN, OrderStatus.READY] },
      },
      include: ORDER_WITH_ITEMS,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(cafeId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, cafeId },
      include: ORDER_WITH_ITEMS,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ─── QR table public ──────────────────────────────────────────────────────

  async getTableByQrCode(qrCode: string) {
    const table = await this.prisma.table.findUnique({
      where: { qrCode },
      include: {
        hall: { select: { name: true } },
        cafe: { select: { id: true, name: true } },
      },
    });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async checkAndEmitLowStock(cafeId: string, ingredientIds: string[]) {
    const lowStock = await this.prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        cafeId,
      },
      select: { id: true, name: true, stockQty: true, minStockLevel: true, unit: true },
    });

    const alerts = lowStock.filter((i) => i.stockQty.lessThanOrEqualTo(i.minStockLevel));
    if (alerts.length) {
      this.kitchen.emitLowStock(cafeId, alerts);
    }
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
