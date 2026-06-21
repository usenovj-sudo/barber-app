import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.CASHIER, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Floor plan: halls + tables with active order summary' })
  list(@Param('cafeId') cafeId: string) {
    return this.tablesService.listTables(cafeId);
  }
}
