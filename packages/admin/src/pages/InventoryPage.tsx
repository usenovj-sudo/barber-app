import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Field, Input, Modal, PageTitle, Spinner } from '../components/ui';
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

type EditState =
  | { mode: 'create' }
  | { mode: 'edit'; ingredient: Ingredient }
  | { mode: 'stock'; ingredient: Ingredient }
  | null;

export function InventoryPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState<EditState>(null);
  const key = ['ingredients', cafeId];

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<Ingredient[]>(`/cafes/${cafeId}/ingredients`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/cafes/${cafeId}/ingredients/${id}`),
    onSuccess: invalidate,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const lowCount = data?.filter((i) => i.isLow).length ?? 0;

  return (
    <div>
      <PageTitle action={<Button onClick={() => setEdit({ mode: 'create' })}>+ Ингредиент</Button>}>
        Склад
      </PageTitle>
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
              <th className="font-normal px-5 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-700">
                  {i.name}
                  {i.isLow && (
                    <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                      мало
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {num(i.stockQty)} {i.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-400">
                  {num(i.minStockLevel)} {i.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{tenge(i.pricePerUnit)}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEdit({ mode: 'stock', ingredient: i })}
                    className="text-brand-600 hover:underline text-xs mr-3"
                  >
                    ± остаток
                  </button>
                  <button
                    onClick={() => setEdit({ mode: 'edit', ingredient: i })}
                    className="text-slate-500 hover:underline text-xs mr-3"
                  >
                    править
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить «${i.name}»?`)) del.mutate(i.id);
                    }}
                    className="text-red-500 hover:underline text-xs"
                  >
                    удалить
                  </button>
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

      {edit?.mode === 'create' && <IngredientForm onClose={() => setEdit(null)} onSaved={invalidate} />}
      {edit?.mode === 'edit' && (
        <IngredientForm ingredient={edit.ingredient} onClose={() => setEdit(null)} onSaved={invalidate} />
      )}
      {edit?.mode === 'stock' && (
        <StockForm ingredient={edit.ingredient} onClose={() => setEdit(null)} onSaved={invalidate} />
      )}
    </div>
  );
}

function IngredientForm({
  ingredient,
  onClose,
  onSaved,
}: {
  ingredient?: Ingredient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { cafeId } = useAuth();
  const isEdit = !!ingredient;
  const [form, setForm] = useState({
    name: ingredient?.name ?? '',
    unit: ingredient?.unit ?? 'kg',
    stockQty: ingredient?.stockQty ?? 0,
    pricePerUnit: ingredient?.pricePerUnit ?? 0,
    minStockLevel: ingredient?.minStockLevel ?? 0,
  });

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? api.put(`/cafes/${cafeId}/ingredients/${ingredient!.id}`, form)
        : api.post(`/cafes/${cafeId}/ingredients`, form),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const upd = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={isEdit ? 'Редактировать ингредиент' : 'Новый ингредиент'} onClose={onClose}>
      <Field label="Название">
        <Input value={form.name} onChange={(e) => upd('name', e.target.value)} />
      </Field>
      <Field label="Единица измерения (kg, g, l, pcs)">
        <Input value={form.unit} onChange={(e) => upd('unit', e.target.value)} />
      </Field>
      {!isEdit && (
        <Field label="Начальный остаток">
          <Input
            type="number"
            value={form.stockQty}
            onChange={(e) => upd('stockQty', Number(e.target.value))}
          />
        </Field>
      )}
      <Field label="Цена за единицу, ₸">
        <Input
          type="number"
          value={form.pricePerUnit}
          onChange={(e) => upd('pricePerUnit', Number(e.target.value))}
        />
      </Field>
      <Field label="Минимальный остаток (порог алерта)">
        <Input
          type="number"
          value={form.minStockLevel}
          onChange={(e) => upd('minStockLevel', Number(e.target.value))}
        />
      </Field>
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

function StockForm({
  ingredient,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { cafeId } = useAuth();
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/cafes/${cafeId}/ingredients/${ingredient.id}/stock`, { delta, reason: reason || undefined }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Modal title={`Изменить остаток: ${ingredient.name}`} onClose={onClose}>
      <div className="text-sm text-slate-500 mb-3">
        Текущий остаток: <b>{num(ingredient.stockQty)} {ingredient.unit}</b>
      </div>
      <Field label="Изменение (+ приход / − списание)">
        <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
      </Field>
      <Field label="Причина (необязательно)">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Инвентаризация…" />
      </Field>
      <div className="text-sm mb-2">
        Новый остаток:{' '}
        <b className={ingredient.stockQty + delta < 0 ? 'text-red-600' : 'text-slate-800'}>
          {num(ingredient.stockQty + delta)} {ingredient.unit}
        </b>
      </div>
      {save.error && <ErrorBox error={save.error} />}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || delta === 0}>
          {save.isPending ? 'Сохранение…' : 'Применить'}
        </Button>
      </div>
    </Modal>
  );
}
