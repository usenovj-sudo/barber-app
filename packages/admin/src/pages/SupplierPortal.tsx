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

type Tab = 'profile' | 'catalog' | 'requests';

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
          {([['requests', 'Заявки'], ['catalog', 'Каталог'], ['profile', 'Профиль']] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 text-sm rounded-md ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'profile' && <ProfileTab />}
        {tab === 'catalog' && <CatalogTab />}
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
interface Request { id: string; status: string; cafe: { name: string }; createdAt: string; items: ReqItem[] }

function RequestsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['sup-requests'], queryFn: async () => (await sapi.get<Request[]>('/supplier/requests')).data });
  const [prices, setPrices] = useState<Record<string, number>>({});

  const quote = useMutation({
    mutationFn: (r: Request) =>
      sapi.post(`/supplier/requests/${r.id}/quote`, {
        quotes: r.items.map((it) => ({ itemId: it.id, unitPrice: prices[it.id] ?? it.unitPrice ?? 0 })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sup-requests'] }),
  });

  if (!data?.length) return <Card className="p-8 text-center text-slate-400">Входящих заявок нет</Card>;

  return (
    <div className="space-y-4">
      {data.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex justify-between mb-3">
            <span className="font-medium">{r.cafe.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.status}</span>
          </div>
          <table className="w-full text-sm mb-3">
            <thead><tr className="text-slate-400 text-left"><th className="font-normal pb-1">Позиция</th><th className="font-normal pb-1 text-right">Кол-во</th><th className="font-normal pb-1 text-right">Ваша цена</th></tr></thead>
            <tbody>
              {r.items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="py-2">{it.ingredientName}</td>
                  <td className="py-2 text-right tabular-nums">{it.quantity} {it.unit}</td>
                  <td className="py-2 text-right">
                    <input type="number" placeholder={String(it.unitPrice ?? '')} value={prices[it.id] ?? it.unitPrice ?? ''}
                      onChange={(e) => setPrices({ ...prices, [it.id]: Number(e.target.value) })}
                      className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-right tabular-nums" /> ₸
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <button onClick={() => quote.mutate(r)} disabled={quote.isPending}
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {quote.isPending ? 'Отправка…' : 'Отправить цены'}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
