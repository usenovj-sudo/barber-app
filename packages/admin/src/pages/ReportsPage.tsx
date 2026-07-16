import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, downloadFile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, PageTitle, Spinner, StatCard } from '../components/ui';
import { tenge, num, pct } from '../lib/format';

type Period = 'day' | 'week' | 'month';

interface Report {
  period: Period;
  label: string;
  summary: {
    orderCount: number;
    grossRevenue: number;
    discounts: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    marginPct: number;
    avgCheck: number;
  };
  byMethod: { method: string; amount: number; count: number }[];
  byDay: { date: string; revenue: number; orders: number; profit: number }[];
  topDishes: { dishId: string; name: string; qtySold: number; revenue: number }[];
  procurement: { invoiceCount: number; totalSpend: number };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
];

export function ReportsPage() {
  const { cafeId } = useAuth();
  const [period, setPeriod] = useState<Period>('month');

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', cafeId, period],
    queryFn: async () =>
      (await api.get<Report>(`/cafes/${cafeId}/reports/financial`, { params: { period } })).data,
  });

  const exportFile = (ext: 'xlsx' | 'pdf') =>
    downloadFile(
      `/cafes/${cafeId}/reports/financial/export.${ext}?period=${period}`,
      `report-${period}.${ext}`,
    );

  return (
    <div>
      <PageTitle
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => exportFile('xlsx')}>
              ⬇ Excel
            </Button>
            <Button variant="ghost" onClick={() => exportFile('pdf')}>
              ⬇ PDF
            </Button>
          </div>
        }
      >
        Финансовый отчёт
      </PageTitle>

      {/* Period switcher */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 mb-5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 text-sm rounded-md transition ${
              period === p.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox error={error} />}

      {data && (
        <>
          <div className="text-sm text-slate-500 mb-3">Период: {data.label}</div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Чистая выручка" value={tenge(data.summary.netRevenue)} accent="green" />
            <StatCard
              label="Валовая прибыль"
              value={tenge(data.summary.grossProfit)}
              sub={`маржа ${pct(data.summary.marginPct)}`}
            />
            <StatCard label="Заказов" value={num(data.summary.orderCount)} sub={`ср. чек ${tenge(data.summary.avgCheck)}`} />
            <StatCard label="Закупки" value={tenge(data.procurement.totalSpend)} sub={`${data.procurement.invoiceCount} накл.`} accent="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Detail label="Валовая выручка" value={tenge(data.summary.grossRevenue)} />
            <Detail label="Скидки" value={tenge(data.summary.discounts)} />
            <Detail label="Себестоимость (COGS)" value={tenge(data.summary.cogs)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="font-medium mb-4">По способам оплаты</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="font-normal pb-2">Способ</th>
                    <th className="font-normal pb-2 text-right">Сумма</th>
                    <th className="font-normal pb-2 text-right">Чеков</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byMethod.map((m) => (
                    <tr key={m.method} className="border-t border-slate-100">
                      <td className="py-2">{m.method}</td>
                      <td className="py-2 text-right tabular-nums">{tenge(m.amount)}</td>
                      <td className="py-2 text-right tabular-nums">{m.count}</td>
                    </tr>
                  ))}
                  {data.byMethod.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-slate-400">
                        Нет оплат
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            <Card className="p-5">
              <div className="font-medium mb-4">Топ блюд</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="font-normal pb-2">Блюдо</th>
                    <th className="font-normal pb-2 text-right">Продано</th>
                    <th className="font-normal pb-2 text-right">Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDishes.slice(0, 10).map((d) => (
                    <tr key={d.dishId} className="border-t border-slate-100">
                      <td className="py-2">{d.name}</td>
                      <td className="py-2 text-right tabular-nums">{d.qtySold}</td>
                      <td className="py-2 text-right tabular-nums">{tenge(d.revenue)}</td>
                    </tr>
                  ))}
                  {data.topDishes.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-slate-400">
                        Нет продаж
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-5 py-4 flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </Card>
  );
}
