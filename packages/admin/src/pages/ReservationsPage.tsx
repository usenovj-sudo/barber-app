import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Field, Input, Modal, PageTitle, Select, Spinner } from '../components/ui';
import { dateTime } from '../lib/format';

type ResStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED';

interface Reservation {
  id: string;
  date: string;
  guestsCount: number;
  status: ResStatus;
  note?: string | null;
  table?: { number: number; hall?: { name: string } | null } | null;
  client?: { id: string; name: string; phone?: string | null } | null;
}

const STATUS_STYLE: Record<ResStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SEATED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_RU: Record<ResStatus, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждена',
  SEATED: 'Гость за столом',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

// Allowed next states drive the action buttons
const NEXT: Record<ResStatus, ResStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SEATED', 'CANCELLED'],
  SEATED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ReservationsPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayStr());
  const [addOpen, setAddOpen] = useState(false);
  const key = ['reservations', cafeId, date];

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<Reservation[]>(`/cafes/${cafeId}/reservations`, { params: { date } })).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reservations', cafeId] });

  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ResStatus }) =>
      api.patch(`/cafes/${cafeId}/reservations/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  return (
    <div>
      <PageTitle action={<Button onClick={() => setAddOpen(true)}>+ Бронь</Button>}>Брони</PageTitle>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-500">Дата:</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox error={error} />}

      {data && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="font-normal px-5 py-3">Время</th>
                <th className="font-normal px-5 py-3">Стол</th>
                <th className="font-normal px-5 py-3">Гостей</th>
                <th className="font-normal px-5 py-3">Клиент</th>
                <th className="font-normal px-5 py-3">Статус</th>
                <th className="font-normal px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 whitespace-nowrap">{dateTime(r.date)}</td>
                  <td className="px-5 py-3">
                    {r.table ? `№${r.table.number}` : '—'}
                    {r.table?.hall?.name && (
                      <span className="text-xs text-slate-400"> · {r.table.hall.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{r.guestsCount}</td>
                  <td className="px-5 py-3">
                    {r.client?.name ?? '—'}
                    {r.client?.phone && <div className="text-xs text-slate-400">{r.client.phone}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[r.status]}`}>
                      {STATUS_RU[r.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {NEXT[r.status].map((s) => (
                      <button
                        key={s}
                        onClick={() => transition.mutate({ id: r.id, status: s })}
                        className={`text-xs hover:underline ml-3 ${
                          s === 'CANCELLED' ? 'text-red-500' : 'text-brand-600'
                        }`}
                      >
                        {STATUS_RU[s]}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    Броней на эту дату нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {addOpen && <ReservationForm onClose={() => setAddOpen(false)} onSaved={invalidate} />}
    </div>
  );
}

interface AvailableTable {
  id: string;
  number: number;
  capacity: number;
  hall?: { name: string } | null;
}

function ReservationForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { cafeId } = useAuth();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [guests, setGuests] = useState(2);
  const [tableId, setTableId] = useState('');
  const [available, setAvailable] = useState<AvailableTable[] | null>(null);

  const isoDate = date ? new Date(`${date}T${time}:00`).toISOString() : '';

  const check = useMutation({
    mutationFn: async () =>
      (
        await api.get<{ availableTables: AvailableTable[] }>(
          `/cafes/${cafeId}/reservations/availability`,
          { params: { date: isoDate, guests } },
        )
      ).data,
    onSuccess: (d) => {
      setAvailable(d.availableTables);
      setTableId(d.availableTables[0]?.id ?? '');
    },
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/cafes/${cafeId}/reservations`, { tableId, date: isoDate, guestsCount: guests }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Modal title="Новая бронь" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Время">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Гостей">
        <Input
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
        />
      </Field>

      <Button variant="ghost" onClick={() => check.mutate()} disabled={!date || check.isPending}>
        {check.isPending ? 'Проверка…' : 'Проверить доступность'}
      </Button>

      {available && (
        <div className="mt-4">
          {available.length === 0 ? (
            <div className="text-sm text-red-600">Нет свободных столов на это время</div>
          ) : (
            <Field label="Свободные столы">
              <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>
                    №{t.number} · до {t.capacity} гостей{t.hall?.name ? ` · ${t.hall.name}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      )}

      {create.error && <ErrorBox error={create.error} />}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={() => create.mutate()} disabled={!tableId || create.isPending}>
          {create.isPending ? 'Создание…' : 'Забронировать'}
        </Button>
      </div>
    </Modal>
  );
}
