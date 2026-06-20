import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PeriodReport } from './reports.service';

// pdfkit is a CommonJS `module.exports = PDFDocument`; with esModuleInterop off
// the import-require form is the reliable way to get the constructor.
import PDFDocument = require('pdfkit');

const PERIOD_RU: Record<string, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
};

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

@Injectable()
export class ExportService {
  // ─── Excel (.xlsx) ──────────────────────────────────────────────────────────
  async toExcel(report: PeriodReport): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Cafe Platform';
    wb.created = new Date();

    // Summary sheet
    const s = wb.addWorksheet('Сводка');
    s.columns = [
      { header: 'Показатель', key: 'k', width: 30 },
      { header: 'Значение', key: 'v', width: 20 },
    ];
    s.getRow(1).font = { bold: true };

    s.addRow({ k: 'Кафе', v: report.cafeName });
    s.addRow({ k: 'Период', v: `${PERIOD_RU[report.period]} (${report.label})` });
    s.addRow({ k: 'Заказов', v: report.summary.orderCount });
    s.addRow({ k: 'Выручка (валовая), ₸', v: report.summary.grossRevenue });
    s.addRow({ k: 'Скидки, ₸', v: report.summary.discounts });
    s.addRow({ k: 'Выручка (чистая), ₸', v: report.summary.netRevenue });
    s.addRow({ k: 'Себестоимость, ₸', v: report.summary.cogs });
    s.addRow({ k: 'Валовая прибыль, ₸', v: report.summary.grossProfit });
    s.addRow({ k: 'Маржа, %', v: report.summary.marginPct });
    s.addRow({ k: 'Средний чек, ₸', v: report.summary.avgCheck });
    s.addRow({ k: 'Закупки (счета), шт', v: report.procurement.invoiceCount });
    s.addRow({ k: 'Закупки (сумма), ₸', v: report.procurement.totalSpend });

    // By payment method
    const m = wb.addWorksheet('По оплате');
    m.columns = [
      { header: 'Способ оплаты', key: 'method', width: 20 },
      { header: 'Сумма, ₸', key: 'amount', width: 18 },
      { header: 'Кол-во', key: 'count', width: 12 },
    ];
    m.getRow(1).font = { bold: true };
    report.byMethod.forEach((r) => m.addRow(r));

    // Daily trend
    const d = wb.addWorksheet('По дням');
    d.columns = [
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Выручка, ₸', key: 'revenue', width: 16 },
      { header: 'Заказов', key: 'orders', width: 12 },
      { header: 'Прибыль, ₸', key: 'profit', width: 16 },
    ];
    d.getRow(1).font = { bold: true };
    report.byDay.forEach((r) => d.addRow(r));

    // Top dishes
    const t = wb.addWorksheet('Топ блюд');
    t.columns = [
      { header: 'Блюдо', key: 'name', width: 30 },
      { header: 'Продано', key: 'qtySold', width: 12 },
      { header: 'Выручка, ₸', key: 'revenue', width: 16 },
    ];
    t.getRow(1).font = { bold: true };
    report.topDishes.forEach((r) => t.addRow(r));

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────────
  toPdf(report: PeriodReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).text(report.cafeName || 'Финансовый отчёт', { align: 'left' });
      doc
        .fontSize(11)
        .fillColor('#555')
        .text(`Отчёт: ${PERIOD_RU[report.period]} — ${report.label}`)
        .text(`Сформирован: ${new Date(report.generatedAt).toLocaleString('ru-RU')}`)
        .fillColor('#000');
      doc.moveDown();

      // Summary block
      const sm = report.summary;
      doc.fontSize(14).text('Сводка', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11);
      const line = (k: string, v: string) =>
        doc.text(k, { continued: true }).text(`  ${v}`, { align: 'right' });
      line('Заказов:', String(sm.orderCount));
      line('Выручка (чистая):', `${fmt(sm.netRevenue)} ₸`);
      line('Скидки:', `${fmt(sm.discounts)} ₸`);
      line('Себестоимость:', `${fmt(sm.cogs)} ₸`);
      line('Валовая прибыль:', `${fmt(sm.grossProfit)} ₸`);
      line('Маржа:', `${sm.marginPct}%`);
      line('Средний чек:', `${fmt(sm.avgCheck)} ₸`);
      line('Закупки за период:', `${fmt(report.procurement.totalSpend)} ₸`);
      doc.moveDown();

      // Payment methods
      if (report.byMethod.length) {
        doc.fontSize(14).text('По способам оплаты', { underline: true });
        doc.moveDown(0.3).fontSize(11);
        report.byMethod.forEach((r) =>
          doc
            .text(r.method, { continued: true })
            .text(`  ${fmt(r.amount)} ₸  (${r.count})`, { align: 'right' }),
        );
        doc.moveDown();
      }

      // Top dishes
      if (report.topDishes.length) {
        doc.fontSize(14).text('Топ блюд', { underline: true });
        doc.moveDown(0.3).fontSize(11);
        report.topDishes.slice(0, 10).forEach((r, i) =>
          doc
            .text(`${i + 1}. ${r.name}`, { continued: true })
            .text(`  ${r.qtySold} шт · ${fmt(r.revenue)} ₸`, { align: 'right' }),
        );
      }

      doc.end();
    });
  }
}
