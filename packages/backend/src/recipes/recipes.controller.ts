import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/dishes/:dishId/recipe')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COOK)
  @ApiOperation({ summary: 'Get the active recipe for a dish' })
  getActiveRecipe(@Param('cafeId') cafeId: string, @Param('dishId') dishId: string) {
    return this.recipesService.getActiveRecipe(cafeId, dishId);
  }

  @Get('history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all recipe versions (history) for a dish' })
  getHistory(@Param('cafeId') cafeId: string, @Param('dishId') dishId: string) {
    return this.recipesService.getRecipeHistory(cafeId, dishId);
  }

  @Get('cost')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Calculate current cost price of a dish' })
  async getCost(@Param('dishId') dishId: string) {
    const cost = await this.recipesService.calculateDishCost(dishId);
    return { dishId, costPrice: cost };
  }

  @Get('portions')
  @Roles(UserRole.ADMIN, UserRole.COOK)
  @ApiOperation({ summary: 'Calculate how many portions can still be made' })
  async getPortions(@Param('dishId') dishId: string) {
    const portions = await this.recipesService.calculateAvailablePortions(dishId);
    return { dishId, availablePortions: portions };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new recipe version (deactivates previous)' })
  upsertRecipe(
    @Param('cafeId') cafeId: string,
    @Param('dishId') dishId: string,
    @Body() dto: UpsertRecipeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recipesService.upsertRecipe(cafeId, dishId, dto, user.sub);
  }
}
