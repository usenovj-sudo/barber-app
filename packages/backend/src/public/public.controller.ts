import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from '../orders/orders.service';
import { MenuService } from '../menu/menu.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { OrderSource } from '../common/types';

@ApiTags('Public (QR)')
@Controller('public')
export class PublicController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly menuService: MenuService,
  ) {}

  @Get('tables/:qrCode')
  @ApiOperation({ summary: 'Get table info by QR code (no auth)' })
  async getTable(@Param('qrCode') qrCode: string) {
    return this.ordersService.getTableByQrCode(qrCode);
  }

  @Get('tables/:qrCode/menu')
  @ApiOperation({ summary: 'Get menu for QR table (no auth)' })
  async getMenuForTable(@Param('qrCode') qrCode: string) {
    const table = await this.ordersService.getTableByQrCode(qrCode);
    const menu = await this.menuService.getMenu(table.cafe.id);
    return { table, menu };
  }

  @Post('tables/:qrCode/orders')
  @ApiOperation({ summary: 'Place order from QR table (no auth)' })
  async createOrderFromQr(
    @Param('qrCode') qrCode: string,
    @Body() dto: CreateOrderDto,
  ) {
    const table = await this.ordersService.getTableByQrCode(qrCode);
    return this.ordersService.createOrder(
      table.cafe.id,
      { ...dto, tableId: table.id, source: OrderSource.QR_TABLE },
    );
  }
}
