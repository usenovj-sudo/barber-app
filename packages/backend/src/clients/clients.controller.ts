import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

@ApiTags('Clients (CRM)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Register new client (with optional referral code)' })
  create(@Param('cafeId') cafeId: string, @Body() dto: CreateClientDto) {
    return this.clientsService.create(cafeId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.HOSTESS, UserRole.CASHIER)
  @ApiOperation({ summary: 'List clients with search' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Param('cafeId') cafeId: string, @Query('search') search?: string) {
    return this.clientsService.findAll(cafeId, search);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.HOSTESS, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get client profile with loyalty + order history' })
  findOne(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.clientsService.findOne(cafeId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Update client info' })
  update(
    @Param('cafeId') cafeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(cafeId, id, dto);
  }

  @Get(':id/orders')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Full order history for client' })
  orders(@Param('cafeId') cafeId: string, @Param('id') id: string) {
    return this.clientsService.getOrderHistory(cafeId, id);
  }
}
