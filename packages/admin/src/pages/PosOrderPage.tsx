import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Spinner } from '../components/ui';
import { PaymentModal } from '../components/PaymentModal';
import { tenge } from '../lib/format';
import { MenuDish, Order, ORDER_STATUS_RU } from '../lib/pos-types';

interface CartLine {
  dish: MenuDish;
  quantity: number;
}

const ACTIVE = ['PENDING', 'IN_KITCHEN', 'READY', 'SERVED'];

export function PosOrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const { cafeId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  const ordersKey = ['table-orders', cafeId, tableId];

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', cafeId],
    queryFn: async () => (await api.get<MenuDish[]>(`/cafes/${cafeId}/menu`)).data,
  });

  const { data: orders, isLoading: ordersLoading, error } = useQuery({
    queryKey: ordersKey,
    queryFn: async () =>
      (await api.get<Order[]>(`/cafes/${cafeId}/orders`, { params: { tableId } })).data,
  });

  const activeOrder = orders?.find((o) => ACTIVE.includes(o.status)) ?? null;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ordersKey });
    queryClient.invalidateQueries({ queryKey: ['pos-tables', cafeId] });
  };

  const createOrder = useMutation({
    mutationFn: () =>
      api.post(`/cafes/${cafeId}/orders`, {
        tableId,
        source: 'WAITER',
        items: cart.map((l) => ({ dishId: l.dish.id, quantity: l.quantity })),
      }),
    onSuccess: () => {
      setCart([]);
      refreshAll();
    },
  });

  const transition = useMutation({
    mutationFn: (action: 'confirm' | 'served' | 'cancel') =>
      api.patch(`/cafes/${cafeId}/orders/${activeOrder!.id}/${action}`),
    onSuccess: refreshAll,
  });

  const filteredMenu = useMemo(() => {
    const list = (menu ?? []).filter((d) => d.isAvailable);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((d) => d.name.toLowerCase().includes(q));
  }, [menu, search]);

  const addToCart = (dish: MenuDish) =>
    setCart((c) => {
      const found = c.find((l) => l.dish.id === dish.id);
      if (found) return c.map((l) => (l.dish.id === dish.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { dish, quantity: 1 }];
    });

  const changeQty = (dishId: string, delta: number) =>
    setCart((c) =>
      c
        .map((l) => (l.dish.id === dishId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );

  const cartTotal = cart.reduce((s, l) => s + l.dish.price * l.quantity, 0);

  if (menuLoading || ordersLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/pos')} className="text-slate-500 hover:text-slate-900 text-sm">
          ← К столам
        </button>
        <h1 className="text-2xl font-semibold">Стол</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Menu picker */}
        <div className="lg:col-span-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск блюда…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMenu.map((d) => {
              const out = d.availablePortions <= 0;
              return (
                <button
                  key={d.id}
                  disabled={out}
                  onClick={() => addToCart(d)}
                  className={`text-left rounded-xl border p-3 transition ${
                    out
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-brand-400 hover:shadow-sm'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-800 line-clamp-2">{d.name}</div>
                  <div className="text-brand-600 font-semibold mt-1">{tenge(d.price)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {out ? 'Нет в наличии' : `${d.availablePortions} порц.`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Order panel */}
        <div className="space-y-4">
          {/* Existing active order */}
          {activeOrder && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Текущий заказ</span>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {ORDER_STATUS_RU[activeOrder.status]}
                </span>
              </div>
              <ul className="space-y-1 text-sm mb-3">
                {activeOrder.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span className="text-slate-700">
                      {it.quantity}× {it.dish.name}
                    </span>
                    <span className="tabular-nums text-slate-500">{tenge(it.price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-semibold border-t border-slate-100 pt-2 mb-3">
                <span>Итого</span>
                <span>{tenge(activeOrder.totalAmount)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeOrder.status === 'PENDING' && (
                  <Button onClick={() => transition.mutate('confirm')} disabled={transition.isPending}>
                    На кухню
                  </Button>
                )}
                {activeOrder.status === 'READY' && (
                  <Button onClick={() => transition.mutate('served')} disabled={transition.isPending}>
                    Подать
                  </Button>
                )}
                <Button variant="primary" onClick={() => setPayOpen(true)}>
                  Оплата
                </Button>
                <Button variant="ghost" onClick={() => transition.mutate('cancel')} disabled={transition.isPending}>
                  Отменить
                </Button>
              </div>
            </Card>
          )}

          {/* New order cart */}
          <Card className="p-4">
            <div className="font-medium mb-3">
              {activeOrder ? 'Дозаказ' : 'Новый заказ'}
            </div>
            {cart.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center">
                Выберите блюда из меню
              </div>
            ) : (
              <>
                <ul className="space-y-2 mb-3">
                  {cart.map((l) => (
                    <li key={l.dish.id} className="flex items-center justify-between text-sm">
                      <span className="flex-1 text-slate-700">{l.dish.name}</span>
                      <div className="flex items-center gap-2">
                        <QtyBtn onClick={() => changeQty(l.dish.id, -1)}>−</QtyBtn>
                        <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                        <QtyBtn onClick={() => changeQty(l.dish.id, +1)}>+</QtyBtn>
                        <span className="w-20 text-right tabular-nums text-slate-500">
                          {tenge(l.dish.price * l.quantity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between font-semibold border-t border-slate-100 pt-2 mb-3">
                  <span>Итого</span>
                  <span>{tenge(cartTotal)}</span>
                </div>
                <Button onClick={() => createOrder.mutate()} disabled={createOrder.isPending}>
                  {createOrder.isPending ? 'Создание…' : 'Создать заказ'}
                </Button>
                {createOrder.error && <div className="mt-2"><ErrorBox error={createOrder.error} /></div>}
              </>
            )}
          </Card>
        </div>
      </div>

      {payOpen && activeOrder && (
        <PaymentModal
          orderId={activeOrder.id}
          total={activeOrder.totalAmount}
          onClose={() => setPayOpen(false)}
          onPaid={() => {
            setPayOpen(false);
            refreshAll();
            navigate('/pos');
          }}
        />
      )}
    </div>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
    >
      {children}
    </button>
  );
}
