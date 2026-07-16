import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PayOrderDto } from './dto/pay-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/pay')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Pay for order (cashier)' })
  pay(
    @Param('cafeId') cafeId: string,
    @Param('orderId') orderId: string,
    @Body() dto: PayOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.payOrder(cafeId, orderId, dto, user.sub);
  }

  @Get('orders/:orderId/payment')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.WAITER)
  @ApiOperation({ summary: 'Get payment for order' })
  getPayment(@Param('cafeId') cafeId: string, @Param('orderId') orderId: string) {
    return this.paymentsService.getPayment(cafeId, orderId);
  }

  @Get('reports/daily')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Daily revenue report' })
  @ApiQuery({ name: 'date', description: 'YYYY-MM-DD', example: '2026-06-19' })
  dailyReport(@Param('cafeId') cafeId: string, @Query('date') date: string) {
    return this.paymentsService.getDailyReport(cafeId, date ?? new Date().toISOString().slice(0, 10));
  }
}
