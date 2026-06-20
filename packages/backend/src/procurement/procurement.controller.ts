import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import {
  ApprovePurchaseDto,
  RejectPurchaseDto,
  RunProcurementDto,
  SetProcurementLevelDto,
} from './dto/procurement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('Procurement & AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // ─── AI Settings ──────────────────────────────────────────────────────────

  @Get('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get AI procurement settings' })
  getSettings(@Param('cafeId') cafeId: string) {
    return this.procurementService.getAiSettings(cafeId);
  }

  @Patch('settings/level')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set procurement autonomy level (1=alerts, 2=draft, 3=auto-send)' })
  setLevel(@Param('cafeId') cafeId: string, @Body() dto: SetProcurementLevelDto) {
    return this.procurementService.setProcurementLevel(cafeId, dto);
  }

  // ─── Run analysis ─────────────────────────────────────────────────────────

  @Post('run')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Trigger AI procurement analysis' })
  run(
    @Param('cafeId') cafeId: string,
    @Body() dto: RunProcurementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.procurementService.runAnalysis(cafeId, user.sub, dto);
  }

  // ─── Purchase requests ────────────────────────────────────────────────────

  @Get('requests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all purchase requests' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  listRequests(@Param('cafeId') cafeId: string, @Query('status') status?: string) {
    return this.procurementService.findAllRequests(cafeId, status);
  }

  @Get('requests/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get purchase request detail' })
  getRequest(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.procurementService.findOneRequest(cafeId, id);
  }

  @Patch('requests/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve purchase request (with optional item overrides)' })
  approve(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.procurementService.approveRequest(cafeId, id, user.sub, dto);
  }

  @Patch('requests/:id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject purchase request' })
  reject(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: RejectPurchaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.procurementService.rejectRequest(cafeId, id, user.sub, dto);
  }
}
