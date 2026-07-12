import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ReportPeriod, resolvePeriod, dayKey, PeriodRange } from './period.util';
import { AiService, DishWeekdaySales } from '../ai/ai.service';

// Plain-number report shape (Decimals converted) ready for JSON / export.
export interface PeriodReport {
  cafeId: string;
  cafeName: string;
  period: ReportPeriod;
  label: string;
  from: string;
  to: string;
  generatedAt: string;
  summary: {
    orderCount: number;
    grossRevenue: number; // sum of order.totalAmount
    discounts: number; // total discounts granted
    netRevenue: number; // actually collected (payment.amount)
    cogs: number; // recipe cost of sold dishes
    grossProfit: number; // netRevenue - cogs
    marginPct: number;
    avgCheck: number;
  };
  byMethod: { method: string; amount: number; count: number }[];
  byDay: { date: string; revenue: number; orders: number; profit: number }[];
  topDishes: { dishId: string; name: string; qtySold: number; revenue: number }[];
  procurement: { invoiceCount: number; totalSpend: number };
}

const ZERO = new Prisma.Decimal(0);

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // Demand forecast: average portions sold per weekday per dish over a window,
  // then AI narrative on top (rule-based numbers work without an API key).
  async getDemandForecast(cafeId: string, weeksBack = 6) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - weeksBack * 7);

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { cafeId, status: 'PAID', updatedAt: { gte: from, lt: to } },
        status: { not: 'CANCELLED' },
      },
      select: {
        quantity: true,
        dish: { select: { id: true, name: true } },
        order: { select: { updatedAt: true } },
      },
    });

    // Count how many times each weekday actually occurred in the window,
    // so we divide totals by real occurrences to get a per-day average.
    const weekdayOccurrences = [0, 0, 0, 0, 0, 0, 0];
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
      weekdayOccurrences[(d.getDay() + 6) % 7] += 1;
    }

    // dishId -> { name, totals[7] }
    const map = new Map<string, { name: string; totals: number[] }>();
    for (const it of items) {
      const wd = (new Date(it.order.updatedAt).getDay() + 6) % 7; // 0=Mon
      const entry = map.get(it.dish.id) ?? { name: it.dish.name, totals: [0, 0, 0, 0, 0, 0, 0] };
      entry.totals[wd] += it.quantity;
      map.set(it.dish.id, entry);
    }

    const history: DishWeekdaySales[] = [...map.entries()]
      .map(([dishId, v]) => ({
        dishId,
        dishName: v.name,
        avgByWeekday: v.totals.map((t, i) =>
          weekdayOccurrences[i] ? Math.round((t / weekdayOccurrences[i]) * 10) / 10 : 0,
        ),
      }))
      .sort(
        (a, b) =>
          b.avgByWeekday.reduce((x, y) => x + y, 0) - a.avgByWeekday.reduce((x, y) => x + y, 0),
      );

    const cafe = await this.prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { name: true },
    });

    const result = await this.ai.forecastDemand(cafe?.name ?? '', history);
    return { ...result, weeksAnalyzed: weeksBack, generatedAt: new Date().toISOString() };
  }

  async getReport(cafeId: string, period: ReportPeriod, dateStr?: string): Promise<PeriodReport> {
    const range = resolvePeriod(period, dateStr);
    return this.buildReport(cafeId, range);
  }

  // Dashboard: quick KPIs for today, current week, current month at a glance.
  async getDashboard(cafeId: string) {
    const [day, week, month] = await Promise.all([
      this.buildReport(cafeId, resolvePeriod('day')),
      this.buildReport(cafeId, resolvePeriod('week')),
      this.buildReport(cafeId, resolvePeriod('month')),
    ]);

    const cafe = await this.prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { name: true },
    });

    // Low-stock count gives owner an at-a-glance operations signal
    const lowStock = await this.prisma.ingredient.count({
      where: {
        cafeId,
        stockQty: { lte: this.prisma.ingredient.fields.minStockLevel },
      },
    });

    return {
      cafeId,
      cafeName: cafe?.name ?? '',
      generatedAt: new Date().toISOString(),
      today: this.kpis(day),
      week: this.kpis(week),
      month: this.kpis(month),
      monthTrend: month.byDay,
      topDishes: month.topDishes.slice(0, 5),
      lowStockCount: lowStock,
    };
  }

  private kpis(r: PeriodReport) {
    return {
      label: r.label,
      orderCount: r.summary.orderCount,
      netRevenue: r.summary.netRevenue,
      grossProfit: r.summary.grossProfit,
      marginPct: r.summary.marginPct,
      avgCheck: r.summary.avgCheck,
    };
  }

  private async buildReport(cafeId: string, range: PeriodRange): Promise<PeriodReport> {
    const [cafe, orders, invoices] = await Promise.all([
      this.prisma.cafe.findUnique({ where: { id: cafeId }, select: { name: true } }),
      this.prisma.order.findMany({
        where: { cafeId, status: 'PAID', updatedAt: { gte: range.from, lt: range.to } },
        include: {
          payment: true,
          items: { include: { dish: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { cafeId, type: 'INBOUND', createdAt: { gte: range.from, lt: range.to } },
        select: { id: true, total: true },
      }),
    ]);

    let grossRevenue = ZERO;
    let netRevenue = ZERO;
    let discounts = ZERO;
    let cogs = ZERO;

    const methodMap = new Map<string, { amount: Prisma.Decimal; count: number }>();
    const dayMap = new Map<string, { revenue: Prisma.Decimal; orders: number; profit: Prisma.Decimal }>();
    const dishMap = new Map<string, { name: string; qty: number; revenue: Prisma.Decimal }>();

    for (const o of orders) {
      const collected = o.payment?.amount ?? o.totalAmount;
      grossRevenue = grossRevenue.add(o.totalAmount);
      netRevenue = netRevenue.add(collected);
      discounts = discounts.add(o.payment?.discountAmount ?? ZERO);
      cogs = cogs.add(o.costPrice);

      // by payment method
      const method = o.payment?.method ?? 'UNKNOWN';
      const m = methodMap.get(method) ?? { amount: ZERO, count: 0 };
      m.amount = m.amount.add(collected);
      m.count += 1;
      methodMap.set(method, m);

      // by day
      const key = dayKey(o.updatedAt);
      const d = dayMap.get(key) ?? { revenue: ZERO, orders: 0, profit: ZERO };
      d.revenue = d.revenue.add(collected);
      d.orders += 1;
      d.profit = d.profit.add(collected.sub(o.costPrice));
      dayMap.set(key, d);

      // top dishes
      for (const it of o.items) {
        if (it.status === 'CANCELLED') continue;
        const entry = dishMap.get(it.dishId) ?? { name: it.dish.name, qty: 0, revenue: ZERO };
        entry.qty += it.quantity;
        entry.revenue = entry.revenue.add(it.price.mul(it.quantity));
        dishMap.set(it.dishId, entry);
      }
    }

    const grossProfit = netRevenue.sub(cogs);
    const orderCount = orders.length;
    const procurementSpend = invoices.reduce((s, i) => s.add(i.total), ZERO);

    return {
      cafeId,
      cafeName: cafe?.name ?? '',
      period: range.period,
      label: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: new Date().toISOString(),
      summary: {
        orderCount,
        grossRevenue: grossRevenue.toNumber(),
        discounts: discounts.toNumber(),
        netRevenue: netRevenue.toNumber(),
        cogs: cogs.toNumber(),
        grossProfit: grossProfit.toNumber(),
        marginPct: netRevenue.isZero()
          ? 0
          : Number(grossProfit.div(netRevenue).mul(100).toFixed(1)),
        avgCheck: orderCount === 0 ? 0 : Number(netRevenue.div(orderCount).toFixed(0)),
      },
      byMethod: [...methodMap.entries()]
        .map(([method, v]) => ({ method, amount: v.amount.toNumber(), count: v.count }))
        .sort((a, b) => b.amount - a.amount),
      byDay: [...dayMap.entries()]
        .map(([date, v]) => ({
          date,
          revenue: v.revenue.toNumber(),
          orders: v.orders,
          profit: v.profit.toNumber(),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topDishes: [...dishMap.entries()]
        .map(([dishId, v]) => ({
          dishId,
          name: v.name,
          qtySold: v.qty,
          revenue: v.revenue.toNumber(),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20),
      procurement: { invoiceCount: invoices.length, totalSpend: procurementSpend.toNumber() },
    };
  }
}
