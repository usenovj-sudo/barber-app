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
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ── Categories ────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all categories' })
  getCategories(@Param('cafeId') cafeId: string) {
    return this.menuService.getCategories(cafeId);
  }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create category (admin only)' })
  createCategory(@Param('cafeId') cafeId: string, @Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(cafeId, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete category (admin only)' })
  deleteCategory(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.menuService.deleteCategory(cafeId, id);
  }

  // ── Dishes ────────────────────────────────────────────────────────────────

  @Get('menu')
  @ApiOperation({ summary: 'Get full menu with availablePortions and margin per dish' })
  getMenu(@Param('cafeId') cafeId: string) {
    return this.menuService.getMenu(cafeId);
  }

  @Get('dishes/:id')
  @ApiOperation({ summary: 'Get single dish with recipe and stock info' })
  getDish(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.menuService.getDish(cafeId, id);
  }

  @Post('dishes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create dish (admin only)' })
  createDish(
    @Param('cafeId') cafeId: string,
    @Body() dto: CreateDishDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.createDish(cafeId, dto, user.sub);
  }

  @Put('dishes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update dish (admin only)' })
  updateDish(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.updateDish(cafeId, id, dto, user.sub);
  }

  @Patch('dishes/:id/toggle')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ summary: 'Toggle dish availability (hide/show on menu)' })
  toggleAvailability(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.toggleAvailability(cafeId, id, user.sub);
  }

  @Delete('dishes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete dish (admin only)' })
  deleteDish(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.deleteDish(cafeId, id, user.sub);
  }
}
