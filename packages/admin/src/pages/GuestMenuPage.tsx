import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/public-api';
import { tenge } from '../lib/format';

interface Dish {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  isAvailable: boolean;
  availablePortions: number;
  category?: { id: string; name: string } | null;
}

interface TableMenu {
  table: { id: string; number: number; hall?: { name: string } | null; cafe: { id: string; name: string } };
  menu: Dish[];
}

export function GuestMenuPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placed, setPlaced] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['guest-menu', qrCode],
    queryFn: async () => (await publicApi.get<TableMenu>(`/public/tables/${qrCode}/menu`)).data,
  });

  const place = useMutation({
    mutationFn: () =>
      publicApi.post(`/public/tables/${qrCode}/orders`, {
        items: Object.entries(cart).map(([dishId, quantity]) => ({ dishId, quantity })),
      }),
    onSuccess: () => setPlaced(true),
  });

  const dishById = useMemo(() => {
    const m = new Map<string, Dish>();
    data?.menu.forEach((d) => m.set(d.id, d));
    return m;
  }, [data]);

  const total = Object.entries(cart).reduce(
    (s, [id, q]) => s + (dishById.get(id)?.price ?? 0) * q,
    0,
  );
  const itemCount = Object.values(cart).reduce((s, q) => s + q, 0);

  if (isLoading)
    return <div className="min-h-screen grid place-items-center text-slate-400">Загрузка меню…</div>;
  if (error)
    return (
      <div className="min-h-screen grid place-items-center text-red-500 p-6 text-center">
        Стол не найден. Проверьте QR-код.
      </div>
    );

  if (placed)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-semibold text-slate-900">Заказ принят!</h1>
          <p className="text-slate-500 mt-2">Официант скоро подойдёт. Спасибо!</p>
          <button
            onClick={() => {
              setCart({});
              setPlaced(false);
            }}
            className="mt-6 text-brand-600 hover:underline"
          >
            Сделать ещё заказ
          </button>
        </div>
      </div>
    );

  const groups = new Map<string, Dish[]>();
  for (const d of data?.menu ?? []) {
    if (!d.isAvailable) continue;
    const k = d.category?.name ?? 'Меню';
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }

  const setQty = (id: string, q: number) =>
    setCart((c) => {
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <header className="bg-brand-600 text-white px-5 py-5 sticky top-0 z-10">
        <div className="text-lg font-semibold">{data?.table.cafe.name}</div>
        <div className="text-brand-100 text-sm">
          Стол №{data?.table.number}
          {data?.table.hall?.name ? ` · ${data.table.hall.name}` : ''}
        </div>
      </header>

      {/* Menu */}
      <main className="p-4 space-y-6 max-w-lg mx-auto">
        {[...groups.entries()].map(([cat, dishes]) => (
          <section key={cat}>
            <h2 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">{cat}</h2>
            <div className="space-y-2">
              {dishes.map((d) => {
                const q = cart[d.id] ?? 0;
                const out = d.availablePortions <= 0;
                return (
                  <div
                    key={d.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">{d.name}</div>
                      {d.description && (
                        <div className="text-xs text-slate-400 line-clamp-2">{d.description}</div>
                      )}
                      <div className="text-brand-600 font-semibold mt-1">{tenge(d.price)}</div>
                      {out && <div className="text-xs text-red-500">Нет в наличии</div>}
                    </div>
                    {!out &&
                      (q === 0 ? (
                        <button
                          onClick={() => setQty(d.id, 1)}
                          className="shrink-0 w-9 h-9 rounded-full bg-brand-600 text-white text-xl leading-none"
                        >
                          +
                        </button>
                      ) : (
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => setQty(d.id, q - 1)}
                            className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 text-xl leading-none"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-medium">{q}</span>
                          <button
                            onClick={() => setQty(d.id, q + 1)}
                            className="w-9 h-9 rounded-full bg-brand-600 text-white text-xl leading-none"
                          >
                            +
                          </button>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {groups.size === 0 && <div className="text-slate-400 text-center py-10">Меню пока пусто</div>}
      </main>

      {/* Cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-slate-200">
          <div className="max-w-lg mx-auto">
            {place.error && (
              <div className="text-red-600 text-sm mb-2 text-center">
                Не удалось оформить заказ. Попробуйте ещё раз.
              </div>
            )}
            <button
              onClick={() => place.mutate()}
              disabled={place.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-medium flex items-center justify-between px-5 disabled:opacity-50"
            >
              <span>{place.isPending ? 'Отправка…' : 'Заказать'}</span>
              <span>
                {itemCount} поз. · {tenge(total)}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
