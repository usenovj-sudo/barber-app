import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto } from './dto/shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '../common/types';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Open cashier shift' })
  open(
    @Param('cafeId') cafeId: string,
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shiftsService.openShift(cafeId, user.sub, dto);
  }

  @Patch(':id/close')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Close shift with cash reconciliation' })
  close(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
  ) {
    return this.shiftsService.closeShift(cafeId, id, dto);
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.WAITER)
  @ApiOperation({ summary: 'Get currently open shift' })
  getActive(@Param('cafeId') cafeId: string) {
    return this.shiftsService.getActiveShift(cafeId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'List all shifts' })
  findAll(@Param('cafeId') cafeId: string) {
    return this.shiftsService.findAll(cafeId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get shift detail with revenue summary' })
  findOne(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.shiftsService.findOne(cafeId, id);
  }
}
