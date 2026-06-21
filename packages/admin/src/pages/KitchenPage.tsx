import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useKitchenSocket } from '../lib/socket';

type ItemStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

interface KItem {
  id: string;
  dishId: string;
  quantity: number;
  status: ItemStatus;
  comment?: string | null;
  dish: { id: string; name: string };
}

interface KOrder {
  id: string;
  status: 'IN_KITCHEN' | 'READY';
  createdAt: string;
  note?: string | null;
  source: string;
  table?: { id: string; number: number } | null;
  waiter?: { id: string; name: string } | null;
  items: KItem[];
}

const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'PENDING', // tap a finished item to undo
  CANCELLED: 'CANCELLED',
};

export function KitchenPage() {
  const { cafeId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ['kitchen', cafeId];

  // Live clock for elapsed-time badges (re-render every 10s)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get<KOrder[]>(`/cafes/${cafeId}/orders/kitchen`)).data,
  });

  // Real-time: any kitchen event refreshes the board
  const { connected } = useKitchenSocket(() => {
    queryClient.invalidateQueries({ queryKey });
  });

  const itemMutation = useMutation({
    mutationFn: ({ orderId, itemId, status }: { orderId: string; itemId: string; status: ItemStatus }) =>
      api.patch(`/cafes/${cafeId}/orders/${orderId}/items/${itemId}/status`, { status }),
    // Optimistic: flip the item instantly, roll back on error
    onMutate: async ({ orderId, itemId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<KOrder[]>(queryKey);
      queryClient.setQueryData<KOrder[]>(queryKey, (old) =>
        (old ?? []).map((o) =>
          o.id === orderId
            ? { ...o, items: o.items.map((it) => (it.id === itemId ? { ...it, status } : it)) }
            : o,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const readyMutation = useMutation({
    mutationFn: (orderId: string) => api.patch(`/cafes/${cafeId}/orders/${orderId}/ready`),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const cooking = orders.filter((o) => o.status === 'IN_KITCHEN');
  const ready = orders.filter((o) => o.status === 'READY');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 h-14 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← Назад
          </button>
          <span className="text-lg font-semibold">🍳 Экран кухни</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-500'}`}
            />
            {connected ? 'Онлайн' : 'Нет связи'}
          </span>
          <span className="text-slate-400">{cooking.length} готовится · {ready.length} готово</span>
        </div>
      </header>

      <main className="p-5">
        {isLoading ? (
          <div className="text-slate-500 text-center py-20">Загрузка…</div>
        ) : orders.length === 0 ? (
          <div className="text-slate-500 text-center py-20 text-lg">Нет активных заказов 🎉</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...cooking, ...ready].map((order) => (
              <Ticket
                key={order.id}
                order={order}
                now={now}
                onToggleItem={(item) =>
                  itemMutation.mutate({
                    orderId: order.id,
                    itemId: item.id,
                    status: NEXT_STATUS[item.status],
                  })
                }
                onReady={() => readyMutation.mutate(order.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Ticket({
  order,
  now,
  onToggleItem,
  onReady,
}: {
  order: KOrder;
  now: number;
  onToggleItem: (item: KItem) => void;
  onReady: () => void;
}) {
  const elapsedMin = Math.floor((now - new Date(order.createdAt).getTime()) / 60_000);
  const isReady = order.status === 'READY';
  const allDone = order.items.every((i) => i.status === 'DONE' || i.status === 'CANCELLED');

  // Wait-time urgency coloring
  const timeColor =
    elapsedMin >= 15 ? 'bg-red-500' : elapsedMin >= 8 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className={`rounded-xl border flex flex-col overflow-hidden ${
        isReady ? 'border-emerald-600 bg-emerald-950/40' : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Ticket header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="font-semibold text-lg">
          {order.table ? `Стол ${order.table.number}` : sourceLabel(order.source)}
        </div>
        <span className={`text-xs font-medium text-white px-2 py-1 rounded-full ${timeColor}`}>
          {elapsedMin} мин
        </span>
      </div>

      {/* Items */}
      <ul className="flex-1 p-3 space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onToggleItem(item)}
              className={`w-full text-left rounded-lg px-3 py-2 transition flex items-start gap-2 ${itemClass(
                item.status,
              )}`}
            >
              <span className="mt-0.5 shrink-0">{itemIcon(item.status)}</span>
              <span className="flex-1">
                <span className="font-medium">
                  {item.quantity}× {item.dish.name}
                </span>
                {item.comment && (
                  <span className="block text-xs opacity-80 italic">{item.comment}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {order.note && (
        <div className="px-4 py-2 text-xs text-amber-300 border-t border-slate-800">
          📝 {order.note}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {order.waiter?.name ?? '—'}
        </span>
        {isReady ? (
          <span className="text-emerald-400 text-sm font-medium">✓ Готов к подаче</span>
        ) : (
          <button
            onClick={onReady}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              allDone
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            Готово
          </button>
        )}
      </div>
    </div>
  );
}

function itemClass(status: ItemStatus): string {
  switch (status) {
    case 'DONE':
      return 'bg-emerald-900/50 text-emerald-300 line-through';
    case 'IN_PROGRESS':
      return 'bg-amber-900/40 text-amber-200';
    case 'CANCELLED':
      return 'bg-slate-800 text-slate-500 line-through';
    default:
      return 'bg-slate-800 text-slate-100 hover:bg-slate-700';
  }
}

function itemIcon(status: ItemStatus): string {
  switch (status) {
    case 'DONE':
      return '✅';
    case 'IN_PROGRESS':
      return '🔥';
    case 'CANCELLED':
      return '✖️';
    default:
      return '⬜';
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'QR_TABLE':
      return 'QR-стол';
    case 'WEB_FORM':
      return 'Сайт';
    case 'CUSTOMER_APP':
      return 'Приложение';
    default:
      return 'Заказ';
  }
}
