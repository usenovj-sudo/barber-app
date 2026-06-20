import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, ErrorBox, PageTitle, Spinner } from '../components/ui';
import { tenge, pct } from '../lib/format';

interface Dish {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  availablePortions: number;
  costPrice: number;
  margin: number;
  marginPct: number;
  category?: { id: string; name: string } | null;
}

export function MenuPage() {
  const { cafeId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['menu', cafeId],
    queryFn: async () => (await api.get<Dish[]>(`/cafes/${cafeId}/menu`)).data,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  // Group dishes by category for display
  const groups = new Map<string, Dish[]>();
  for (const d of data ?? []) {
    const key = d.category?.name ?? 'Без категории';
    const arr = groups.get(key) ?? [];
    arr.push(d);
    groups.set(key, arr);
  }

  return (
    <div>
      <PageTitle>Меню</PageTitle>
      <div className="space-y-6">
        {[...groups.entries()].map(([category, dishes]) => (
          <div key={category}>
            <h2 className="text-sm font-medium text-slate-500 mb-2">{category}</h2>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="font-normal px-5 py-3">Блюдо</th>
                    <th className="font-normal px-5 py-3 text-right">Цена</th>
                    <th className="font-normal px-5 py-3 text-right">Себест.</th>
                    <th className="font-normal px-5 py-3 text-right">Маржа</th>
                    <th className="font-normal px-5 py-3 text-right">Порций</th>
                    <th className="font-normal px-5 py-3 text-right">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {dishes.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium text-slate-700">{d.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{tenge(d.price)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-400">
                        {tenge(d.costPrice)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-emerald-600">
                        {tenge(d.margin)} <span className="text-slate-400">({pct(d.marginPct)})</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {d.availablePortions === 0 ? (
                          <span className="text-red-600">0</span>
                        ) : (
                          d.availablePortions
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {d.isAvailable ? (
                          <span className="text-emerald-600 text-xs">Активно</span>
                        ) : (
                          <span className="text-slate-400 text-xs">Скрыто</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ))}
        {groups.size === 0 && <div className="text-slate-400 text-sm">Меню пусто</div>}
      </div>
    </div>
  );
}
