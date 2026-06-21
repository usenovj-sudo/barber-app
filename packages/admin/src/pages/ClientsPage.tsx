import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Field, Input, Modal, PageTitle, Spinner } from '../components/ui';
import { tenge, num } from '../lib/format';

type Tier = 'BRONZE' | 'SILVER' | 'GOLD';

interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  referralCode?: string | null;
  loyaltyAccount?: { points: number; tier: Tier; totalSpent: number } | null;
  _count: { orders: number; reservations: number };
}

const TIER_STYLE: Record<Tier, string> = {
  BRONZE: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-slate-200 text-slate-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
};

export function ClientsPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const key = ['clients', cafeId, search];

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<Client[]>(`/cafes/${cafeId}/clients`, { params: { search: search || undefined } }))
        .data,
  });

  return (
    <div>
      <PageTitle action={<Button onClick={() => setAddOpen(true)}>+ Клиент</Button>}>Клиенты</PageTitle>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по имени, телефону, email…"
        className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
      />

      {isLoading && <Spinner />}
      {error && <ErrorBox error={error} />}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="font-normal px-5 py-3">Клиент</th>
                <th className="font-normal px-5 py-3">Контакты</th>
                <th className="font-normal px-5 py-3">Уровень</th>
                <th className="font-normal px-5 py-3 text-right">Баллы</th>
                <th className="font-normal px-5 py-3 text-right">Потрачено</th>
                <th className="font-normal px-5 py-3 text-right">Заказов</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-700">{c.name}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {c.phone ?? '—'}
                    {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                  </td>
                  <td className="px-5 py-3">
                    {c.loyaltyAccount ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${TIER_STYLE[c.loyaltyAccount.tier]}`}
                      >
                        {c.loyaltyAccount.tier}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {num(c.loyaltyAccount?.points ?? 0)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {tenge(c.loyaltyAccount?.totalSpent ?? 0)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                    {c._count.orders}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    Клиенты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {addOpen && (
        <ClientForm
          onClose={() => setAddOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['clients', cafeId] })}
        />
      )}
    </div>
  );
}

function ClientForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { cafeId } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', birthdate: '', referredByCode: '' });

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = { name: form.name };
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.birthdate) body.birthdate = form.birthdate;
      if (form.referredByCode) body.referredByCode = form.referredByCode;
      return api.post(`/cafes/${cafeId}/clients`, body);
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title="Новый клиент" onClose={onClose}>
      <Field label="Имя">
        <Input value={form.name} onChange={(e) => upd('name', e.target.value)} />
      </Field>
      <Field label="Телефон">
        <Input value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="+7…" />
      </Field>
      <Field label="Email">
        <Input value={form.email} onChange={(e) => upd('email', e.target.value)} />
      </Field>
      <Field label="Дата рождения">
        <Input type="date" value={form.birthdate} onChange={(e) => upd('birthdate', e.target.value)} />
      </Field>
      <Field label="Реферальный код пригласившего (необязательно)">
        <Input value={form.referredByCode} onChange={(e) => upd('referredByCode', e.target.value)} />
      </Field>
      {save.error && <ErrorBox error={save.error} />}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
          {save.isPending ? 'Сохранение…' : 'Создать'}
        </Button>
      </div>
    </Modal>
  );
}
