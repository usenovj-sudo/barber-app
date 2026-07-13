import { FormEvent, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const SUP_TOKEN = 'cafe_supplier_token';

const sapi = axios.create({ baseURL: API_URL });
sapi.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(SUP_TOKEN);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Dedicated query client so the supplier portal is independent of the admin app
const supplierQC = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export function SupplierPortal() {
  return (
    <QueryClientProvider client={supplierQC}>
      <SupplierPortalInner />
    </QueryClientProvider>
  );
}

function SupplierPortalInner() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(SUP_TOKEN));
  if (!authed) return <SupplierLogin onLogin={() => setAuthed(true)} />;
  return <SupplierDashboard onLogout={() => { localStorage.removeItem(SUP_TOKEN); setAuthed(false); }} />;
}

function SupplierLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('agro@postavka.kz');
  const [password, setPassword] = useState('agro123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await sapi.post('/supplier/auth/login', { email, password });
      localStorage.setItem(SUP_TOKEN, data.accessToken);
      onLogin();
    } catch {
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900">📦 Кабинет поставщика</div>
          <div className="text-sm text-slate-500 mt-1">Вход для поставщиков B2B</div>
        </div>
        <label className="block">
          <span className="text-sm text-slate-600">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Пароль</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

type Tab = 'requests' | 'catalog' | 'warehouse' | 'analytics' | 'profile';

function SupplierDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('requests');
  const { data: me } = useQuery({ queryKey: ['sup-me'], queryFn: async () => (await sapi.get('/supplier/me')).data });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-6 h-14 flex items-center justify-between">
        <span className="font-semibold">📦 {me?.name ?? 'Поставщик'}</span>
        <button onClick={onLogout} className="text-sm text-slate-300 hover:text-white">Выйти</button>
      </header>

      <div className="max-w-4xl mx-auto p-5">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 mb-5">
          {([['requests', 'Заявки'], ['catalog', 'Каталог'], ['warehouse', 'Склад'], ['analytics', 'Аналитика'], ['profile', 'Профиль']] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 text-sm rounded-md ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'profile' && <ProfileTab />}
        {tab === 'catalog' && <CatalogTab />}
        {tab === 'warehouse' && <WarehouseTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'requests' && <RequestsTab />}
      </div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

function ProfileTab() {
  const { data } = useQuery({ queryKey: ['sup-me'], queryFn: async () => (await sapi.get('/supplier/me')).data });
  const { data: reviews } = useQuery({ queryKey: ['sup-reviews'], queryFn: async () => (await sapi.get('/supplier/reviews')).data });
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-sm text-slate-500">Рейтинг</div><div className="text-2xl font-semibold text-amber-500">★ {data.rating}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Отзывов</div><div className="text-2xl font-semibold">{data.reviewCount}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Товаров</div><div className="text-2xl font-semibold">{data.productCount}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Кафе-клиентов</div><div className="text-2xl font-semibold">{data.cafeCount}</div></Card>
      </div>
      <Card className="p-5">
        <div className="font-medium mb-3">Отзывы кафе</div>
        {reviews?.length ? (
          <ul className="space-y-2">
            {reviews.map((r: { id: string; rating: number; comment?: string; createdAt: string }) => (
              <li key={r.id} className="text-sm border-b border-slate-100 pb-2">
                <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                {r.comment && <span className="text-slate-600"> — {r.comment}</span>}
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-slate-400">Отзывов пока нет</div>}
      </Card>
    </div>
  );
}

interface Product { id: string; name: string; unit: string; price: number; minOrderQty: number; isAvailable: boolean }

function CatalogTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['sup-products'], queryFn: async () => (await sapi.get<Product[]>('/supplier/products')).data });
  const [editing, setEditing] = useState<Record<string, number>>({});

  const save = useMutation({
    mutationFn: ({ p, price }: { p: Product; price: number }) =>
      sapi.put(`/supplier/products/${p.id}`, { name: p.name, unit: p.unit, price, minOrderQty: p.minOrderQty, isAvailable: p.isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sup-products'] }),
  });

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr><th className="font-normal px-5 py-3">Товар</th><th className="font-normal px-5 py-3">Ед.</th><th className="font-normal px-5 py-3 text-right">Цена</th><th className="font-normal px-5 py-3"></th></tr>
        </thead>
        <tbody>
          {data?.map((p) => {
            const val = editing[p.id] ?? p.price;
            const changed = val !== p.price;
            return (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-700">{p.name}</td>
                <td className="px-5 py-3 text-slate-500">{p.unit}</td>
                <td className="px-5 py-3 text-right">
                  <input type="number" value={val} onChange={(e) => setEditing({ ...editing, [p.id]: Number(e.target.value) })}
                    className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-right tabular-nums" />
                </td>
                <td className="px-5 py-3 text-right">
                  {changed && (
                    <button onClick={() => save.mutate({ p, price: val })} disabled={save.isPending}
                      className="text-brand-600 hover:underline text-xs">сохранить</button>
                  )}
                </td>
              </tr>
            );
          })}
          {data?.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">Каталог пуст</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

interface ReqItem { id: string; ingredientName: string; unit: string; quantity: number; unitPrice: number | null }
interface Request { id: string; status: string; deliveryStatus: string | null; cafe: { name: string }; createdAt: string; items: ReqItem[] }

const DELIVERY_FLOW = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
const DELIVERY_RU: Record<string, string> = {
  PREPARING: 'Собирается', SHIPPED: 'Отправлено', IN_TRANSIT: 'В пути', DELIVERED: 'Доставлено',
};

function RequestsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['sup-requests'], queryFn: async () => (await sapi.get<Request[]>('/supplier/requests')).data });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sup-requests'] });

  const quote = useMutation({
    mutationFn: (r: Request) =>
      sapi.post(`/supplier/requests/${r.id}/quote`, {
        quotes: r.items.map((it) => ({ itemId: it.id, unitPrice: prices[it.id] ?? it.unitPrice ?? 0 })),
      }),
    onSuccess: invalidate,
  });
  const accept = useMutation({ mutationFn: (id: string) => sapi.post(`/supplier/requests/${id}/accept`), onSuccess: invalidate });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => sapi.post(`/supplier/requests/${id}/reject`, { reason }),
    onSuccess: invalidate,
  });
  const ship = useMutation({
    mutationFn: ({ id, deliveryStatus }: { id: string; deliveryStatus: string }) =>
      sapi.patch(`/supplier/requests/${id}/delivery`, { deliveryStatus }),
    onSuccess: invalidate,
  });

  if (!data?.length) return <Card className="p-8 text-center text-slate-400">Входящих заявок нет</Card>;

  return (
    <div className="space-y-4">
      {data.map((r) => {
        const negotiating = r.status === 'SENT' || r.status === 'QUOTED';
        const confirmed = r.status === 'CONFIRMED';
        const nextDelivery = DELIVERY_FLOW[DELIVERY_FLOW.indexOf(r.deliveryStatus ?? 'PREPARING') + 1];
        return (
          <Card key={r.id} className="p-5">
            <div className="flex justify-between mb-3">
              <span className="font-medium">{r.cafe.name}</span>
              <span className="flex items-center gap-2">
                {r.deliveryStatus && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    🚚 {DELIVERY_RU[r.deliveryStatus]}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.status}</span>
              </span>
            </div>
            <table className="w-full text-sm mb-3">
              <thead><tr className="text-slate-400 text-left"><th className="font-normal pb-1">Позиция</th><th className="font-normal pb-1 text-right">Кол-во</th><th className="font-normal pb-1 text-right">Ваша цена</th></tr></thead>
              <tbody>
                {r.items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="py-2">{it.ingredientName}</td>
                    <td className="py-2 text-right tabular-nums">{it.quantity} {it.unit}</td>
                    <td className="py-2 text-right">
                      <input type="number" disabled={!negotiating} placeholder={String(it.unitPrice ?? '')} value={prices[it.id] ?? it.unitPrice ?? ''}
                        onChange={(e) => setPrices({ ...prices, [it.id]: Number(e.target.value) })}
                        className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-right tabular-nums disabled:bg-slate-50" /> ₸
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {negotiating && (
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => { const reason = prompt('Причина отклонения:'); if (reason) reject.mutate({ id: r.id, reason }); }}
                  className="text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 text-sm">Отклонить</button>
                <button onClick={() => quote.mutate(r)} disabled={quote.isPending}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium">Отправить цены</button>
                <button onClick={() => accept.mutate(r.id)} disabled={accept.isPending}
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium">Принять в работу</button>
              </div>
            )}

            {confirmed && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-500">
                  Доставка: <b>{DELIVERY_RU[r.deliveryStatus ?? 'PREPARING']}</b>
                </span>
                {nextDelivery ? (
                  <button onClick={() => ship.mutate({ id: r.id, deliveryStatus: nextDelivery })} disabled={ship.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-medium">
                    → {DELIVERY_RU[nextDelivery]}
                  </button>
                ) : (
                  <span className="text-emerald-600 text-sm font-medium">✓ Доставлено</span>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

interface Analytics {
  totalRevenue: number;
  deliveryCount: number;
  cafeCount: number;
  byCafe: { name: string; revenue: number; deliveries: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  recentDeliveries: { id: string; cafeName: string; total: number; date: string }[];
}

function AnalyticsTab() {
  const { data } = useQuery({ queryKey: ['sup-analytics'], queryFn: async () => (await sapi.get<Analytics>('/supplier/analytics')).data });
  if (!data) return null;
  const t = (n: number) => `${n.toLocaleString('ru-RU')} ₸`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-sm text-slate-500">Выручка</div><div className="text-2xl font-semibold text-emerald-600">{t(data.totalRevenue)}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Поставок</div><div className="text-2xl font-semibold">{data.deliveryCount}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Кафе-клиентов</div><div className="text-2xl font-semibold">{data.cafeCount}</div></Card>
      </div>

      <Card className="p-5">
        <div className="font-medium mb-3">Выручка по кафе</div>
        {data.byCafe.length ? (
          <table className="w-full text-sm">
            <tbody>
              {data.byCafe.map((c) => (
                <tr key={c.name} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{c.name}</td>
                  <td className="py-2 text-right text-slate-400">{c.deliveries} пост.</td>
                  <td className="py-2 text-right tabular-nums font-medium">{t(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-sm text-slate-400">Пока нет поставок</div>}
      </Card>

      <Card className="p-5">
        <div className="font-medium mb-3">Популярные товары</div>
        {data.topProducts.length ? (
          <table className="w-full text-sm">
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.name} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{p.name}</td>
                  <td className="py-2 text-right text-slate-400 tabular-nums">{p.qty}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{t(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-sm text-slate-400">Нет данных</div>}
      </Card>
    </div>
  );
}

interface StockProduct { id: string; name: string; unit: string; stockQty: number | null }
interface Movement { id: string; productName: string; unit: string; type: string; quantity: number; note?: string; createdAt: string }

const MOVE_RU: Record<string, string> = { INBOUND: 'Приход', OUTBOUND: 'Расход', ADJUSTMENT: 'Корректировка' };

function WarehouseTab() {
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ['sup-products'], queryFn: async () => (await sapi.get<StockProduct[]>('/supplier/products')).data });
  const { data: moves } = useQuery({ queryKey: ['sup-moves'], queryFn: async () => (await sapi.get<Movement[]>('/supplier/stock/movements')).data });

  const move = useMutation({
    mutationFn: ({ id, delta, type, note }: { id: string; delta: number; type: string; note?: string }) =>
      sapi.post(`/supplier/products/${id}/stock`, { delta, type, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sup-products'] });
      qc.invalidateQueries({ queryKey: ['sup-moves'] });
    },
  });

  const ask = (id: string, sign: 1 | -1) => {
    const raw = prompt(sign > 0 ? 'Приход — сколько добавить?' : 'Расход — сколько списать?');
    const qty = Number(raw);
    if (!qty || qty <= 0) return;
    move.mutate({ id, delta: sign * qty, type: sign > 0 ? 'INBOUND' : 'OUTBOUND' });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr><th className="font-normal px-5 py-3">Товар</th><th className="font-normal px-5 py-3 text-right">Остаток</th><th className="font-normal px-5 py-3 text-right">Движение</th></tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-700">{p.name}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {p.stockQty == null ? <span className="text-slate-400">не ведётся</span> : <b>{p.stockQty.toLocaleString('ru-RU')} {p.unit}</b>}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => ask(p.id, 1)} className="text-emerald-600 hover:underline text-xs mr-3">+ приход</button>
                  <button onClick={() => ask(p.id, -1)} className="text-red-500 hover:underline text-xs">− расход</button>
                </td>
              </tr>
            ))}
            {products?.length === 0 && <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-400">Каталог пуст</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <div className="font-medium mb-3">История движений</div>
        {moves?.length ? (
          <table className="w-full text-sm">
            <tbody>
              {moves.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="py-2 text-slate-700">{m.productName}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.type === 'INBOUND' ? 'bg-emerald-100 text-emerald-700' : m.type === 'OUTBOUND' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{MOVE_RU[m.type]}</span>
                    {m.note && <span className="text-xs text-slate-400 ml-2">{m.note}</span>}
                  </td>
                  <td className={`py-2 text-right tabular-nums ${m.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity} {m.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-sm text-slate-400">Движений пока нет</div>}
      </Card>
    </div>
  );
}
