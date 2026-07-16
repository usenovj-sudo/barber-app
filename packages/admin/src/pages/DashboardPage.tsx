import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, ErrorBox, PageTitle, Spinner, StatCard } from '../components/ui';
import { tenge, num, pct } from '../lib/format';

interface Kpi {
  label: string;
  orderCount: number;
  netRevenue: number;
  grossProfit: number;
  marginPct: number;
  avgCheck: number;
}

interface Dashboard {
  cafeName: string;
  today: Kpi;
  week: Kpi;
  month: Kpi;
  monthTrend: { date: string; revenue: number; orders: number; profit: number }[];
  topDishes: { dishId: string; name: string; qtySold: number; revenue: number }[];
  lowStockCount: number;
}

export function DashboardPage() {
  const { cafeId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', cafeId],
    queryFn: async () => (await api.get<Dashboard>(`/cafes/${cafeId}/reports/dashboard`)).data,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const maxRev = Math.max(1, ...data.monthTrend.map((d) => d.revenue));

  return (
    <div>
      <PageTitle>{data.cafeName} — обзор</PageTitle>

      {/* Today */}
      <h2 className="text-sm font-medium text-slate-500 mb-2">Сегодня · {data.today.label}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Выручка" value={tenge(data.today.netRevenue)} accent="green" />
        <StatCard label="Прибыль" value={tenge(data.today.grossProfit)} sub={pct(data.today.marginPct) + ' маржа'} />
        <StatCard label="Заказов" value={num(data.today.orderCount)} />
        <StatCard label="Средний чек" value={tenge(data.today.avgCheck)} />
      </div>

      {/* Month + week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <PeriodCard title="Неделя" kpi={data.week} />
        <PeriodCard title="Месяц" kpi={data.month} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend */}
        <Card className="p-5">
          <div className="font-medium mb-4">Выручка по дням · {data.month.label}</div>
          {data.monthTrend.length === 0 ? (
            <div className="text-sm text-slate-400">Нет продаж за период</div>
          ) : (
            <div className="space-y-2">
              {data.monthTrend.map((d) => (
                <div key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-slate-500">{d.date.slice(5)}</span>
                  <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full"
                      style={{ width: `${(d.revenue / maxRev) * 100}%` }}
                    />
                  </div>
                  <span className="w-28 text-right tabular-nums">{tenge(d.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top dishes + low stock */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="font-medium mb-4">Топ блюд месяца</div>
            {data.topDishes.length === 0 ? (
              <div className="text-sm text-slate-400">Нет данных</div>
            ) : (
              <ol className="space-y-2">
                {data.topDishes.map((d, i) => (
                  <li key={d.dishId} className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      {i + 1}. {d.name}{' '}
                      <span className="text-slate-400">· {d.qtySold} шт</span>
                    </span>
                    <span className="tabular-nums">{tenge(d.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {data.lowStockCount > 0 && (
            <Card className="p-5 border-amber-300 bg-amber-50">
              <div className="text-amber-800 text-sm">
                ⚠️ Заканчивается ингредиентов: <b>{data.lowStockCount}</b>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ title, kpi }: { title: string; kpi: Kpi }) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-slate-400">{kpi.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-semibold">{tenge(kpi.netRevenue)}</div>
          <div className="text-xs text-slate-400">выручка</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-emerald-600">{tenge(kpi.grossProfit)}</div>
          <div className="text-xs text-slate-400">прибыль {pct(kpi.marginPct)}</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{num(kpi.orderCount)}</div>
          <div className="text-xs text-slate-400">заказов</div>
        </div>
      </div>
    </Card>
  );
}
