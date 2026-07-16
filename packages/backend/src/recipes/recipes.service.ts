import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  // Get active recipe for a dish with full ingredient details
  async getActiveRecipe(cafeId: string, dishId: string) {
    const dish = await this.prisma.dish.findFirst({ where: { id: dishId, cafeId } });
    if (!dish) throw new NotFoundException('Dish not found');

    const recipe = await this.prisma.recipe.findFirst({
      where: { dishId, isActive: true },
      include: {
        items: {
          include: { ingredient: true },
        },
      },
      orderBy: { version: 'desc' },
    });

    if (!recipe) return null;

    return {
      ...recipe,
      items: recipe.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        ingredient: {
          ...item.ingredient,
          stockQty: Number(item.ingredient.stockQty),
          pricePerUnit: Number(item.ingredient.pricePerUnit),
        },
      })),
    };
  }

  // Get all recipe versions for a dish
  async getRecipeHistory(cafeId: string, dishId: string) {
    const dish = await this.prisma.dish.findFirst({ where: { id: dishId, cafeId } });
    if (!dish) throw new NotFoundException('Dish not found');

    const recipes = await this.prisma.recipe.findMany({
      where: { dishId },
      include: { items: { include: { ingredient: true } } },
      orderBy: { version: 'desc' },
    });

    return recipes.map((r) => ({
      ...r,
      items: r.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
      })),
    }));
  }

  // Create a new recipe version (deactivates previous active version)
  async upsertRecipe(cafeId: string, dishId: string, dto: UpsertRecipeDto, userId: string) {
    const dish = await this.prisma.dish.findFirst({ where: { id: dishId, cafeId } });
    if (!dish) throw new NotFoundException('Dish not found');

    if (dto.items.length === 0) {
      throw new BadRequestException('Recipe must have at least one ingredient');
    }

    // Validate all ingredients belong to this cafe
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, cafeId },
    });

    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException('One or more ingredients not found in this cafe');
    }

    // Get current version number
    const lastRecipe = await this.prisma.recipe.findFirst({
      where: { dishId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = lastRecipe ? lastRecipe.version + 1 : 1;

    // Deactivate all previous versions, create new one — in a transaction
    const recipe = await this.prisma.$transaction(async (tx) => {
      await tx.recipe.updateMany({
        where: { dishId, isActive: true },
        data: { isActive: false },
      });

      return tx.recipe.create({
        data: {
          dishId,
          version: nextVersion,
          isActive: true,
          items: {
            create: dto.items.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: { include: { ingredient: true } } },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        cafeId,
        userId,
        action: 'CREATE',
        entity: 'Recipe',
        entityId: recipe.id,
        diff: { version: nextVersion, dishId, items: dto.items } as object,
      },
    });

    return recipe;
  }

  // Calculate cost price of a dish based on its active recipe and current ingredient prices
  async calculateDishCost(dishId: string): Promise<number> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { dishId, isActive: true },
      include: { items: { include: { ingredient: true } } },
    });

    if (!recipe || recipe.items.length === 0) return 0;

    return recipe.items.reduce((total, item) => {
      return total + Number(item.quantity) * Number(item.ingredient.pricePerUnit);
    }, 0);
  }

  // Calculate how many full portions of a dish can still be made
  async calculateAvailablePortions(dishId: string): Promise<number> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { dishId, isActive: true },
      include: { items: { include: { ingredient: true } } },
    });

    if (!recipe || recipe.items.length === 0) return 0;

    // The limiting ingredient determines how many portions are possible
    const portionsPerIngredient = recipe.items.map((item) => {
      const qty = Number(item.quantity);
      if (qty <= 0) return Infinity;
      return Math.floor(Number(item.ingredient.stockQty) / qty);
    });

    return Math.min(...portionsPerIngredient);
  }

  // Batch: calculate available portions for multiple dishes at once (used by menu endpoint)
  async calculateAvailablePortionsBatch(
    dishIds: string[],
  ): Promise<Record<string, number>> {
    if (dishIds.length === 0) return {};

    const recipes = await this.prisma.recipe.findMany({
      where: { dishId: { in: dishIds }, isActive: true },
      include: { items: { include: { ingredient: true } } },
    });

    const result: Record<string, number> = {};

    for (const dishId of dishIds) {
      const recipe = recipes.find((r) => r.dishId === dishId);
      if (!recipe || recipe.items.length === 0) {
        result[dishId] = 0;
        continue;
      }

      const portions = recipe.items.map((item) => {
        const qty = Number(item.quantity);
        if (qty <= 0) return Infinity;
        return Math.floor(Number(item.ingredient.stockQty) / qty);
      });

      result[dishId] = Math.min(...portions);
    }

    return result;
  }
}
