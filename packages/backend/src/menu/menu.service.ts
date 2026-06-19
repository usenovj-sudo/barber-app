import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesService } from '../recipes/recipes.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipesService: RecipesService,
  ) {}

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(cafeId: string) {
    return this.prisma.category.findMany({
      where: { cafeId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { dishes: true } } },
    });
  }

  async createCategory(cafeId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { cafeId, name: dto.name, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async deleteCategory(cafeId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, cafeId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  // ── Dishes ────────────────────────────────────────────────────────────────

  // Public-facing menu: includes availablePortions and costPrice for each dish
  async getMenu(cafeId: string) {
    const dishes = await this.prisma.dish.findMany({
      where: { cafeId },
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        modifiers: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    // Batch calculate portions for all dishes in one pass
    const dishIds = dishes.map((d) => d.id);
    const [portionsMap, costsMap] = await Promise.all([
      this.recipesService.calculateAvailablePortionsBatch(dishIds),
      this.calculateCostsBatch(dishIds),
    ]);

    return dishes.map((dish) => ({
      ...dish,
      price: Number(dish.price),
      availablePortions: portionsMap[dish.id] ?? 0,
      costPrice: costsMap[dish.id] ?? 0,
      margin: Number(dish.price) - (costsMap[dish.id] ?? 0),
      marginPct:
        Number(dish.price) > 0
          ? Math.round(((Number(dish.price) - (costsMap[dish.id] ?? 0)) / Number(dish.price)) * 100)
          : 0,
    }));
  }

  async getDish(cafeId: string, id: string) {
    const dish = await this.prisma.dish.findFirst({
      where: { id, cafeId },
      include: {
        category: true,
        modifiers: true,
        recipes: {
          where: { isActive: true },
          include: { items: { include: { ingredient: true } } },
        },
      },
    });
    if (!dish) throw new NotFoundException('Dish not found');

    const [portions, cost] = await Promise.all([
      this.recipesService.calculateAvailablePortions(id),
      this.recipesService.calculateDishCost(id),
    ]);

    return {
      ...dish,
      price: Number(dish.price),
      availablePortions: portions,
      costPrice: cost,
      margin: Number(dish.price) - cost,
    };
  }

  async createDish(cafeId: string, dto: CreateDishDto, userId: string) {
    const dish = await this.prisma.dish.create({
      data: {
        cafeId,
        name: dto.name,
        price: dto.price,
        description: dto.description,
        photoUrl: dto.photoUrl,
        categoryId: dto.categoryId,
        section: dto.section,
        isAvailable: dto.isAvailable ?? true,
      },
    });

    await this.prisma.auditLog.create({
      data: { cafeId, userId, action: 'CREATE', entity: 'Dish', entityId: dish.id, diff: dto as object },
    });

    return dish;
  }

  async updateDish(cafeId: string, id: string, dto: UpdateDishDto, userId: string) {
    const dish = await this.prisma.dish.findFirst({ where: { id, cafeId } });
    if (!dish) throw new NotFoundException('Dish not found');

    const updated = await this.prisma.dish.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.section !== undefined && { section: dto.section }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });

    await this.prisma.auditLog.create({
      data: { cafeId, userId, action: 'UPDATE', entity: 'Dish', entityId: id, diff: { before: dish, changes: dto } as object },
    });

    return updated;
  }

  async toggleAvailability(cafeId: string, id: string, userId: string) {
    const dish = await this.prisma.dish.findFirst({ where: { id, cafeId } });
    if (!dish) throw new NotFoundException('Dish not found');

    const updated = await this.prisma.dish.update({
      where: { id },
      data: { isAvailable: !dish.isAvailable },
    });

    await this.prisma.auditLog.create({
      data: {
        cafeId, userId, action: 'UPDATE', entity: 'Dish', entityId: id,
        diff: { isAvailable: updated.isAvailable },
      },
    });

    return updated;
  }

  async deleteDish(cafeId: string, id: string, userId: string) {
    const dish = await this.prisma.dish.findFirst({ where: { id, cafeId } });
    if (!dish) throw new NotFoundException('Dish not found');
    await this.prisma.dish.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: { cafeId, userId, action: 'DELETE', entity: 'Dish', entityId: id },
    });

    return { message: 'Dish deleted' };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async calculateCostsBatch(dishIds: string[]): Promise<Record<string, number>> {
    if (dishIds.length === 0) return {};

    const recipes = await this.prisma.recipe.findMany({
      where: { dishId: { in: dishIds }, isActive: true },
      include: { items: { include: { ingredient: { select: { pricePerUnit: true } } } } },
    });

    const result: Record<string, number> = {};
    for (const recipe of recipes) {
      result[recipe.dishId] = recipe.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.ingredient.pricePerUnit),
        0,
      );
    }
    return result;
  }
}
