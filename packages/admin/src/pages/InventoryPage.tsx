import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, ErrorBox, PageTitle, Spinner } from '../components/ui';
import { tenge, num } from '../lib/format';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  pricePerUnit: number;
  minStockLevel: number;
  isLow: boolean;
}

export function InventoryPage() {
  const { cafeId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['ingredients', cafeId],
    queryFn: async () => (await api.get<Ingredient[]>(`/cafes/${cafeId}/ingredients`)).data,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const lowCount = data?.filter((i) => i.isLow).length ?? 0;

  return (
    <div>
      <PageTitle>Склад</PageTitle>
      {lowCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm mb-4">
          ⚠️ {lowCount} ингредиент(ов) ниже минимального остатка
        </div>
      )}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="font-normal px-5 py-3">Ингредиент</th>
              <th className="font-normal px-5 py-3 text-right">Остаток</th>
              <th className="font-normal px-5 py-3 text-right">Минимум</th>
              <th className="font-normal px-5 py-3 text-right">Цена/ед.</th>
              <th className="font-normal px-5 py-3 text-right">Статус</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-700">{i.name}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {num(i.stockQty)} {i.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-400">
                  {num(i.minStockLevel)} {i.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{tenge(i.pricePerUnit)}</td>
                <td className="px-5 py-3 text-right">
                  {i.isLow ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                      Заканчивается
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                      В норме
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-slate-400 text-center">
                  Нет ингредиентов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
