import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── Create order ─────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ summary: 'Create order (waiter)' })
  create(
    @Param('cafeId') cafeId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.createOrder(cafeId, dto, user.sub);
  }

  // ─── List orders ──────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.CASHIER, UserRole.COOK)
  @ApiOperation({ summary: 'List orders with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tableId', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  findAll(
    @Param('cafeId') cafeId: string,
    @Query('status') status?: string,
    @Query('tableId') tableId?: string,
    @Query('date') date?: string,
  ) {
    return this.ordersService.findAll(cafeId, { status, tableId, date });
  }

  // ─── Kitchen queue ────────────────────────────────────────────────────────

  @Get('kitchen')
  @Roles(UserRole.ADMIN, UserRole.COOK, UserRole.WAITER)
  @ApiOperation({ summary: 'Active kitchen orders (IN_KITCHEN, READY)' })
  findKitchenOrders(@Param('cafeId') cafeId: string) {
    return this.ordersService.findKitchenOrders(cafeId);
  }

  // ─── Single order ─────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.CASHIER, UserRole.COOK, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Get order by id' })
  findOne(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.ordersService.findOne(cafeId, id);
  }

  // ─── Status transitions ───────────────────────────────────────────────────

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ summary: 'Confirm order → IN_KITCHEN (deducts ingredients)' })
  confirm(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.confirmOrder(cafeId, id, user.sub);
  }

  @Patch(':id/ready')
  @Roles(UserRole.ADMIN, UserRole.COOK)
  @ApiOperation({ summary: 'Mark order READY (cook)' })
  markReady(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.markReady(cafeId, id, user.sub);
  }

  @Patch(':id/served')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ summary: 'Mark order SERVED (waiter)' })
  markServed(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.markServed(cafeId, id, user.sub);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ summary: 'Cancel order (restores stock if IN_KITCHEN+)' })
  cancel(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.cancelOrder(cafeId, id, user.sub);
  }

  // ─── Item status (cook) ───────────────────────────────────────────────────

  @Patch(':id/items/:itemId/status')
  @Roles(UserRole.ADMIN, UserRole.COOK)
  @ApiOperation({ summary: 'Update order item status (cook)' })
  updateItemStatus(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.updateItemStatus(cafeId, id, itemId, dto.status, user.sub);
  }
}
