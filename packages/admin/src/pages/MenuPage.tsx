import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Field, Input, Modal, PageTitle, Select, Spinner } from '../components/ui';
import { tenge, pct } from '../lib/format';

interface Dish {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  isAvailable: boolean;
  availablePortions: number;
  costPrice: number;
  margin: number;
  marginPct: number;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export function MenuPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const [editDish, setEditDish] = useState<Dish | 'new' | null>(null);
  const [modDish, setModDish] = useState<Dish | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const menuKey = ['menu', cafeId];

  const { data, isLoading, error } = useQuery({
    queryKey: menuKey,
    queryFn: async () => (await api.get<Dish[]>(`/cafes/${cafeId}/menu`)).data,
  });
  const { data: categories } = useQuery({
    queryKey: ['categories', cafeId],
    queryFn: async () => (await api.get<Category[]>(`/cafes/${cafeId}/categories`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: menuKey });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/cafes/${cafeId}/dishes/${id}/toggle`),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/cafes/${cafeId}/dishes/${id}`),
    onSuccess: invalidate,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const groups = new Map<string, Dish[]>();
  for (const d of data ?? []) {
    const k = d.category?.name ?? 'Без категории';
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }

  return (
    <div>
      <PageTitle
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCatOpen(true)}>
              + Категория
            </Button>
            <Button onClick={() => setEditDish('new')}>+ Блюдо</Button>
          </div>
        }
      >
        Меню
      </PageTitle>

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
                    <th className="font-normal px-5 py-3 text-right">Действия</th>
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
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggle.mutate(d.id)}
                          className={`text-xs mr-3 hover:underline ${
                            d.isAvailable ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {d.isAvailable ? '● активно' : '○ скрыто'}
                        </button>
                        <button
                          onClick={() => setEditDish(d)}
                          className="text-slate-500 hover:underline text-xs mr-3"
                        >
                          править
                        </button>
                        <button
                          onClick={() => setModDish(d)}
                          className="text-slate-500 hover:underline text-xs mr-3"
                        >
                          модификаторы
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Удалить «${d.name}»?`)) del.mutate(d.id);
                          }}
                          className="text-red-500 hover:underline text-xs"
                        >
                          удалить
                        </button>
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

      {editDish && (
        <DishForm
          dish={editDish === 'new' ? undefined : editDish}
          categories={categories ?? []}
          onClose={() => setEditDish(null)}
          onSaved={invalidate}
        />
      )}
      {catOpen && (
        <CategoryForm
          onClose={() => setCatOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['categories', cafeId] })}
        />
      )}
      {modDish && <ModifiersModal dish={modDish} onClose={() => setModDish(null)} onSaved={invalidate} />}
    </div>
  );
}

interface Modifier {
  id: string;
  name: string;
  priceDelta: number;
}

function ModifiersModal({
  dish,
  onClose,
  onSaved,
}: {
  dish: Dish;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const key = ['modifiers', cafeId, dish.id];
  const [name, setName] = useState('');
  const [delta, setDelta] = useState(0);

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<Modifier[]>(`/cafes/${cafeId}/dishes/${dish.id}/modifiers`)).data,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    onSaved();
  };

  const add = useMutation({
    mutationFn: () =>
      api.post(`/cafes/${cafeId}/dishes/${dish.id}/modifiers`, { name, priceDelta: delta }),
    onSuccess: () => {
      setName('');
      setDelta(0);
      refresh();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/cafes/${cafeId}/modifiers/${id}`),
    onSuccess: refresh,
  });

  return (
    <Modal title={`Модификаторы: ${dish.name}`} onClose={onClose}>
      <p className="text-xs text-slate-500 mb-3">
        Наценки-добавки (двойная порция, соус и т.д.). Сумма прибавляется к цене блюда при заказе.
      </p>

      <ul className="space-y-1 mb-4">
        {data?.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm border-b border-slate-100 py-1.5">
            <span className="text-slate-700">{m.name}</span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-emerald-600">+{m.priceDelta.toLocaleString('ru-RU')} ₸</span>
              <button onClick={() => del.mutate(m.id)} className="text-red-500 hover:underline text-xs">
                ✕
              </button>
            </span>
          </li>
        ))}
        {data?.length === 0 && <li className="text-sm text-slate-400 py-2">Пока нет модификаторов</li>}
      </ul>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Двойная порция" />
          </Field>
        </div>
        <div className="w-28">
          <Field label="Наценка ₸">
            <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
          </Field>
        </div>
        <div className="pb-3">
          <Button onClick={() => add.mutate()} disabled={add.isPending || !name}>
            +
          </Button>
        </div>
      </div>
      {add.error && <ErrorBox error={add.error} />}

      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>
          Готово
        </Button>
      </div>
    </Modal>
  );
}

function DishForm({
  dish,
  categories,
  onClose,
  onSaved,
}: {
  dish?: Dish;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { cafeId } = useAuth();
  const isEdit = !!dish;
  const [form, setForm] = useState({
    name: dish?.name ?? '',
    price: dish?.price ?? 0,
    description: dish?.description ?? '',
    categoryId: dish?.categoryId ?? dish?.category?.id ?? '',
    isAvailable: dish?.isAvailable ?? true,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, categoryId: form.categoryId || undefined };
      return isEdit
        ? api.put(`/cafes/${cafeId}/dishes/${dish!.id}`, body)
        : api.post(`/cafes/${cafeId}/dishes`, body);
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const upd = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={isEdit ? 'Редактировать блюдо' : 'Новое блюдо'} onClose={onClose}>
      <Field label="Название">
        <Input value={form.name} onChange={(e) => upd('name', e.target.value)} />
      </Field>
      <Field label="Цена, ₸">
        <Input type="number" value={form.price} onChange={(e) => upd('price', Number(e.target.value))} />
      </Field>
      <Field label="Категория">
        <Select value={form.categoryId} onChange={(e) => upd('categoryId', e.target.value)}>
          <option value="">— без категории —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Описание">
        <Input value={form.description} onChange={(e) => upd('description', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
        <input
          type="checkbox"
          checked={form.isAvailable}
          onChange={(e) => upd('isAvailable', e.target.checked)}
        />
        Доступно для заказа
      </label>
      {isEdit && (
        <p className="text-xs text-slate-400 mb-3">
          Рецепт настраивается отдельно — порции считаются по остаткам ингредиентов.
        </p>
      )}
      {save.error && <ErrorBox error={save.error} />}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
          {save.isPending ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </Modal>
  );
}

function CategoryForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { cafeId } = useAuth();
  const [name, setName] = useState('');
  const save = useMutation({
    mutationFn: () => api.post(`/cafes/${cafeId}/categories`, { name }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });
  return (
    <Modal title="Новая категория" onClose={onClose}>
      <Field label="Название категории">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Горячие блюда" />
      </Field>
      {save.error && <ErrorBox error={save.error} />}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>
          {save.isPending ? 'Сохранение…' : 'Создать'}
        </Button>
      </div>
    </Modal>
  );
}
