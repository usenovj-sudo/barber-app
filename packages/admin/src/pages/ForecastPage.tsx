import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, ErrorBox, PageTitle, Spinner } from '../components/ui';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface DishForecast {
  dishId: string;
  dishName: string;
  avgByWeekday: number[];
}

interface Forecast {
  summary: string;
  forecast: DishForecast[];
  insights: string[];
  weeksAnalyzed: number;
}

// Heat colour by intensity relative to the max cell
function heat(value: number, max: number): string {
  if (value <= 0) return 'bg-slate-50 text-slate-300';
  const t = max > 0 ? value / max : 0;
  if (t > 0.66) return 'bg-brand-600 text-white';
  if (t > 0.33) return 'bg-brand-300 text-brand-900';
  return 'bg-brand-100 text-brand-700';
}

export function ForecastPage() {
  const { cafeId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['forecast', cafeId],
    queryFn: async () =>
      (await api.get<Forecast>(`/cafes/${cafeId}/reports/demand-forecast`)).data,
  });

  if (isLoading) return <Spinner label="Считаем прогноз…" />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const maxCell = Math.max(
    1,
    ...data.forecast.flatMap((d) => d.avgByWeekday),
  );

  return (
    <div>
      <PageTitle>🤖 Прогноз спроса по дням недели</PageTitle>

      <div className="bg-brand-50 border border-brand-100 text-brand-800 rounded-lg px-4 py-3 text-sm mb-5">
        {data.summary}
        <span className="text-brand-400"> · анализ за {data.weeksAnalyzed} нед.</span>
      </div>

      {data.forecast.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          Недостаточно продаж для прогноза. Проведите несколько оплаченных заказов — и здесь
          появится прогноз порций по дням недели.
        </Card>
      ) : (
        <Card className="p-5 overflow-x-auto">
          <div className="text-sm text-slate-500 mb-3">
            Ожидаемое количество порций к приготовлению (в среднем за день недели)
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left font-normal pb-2">Блюдо</th>
                {WEEKDAYS.map((w) => (
                  <th key={w} className="font-normal pb-2 w-14 text-center">
                    {w}
                  </th>
                ))}
                <th className="font-normal pb-2 w-16 text-center">Σ нед</th>
              </tr>
            </thead>
            <tbody>
              {data.forecast.map((d) => {
                const weekTotal = d.avgByWeekday.reduce((a, b) => a + b, 0);
                return (
                  <tr key={d.dishId} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-700">{d.dishName}</td>
                    {d.avgByWeekday.map((v, i) => (
                      <td key={i} className="py-1 px-1 text-center">
                        <div
                          className={`rounded-md py-1.5 tabular-nums text-xs font-medium ${heat(v, maxCell)}`}
                        >
                          {v > 0 ? v : '·'}
                        </div>
                      </td>
                    ))}
                    <td className="py-2 text-center tabular-nums font-semibold text-slate-700">
                      {Math.round(weekTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {data.insights.length > 0 && (
        <Card className="p-5 mt-5">
          <div className="font-medium mb-3">Рекомендации агента</div>
          <ul className="space-y-2">
            {data.insights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-brand-500">→</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
