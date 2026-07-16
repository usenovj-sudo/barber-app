import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';
import { ReportPeriod } from './period.util';

const VALID_PERIODS: ReportPeriod[] = ['day', 'week', 'month'];

function parsePeriod(value?: string): ReportPeriod {
  const p = (value ?? 'day') as ReportPeriod;
  if (!VALID_PERIODS.includes(p)) {
    throw new BadRequestException(`period must be one of: ${VALID_PERIODS.join(', ')}`);
  }
  return p;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cafes/:cafeId/reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exporter: ExportService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Owner dashboard: today/week/month KPIs, trend, top dishes' })
  dashboard(@Param('cafeId') cafeId: string) {
    return this.reports.getDashboard(cafeId);
  }

  @Get('demand-forecast')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'AI demand forecast: portions per dish by day of week' })
  @ApiQuery({ name: 'weeks', required: false, description: 'History window in weeks (default 6)' })
  demandForecast(@Param('cafeId') cafeId: string, @Query('weeks') weeks?: string) {
    const w = weeks ? Math.min(52, Math.max(1, parseInt(weeks))) : 6;
    return this.reports.getDemandForecast(cafeId, w);
  }

  @Get('financial')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Detailed financial report for a period' })
  @ApiQuery({ name: 'period', enum: VALID_PERIODS, required: false })
  @ApiQuery({ name: 'date', required: false, description: 'Reference date (ISO/YYYY-MM-DD)' })
  financial(
    @Param('cafeId') cafeId: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.reports.getReport(cafeId, parsePeriod(period), date);
  }

  @Get('financial/export.xlsx')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Download financial report as Excel (.xlsx)' })
  @ApiQuery({ name: 'period', enum: VALID_PERIODS, required: false })
  @ApiQuery({ name: 'date', required: false })
  async exportExcel(
    @Param('cafeId') cafeId: string,
    @Res() res: Response,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    const p = parsePeriod(period);
    const report = await this.reports.getReport(cafeId, p, date);
    const buf = await this.exporter.toExcel(report);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${p}-${date ?? 'current'}.xlsx"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }

  @Get('financial/export.pdf')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Download financial report as PDF' })
  @ApiQuery({ name: 'period', enum: VALID_PERIODS, required: false })
  @ApiQuery({ name: 'date', required: false })
  async exportPdf(
    @Param('cafeId') cafeId: string,
    @Res() res: Response,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    const p = parsePeriod(period);
    const report = await this.reports.getReport(cafeId, p, date);
    const buf = await this.exporter.toPdf(report);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${p}-${date ?? 'current'}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }
}
