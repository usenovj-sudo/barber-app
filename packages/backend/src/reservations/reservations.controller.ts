import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HOSTESS, UserRole.WAITER)
  @ApiOperation({ summary: 'Create reservation (checks table availability)' })
  create(@Param('cafeId') cafeId: string, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(cafeId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HOSTESS, UserRole.WAITER)
  @ApiOperation({ summary: 'List reservations' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tableId', required: false })
  findAll(
    @Param('cafeId') cafeId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('tableId') tableId?: string,
  ) {
    return this.reservationsService.findAll(cafeId, { date, status, tableId });
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.HOSTESS, UserRole.WAITER)
  @ApiOperation({ summary: 'Check available tables for a given datetime and guest count' })
  @ApiQuery({ name: 'date', description: 'ISO datetime e.g. 2026-06-21T19:00:00.000Z' })
  @ApiQuery({ name: 'guests', description: 'Number of guests' })
  checkAvailability(
    @Param('cafeId') cafeId: string,
    @Query('date') date: string,
    @Query('guests') guests: string,
  ) {
    return this.reservationsService.checkAvailability(cafeId, date, parseInt(guests ?? '2'));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.HOSTESS, UserRole.WAITER)
  @ApiOperation({ summary: 'Get reservation detail' })
  findOne(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.reservationsService.findOne(cafeId, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Update reservation status (CONFIRMED → SEATED → COMPLETED)' })
  updateStatus(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateStatus(cafeId, id, dto);
  }
}
