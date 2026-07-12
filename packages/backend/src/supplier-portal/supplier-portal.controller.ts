import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupplierPortalService } from './supplier-portal.service';
import { CurrentSupplier, SupplierJwtGuard } from './supplier-jwt.guard';
import { SupplierJwtPayload } from './supplier-jwt.strategy';
import {
  QuoteItemDto,
  SupplierLoginDto,
  SupplierProductDto,
} from './dto/supplier-portal.dto';

@ApiTags('Supplier Portal')
@Controller('supplier')
export class SupplierPortalController {
  constructor(private readonly portal: SupplierPortalService) {}

  // ─── Public: login ─────────────────────────────────────────────────────────

  @Post('auth/login')
  @ApiOperation({ summary: 'Supplier login (returns supplier JWT)' })
  login(@Body() dto: SupplierLoginDto) {
    return this.portal.login(dto);
  }

  // ─── Authenticated supplier endpoints ──────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Supplier profile, rating and stats' })
  me(@CurrentSupplier() s: SupplierJwtPayload) {
    return this.portal.getProfile(s.supplierId);
  }

  @Get('reviews')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Reviews left by cafes' })
  reviews(@CurrentSupplier() s: SupplierJwtPayload) {
    return this.portal.getReviews(s.supplierId);
  }

  @Get('products')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Own product catalogue with prices' })
  products(@CurrentSupplier() s: SupplierJwtPayload) {
    return this.portal.listProducts(s.supplierId);
  }

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Add a product to the catalogue' })
  addProduct(@CurrentSupplier() s: SupplierJwtPayload, @Body() dto: SupplierProductDto) {
    return this.portal.addProduct(s.supplierId, dto);
  }

  @Put('products/:id')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Update a product / its price' })
  updateProduct(
    @CurrentSupplier() s: SupplierJwtPayload,
    @Param('id') id: string,
    @Body() dto: SupplierProductDto,
  ) {
    return this.portal.updateProduct(s.supplierId, id, dto);
  }

  @Get('requests')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Incoming purchase requests from cafes' })
  requests(@CurrentSupplier() s: SupplierJwtPayload) {
    return this.portal.listRequests(s.supplierId);
  }

  @Post('requests/:id/quote')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Quote prices for a request (→ QUOTED)' })
  quote(
    @CurrentSupplier() s: SupplierJwtPayload,
    @Param('id') id: string,
    @Body() body: { quotes: QuoteItemDto[] },
  ) {
    return this.portal.submitQuote(s.supplierId, id, body.quotes ?? []);
  }

  @Post('requests/:id/accept')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Accept request → CONFIRMED, start fulfillment' })
  accept(@CurrentSupplier() s: SupplierJwtPayload, @Param('id') id: string) {
    return this.portal.acceptRequest(s.supplierId, id);
  }

  @Post('requests/:id/reject')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Reject the whole request' })
  reject(
    @CurrentSupplier() s: SupplierJwtPayload,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.portal.rejectRequest(s.supplierId, id, body.reason ?? '');
  }

  @Patch('requests/:id/delivery')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Advance shipping status (PREPARING→SHIPPED→IN_TRANSIT→DELIVERED)' })
  delivery(
    @CurrentSupplier() s: SupplierJwtPayload,
    @Param('id') id: string,
    @Body() body: { deliveryStatus: string },
  ) {
    return this.portal.updateDelivery(s.supplierId, id, body.deliveryStatus);
  }

  @Get('analytics')
  @ApiBearerAuth()
  @UseGuards(SupplierJwtGuard)
  @ApiOperation({ summary: 'Revenue, deliveries and top products per cafe' })
  analytics(@CurrentSupplier() s: SupplierJwtPayload) {
    return this.portal.getAnalytics(s.supplierId);
  }
}
