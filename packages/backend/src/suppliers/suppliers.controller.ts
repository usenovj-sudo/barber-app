import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

const ADMIN = [UserRole.ADMIN];

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ─── Global supplier search ───────────────────────────────────────────────

  @Get('suppliers/search')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Search global supplier catalog' })
  @ApiQuery({ name: 'q', description: 'Name or region' })
  search(@Query('q') q: string) {
    return this.suppliersService.searchGlobal(q ?? '');
  }

  // ─── Cafe-scoped supplier management ─────────────────────────────────────

  @Get('cafes/:cafeId/suppliers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List suppliers for cafe' })
  findAll(@Param('cafeId') cafeId: string) {
    return this.suppliersService.findAllForCafe(cafeId);
  }

  @Get('cafes/:cafeId/suppliers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get supplier detail' })
  findOne(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.suppliersService.findOneForCafe(cafeId, id);
  }

  @Post('cafes/:cafeId/suppliers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new supplier and link to cafe' })
  create(@Param('cafeId') cafeId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.createAndLink(cafeId, dto);
  }

  @Post('cafes/:cafeId/suppliers/:id/link')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Link existing global supplier to cafe' })
  link(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.suppliersService.linkExisting(cafeId, id);
  }

  @Delete('cafes/:cafeId/suppliers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unlink supplier from cafe' })
  unlink(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.suppliersService.unlinkFromCafe(cafeId, id);
  }

  @Put('cafes/:cafeId/suppliers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update supplier info' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.updateSupplier(id, dto);
  }

  @Patch('cafes/:cafeId/suppliers/:id/favorite')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle supplier as favorite' })
  setFavorite(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body('isFavorite') isFavorite: boolean,
  ) {
    return this.suppliersService.setFavorite(cafeId, id, isFavorite);
  }

  // ─── Supplier products ────────────────────────────────────────────────────

  @Get('suppliers/:id/products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List supplier product catalog' })
  getProducts(@Param('id') id: string) {
    return this.suppliersService.getProducts(id);
  }

  @Post('suppliers/:id/products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add product to supplier catalog' })
  addProduct(@Param('id') id: string, @Body() dto: CreateSupplierProductDto) {
    return this.suppliersService.addProduct(id, dto);
  }

  @Put('suppliers/:supplierId/products/:productId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update supplier product (price, availability)' })
  updateProduct(@Param('productId') productId: string, @Body() dto: UpdateSupplierProductDto) {
    return this.suppliersService.updateProduct(productId, dto);
  }

  // ─── Ingredient ↔ product links ───────────────────────────────────────────

  @Post('cafes/:cafeId/ingredient-links')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Link supplier product to cafe ingredient' })
  linkIngredient(@Param('cafeId') cafeId: string, @Body() dto: LinkIngredientDto) {
    return this.suppliersService.linkIngredient(cafeId, dto);
  }

  // ─── Purchase request B2B flow ────────────────────────────────────────────

  @Post('cafes/:cafeId/procurement/requests/:id/quote')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supplier submits quote (prices + quantities)' })
  quote(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: SupplierQuoteDto,
  ) {
    return this.suppliersService.submitQuote(cafeId, id, dto);
  }

  @Patch('cafes/:cafeId/procurement/requests/:id/confirm-order')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm order (after review of quote)' })
  confirmOrder(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.suppliersService.confirmRequest(cafeId, id);
  }

  @Patch('cafes/:cafeId/procurement/requests/:id/delivered')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark delivered — creates invoice + updates ingredient stock' })
  delivered(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmDeliveryDto,
  ) {
    return this.suppliersService.confirmDelivery(cafeId, id, dto);
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  @Post('cafes/:cafeId/procurement/requests/:id/review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Rate supplier after delivery' })
  review(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: SupplierReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.suppliersService.addReview(cafeId, id, user.sub, dto);
  }

  @Get('suppliers/:id/reviews')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get supplier reviews' })
  getReviews(@Param('id') id: string) {
    return this.suppliersService.getReviews(id);
  }
}
