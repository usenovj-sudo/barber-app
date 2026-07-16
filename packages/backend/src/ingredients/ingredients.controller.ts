import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COOK)
  @ApiOperation({ summary: 'List all ingredients with stock levels' })
  findAll(@Param('cafeId') cafeId: string) {
    return this.ingredientsService.findAll(cafeId);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get ingredients below min stock level' })
  getLowStockAlerts(@Param('cafeId') cafeId: string) {
    return this.ingredientsService.getLowStockAlerts(cafeId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COOK)
  @ApiOperation({ summary: 'Get single ingredient' })
  findOne(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.ingredientsService.findOne(cafeId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create ingredient' })
  create(
    @Param('cafeId') cafeId: string,
    @Body() dto: CreateIngredientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ingredientsService.create(cafeId, dto, user.sub);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update ingredient (name, unit, price, min stock)' })
  update(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ingredientsService.update(cafeId, id, dto, user.sub);
  }

  @Patch(':id/stock')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually adjust stock (inventory reconciliation)' })
  adjustStock(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ingredientsService.adjustStock(cafeId, id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete ingredient (only if not in active recipe)' })
  remove(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ingredientsService.remove(cafeId, id, user.sub);
  }
}
