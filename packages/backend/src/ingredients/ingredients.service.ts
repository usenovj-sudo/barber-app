import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(cafeId: string) {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { cafeId },
      orderBy: { name: 'asc' },
    });

    return ingredients.map((i) => ({
      ...i,
      stockQty: Number(i.stockQty),
      pricePerUnit: Number(i.pricePerUnit),
      minStockLevel: Number(i.minStockLevel),
      isLow: Number(i.stockQty) <= Number(i.minStockLevel),
    }));
  }

  async findOne(cafeId: string, id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, cafeId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return {
      ...ingredient,
      stockQty: Number(ingredient.stockQty),
      pricePerUnit: Number(ingredient.pricePerUnit),
      minStockLevel: Number(ingredient.minStockLevel),
    };
  }

  async create(cafeId: string, dto: CreateIngredientDto, userId: string) {
    const ingredient = await this.prisma.ingredient.create({
      data: {
        cafeId,
        name: dto.name,
        unit: dto.unit,
        stockQty: dto.stockQty ?? 0,
        pricePerUnit: dto.pricePerUnit ?? 0,
        minStockLevel: dto.minStockLevel ?? 0,
      },
    });

    await this.auditLog(cafeId, userId, 'CREATE', 'Ingredient', ingredient.id, null, ingredient);

    return ingredient;
  }

  async update(cafeId: string, id: string, dto: UpdateIngredientDto, userId: string) {
    const existing = await this.findOne(cafeId, id);

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.pricePerUnit !== undefined && { pricePerUnit: dto.pricePerUnit }),
        ...(dto.minStockLevel !== undefined && { minStockLevel: dto.minStockLevel }),
      },
    });

    await this.auditLog(cafeId, userId, 'UPDATE', 'Ingredient', id, existing, updated);

    return updated;
  }

  // Manual stock adjustment (inventory reconciliation)
  async adjustStock(cafeId: string, id: string, dto: AdjustStockDto, userId: string) {
    const ingredient = await this.findOne(cafeId, id);
    const newQty = Number(ingredient.stockQty) + dto.delta;

    if (newQty < 0) {
      throw new BadRequestException(
        `Cannot remove ${Math.abs(dto.delta)} ${ingredient.unit} — only ${ingredient.stockQty} in stock`,
      );
    }

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: { stockQty: newQty },
    });

    await this.auditLog(cafeId, userId, 'UPDATE', 'Ingredient', id, { stockQty: ingredient.stockQty }, {
      stockQty: newQty,
      reason: dto.reason,
    });

    return { ...updated, stockQty: Number(updated.stockQty) };
  }

  async remove(cafeId: string, id: string, userId: string) {
    await this.findOne(cafeId, id);

    // Check if ingredient is used in any active recipe
    const inUse = await this.prisma.recipeItem.findFirst({
      where: { ingredientId: id, recipe: { isActive: true } },
    });
    if (inUse) {
      throw new BadRequestException('Cannot delete ingredient used in an active recipe');
    }

    await this.prisma.ingredient.delete({ where: { id } });
    await this.auditLog(cafeId, userId, 'DELETE', 'Ingredient', id, null, null);

    return { message: 'Ingredient deleted' };
  }

  // Returns ingredients below their minStockLevel
  async getLowStockAlerts(cafeId: string) {
    const ingredients = await this.prisma.ingredient.findMany({ where: { cafeId } });

    return ingredients
      .filter((i) => Number(i.stockQty) <= Number(i.minStockLevel) && Number(i.minStockLevel) > 0)
      .map((i) => ({
        ingredientId: i.id,
        name: i.name,
        unit: i.unit,
        stockQty: Number(i.stockQty),
        minStockLevel: Number(i.minStockLevel),
      }));
  }

  private async auditLog(
    cafeId: string,
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: { cafeId, userId, action, entity, entityId, diff: { before, after } as object },
    });
  }
}
