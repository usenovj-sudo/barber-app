import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Field, Input, PageTitle, Spinner } from '../components/ui';
import { tenge, dateTime } from '../lib/format';

interface Shift {
  id: string;
  openedAt: string;
  closedAt?: string | null;
  openingBalance: number;
  actualAmount?: number | null;
  expectedAmount?: number | null;
  discrepancy?: number | null;
  cashier?: { id: string; name: string } | null;
}

export function ShiftsPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();

  const { data: active, isLoading: activeLoading } = useQuery({
    queryKey: ['shift-active', cafeId],
    // 404 when no active shift → treat as null
    queryFn: async () => {
      try {
        return (await api.get<Shift>(`/cafes/${cafeId}/shifts/active`)).data;
      } catch {
        return null;
      }
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts', cafeId],
    queryFn: async () => (await api.get<Shift[]>(`/cafes/${cafeId}/shifts`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shift-active', cafeId] });
    queryClient.invalidateQueries({ queryKey: ['shifts', cafeId] });
  };

  if (activeLoading) return <Spinner />;

  return (
    <div>
      <PageTitle>Смены кассы</PageTitle>

      {active ? (
        <CloseShiftCard shift={active} onDone={invalidate} />
      ) : (
        <OpenShiftCard onDone={invalidate} />
      )}

      <h2 className="text-sm font-medium text-slate-500 mt-8 mb-2">История смен</h2>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="font-normal px-5 py-3">Открыта</th>
              <th className="font-normal px-5 py-3">Закрыта</th>
              <th className="font-normal px-5 py-3">Кассир</th>
              <th className="font-normal px-5 py-3 text-right">Ожидалось</th>
              <th className="font-normal px-5 py-3 text-right">Факт</th>
              <th className="font-normal px-5 py-3 text-right">Расхождение</th>
            </tr>
          </thead>
          <tbody>
            {shifts?.filter((s) => s.closedAt).map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-5 py-3 whitespace-nowrap">{dateTime(s.openedAt)}</td>
                <td className="px-5 py-3 whitespace-nowrap">{s.closedAt ? dateTime(s.closedAt) : '—'}</td>
                <td className="px-5 py-3">{s.cashier?.name ?? '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums">{tenge(s.expectedAmount ?? 0)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{tenge(s.actualAmount ?? 0)}</td>
                <td
                  className={`px-5 py-3 text-right tabular-nums font-medium ${
                    (s.discrepancy ?? 0) < 0
                      ? 'text-red-600'
                      : (s.discrepancy ?? 0) > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {(s.discrepancy ?? 0) > 0 ? '+' : ''}
                  {tenge(s.discrepancy ?? 0)}
                </td>
              </tr>
            ))}
            {shifts?.filter((s) => s.closedAt).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                  Закрытых смен пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function OpenShiftCard({ onDone }: { onDone: () => void }) {
  const { cafeId } = useAuth();
  const [opening, setOpening] = useState(0);
  const open = useMutation({
    mutationFn: () => api.post(`/cafes/${cafeId}/shifts/open`, { openingBalance: opening }),
    onSuccess: onDone,
  });

  return (
    <Card className="p-5 max-w-md">
      <div className="font-medium mb-1">Смена не открыта</div>
      <p className="text-sm text-slate-500 mb-4">Откройте смену, чтобы начать приём оплат.</p>
      <Field label="Начальный остаток в кассе, ₸">
        <Input type="number" value={opening} onChange={(e) => setOpening(Number(e.target.value))} />
      </Field>
      {open.error && <ErrorBox error={open.error} />}
      <Button onClick={() => open.mutate()} disabled={open.isPending}>
        {open.isPending ? 'Открытие…' : 'Открыть смену'}
      </Button>
    </Card>
  );
}

function CloseShiftCard({ shift, onDone }: { shift: Shift; onDone: () => void }) {
  const { cafeId } = useAuth();
  const [actual, setActual] = useState(0);
  const [notes, setNotes] = useState('');
  const close = useMutation({
    mutationFn: () =>
      api.patch(`/cafes/${cafeId}/shifts/${shift.id}/close`, {
        actualAmount: actual,
        notes: notes || undefined,
      }),
    onSuccess: onDone,
  });

  return (
    <Card className="p-5 max-w-md border-emerald-300 bg-emerald-50/40">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-emerald-800">● Смена открыта</span>
        <span className="text-xs text-slate-500">{dateTime(shift.openedAt)}</span>
      </div>
      <div className="text-sm text-slate-600 mb-4">
        Кассир: {shift.cashier?.name ?? '—'} · Начальный остаток: {tenge(shift.openingBalance)}
      </div>
      <Field label="Фактическая сумма в кассе при закрытии, ₸">
        <Input type="number" value={actual} onChange={(e) => setActual(Number(e.target.value))} />
      </Field>
      <Field label="Заметка (необязательно)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Всё сошлось" />
      </Field>
      {close.error && <ErrorBox error={close.error} />}
      <Button onClick={() => close.mutate()} disabled={close.isPending}>
        {close.isPending ? 'Закрытие…' : 'Закрыть смену'}
      </Button>
    </Card>
  );
}
