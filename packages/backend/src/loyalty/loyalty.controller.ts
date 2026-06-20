import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { CreatePrizeDto, ManualPointsDto, RedeemPrizeDto, UpdatePrizeDto } from './dto/loyalty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ─── Client loyalty account ───────────────────────────────────────────────

  @Get('clients/:clientId/loyalty')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.WAITER, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Get loyalty account with tier progress and transaction history' })
  getAccount(@Param('cafeId') cafeId: string, @Param('clientId') clientId: string) {
    return this.loyaltyService.getAccount(cafeId, clientId);
  }

  @Get('clients/:clientId/loyalty/transactions')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Full loyalty transaction log' })
  getTransactions(@Param('cafeId') cafeId: string, @Param('clientId') clientId: string) {
    return this.loyaltyService.getTransactions(cafeId, clientId);
  }

  @Post('clients/:clientId/loyalty/points')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually add or deduct points (admin only)' })
  addPoints(
    @Param('cafeId') cafeId: string,
    @Param('clientId') clientId: string,
    @Body() dto: ManualPointsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.loyaltyService.addManualPoints(cafeId, clientId, dto, user.sub);
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  @Get('loyalty/leaderboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Top clients by total spend' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  leaderboard(@Param('cafeId') cafeId: string, @Query('limit') limit?: string) {
    return this.loyaltyService.getLeaderboard(cafeId, limit ? parseInt(limit) : 10);
  }

  // ─── Prizes ───────────────────────────────────────────────────────────────

  @Get('prizes')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.WAITER)
  @ApiOperation({ summary: 'List active prizes' })
  listPrizes(@Param('cafeId') cafeId: string) {
    return this.loyaltyService.listPrizes(cafeId);
  }

  @Post('prizes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new prize' })
  createPrize(@Param('cafeId') cafeId: string, @Body() dto: CreatePrizeDto) {
    return this.loyaltyService.createPrize(cafeId, dto);
  }

  @Patch('prizes/:prizeId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update prize (price, status)' })
  updatePrize(
    @Param('cafeId') cafeId: string,
    @Param('prizeId') prizeId: string,
    @Body() dto: UpdatePrizeDto,
  ) {
    return this.loyaltyService.updatePrize(cafeId, prizeId, dto);
  }

  @Post('prizes/redeem')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Redeem prize with client loyalty points' })
  redeem(@Param('cafeId') cafeId: string, @Body() dto: RedeemPrizeDto) {
    return this.loyaltyService.redeemPrize(cafeId, dto);
  }

  // ─── Points expiry ────────────────────────────────────────────────────────

  @Post('loyalty/expire-points')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Expire EARN points older than N days' })
  @ApiQuery({ name: 'days', example: 365 })
  expirePoints(@Param('cafeId') cafeId: string, @Query('days') days: string) {
    return this.loyaltyService.expirePoints(cafeId, parseInt(days ?? '365'));
  }
}
