import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { AuditService } from './audit.service';
import { ReportsController } from './reports.controller';
import { AuditController } from './audit.controller';

@Module({
  providers: [ReportsService, ExportService, AuditService],
  controllers: [ReportsController, AuditController],
  exports: [ReportsService, AuditService],
})
export class ReportsModule {}
