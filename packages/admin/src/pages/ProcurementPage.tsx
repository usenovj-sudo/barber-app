import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, PageTitle, Spinner } from '../components/ui';
import { tenge, dateTime } from '../lib/format';

type ReqStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'SENT'
  | 'QUOTED'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

interface ReqItem {
  id: string;
  quantity: number;
  unitPrice?: number | null;
  aiScore?: number | null;
  aiReasoning?: string | null;
  ingredient: { name: string; unit: string };
  supplier?: { name: string } | null;
}

interface PurchaseRequest {
  id: string;
  status: ReqStatus;
  aiGenerated: boolean;
  aiJustification?: string | null;
  totalAmount?: number | null;
  createdAt: string;
  items: ReqItem[];
}

interface AiSettings {
  procurementLevel: number;
  isEnabled: boolean;
}

const STATUS_STYLE: Record<ReqStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  SENT: 'bg-blue-100 text-blue-700',
  QUOTED: 'bg-indigo-100 text-indigo-700',
  CONFIRMED: 'bg-violet-100 text-violet-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

const STATUS_RU: Record<ReqStatus, string> = {
  DRAFT: 'Черновик',
  PENDING_APPROVAL: 'На согласовании',
  SENT: 'Отправлена',
  QUOTED: 'Котировка',
  CONFIRMED: 'Подтверждена',
  DELIVERED: 'Доставлена',
  REJECTED: 'Отклонена',
  CANCELLED: 'Отменена',
};

const LEVELS = [
  { level: 1, label: 'Уровень 1', desc: 'Только уведомления' },
  { level: 2, label: 'Уровень 2', desc: 'Черновик на согласование' },
  { level: 3, label: 'Уровень 3', desc: 'Авто-отправка поставщику' },
];

export function ProcurementPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const reqKey = ['procurement-requests', cafeId];
  const [runResult, setRunResult] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['procurement-settings', cafeId],
    queryFn: async () =>
      (await api.get<AiSettings | null>(`/cafes/${cafeId}/procurement/settings`)).data,
  });

  const { data: requests, isLoading, error } = useQuery({
    queryKey: reqKey,
    queryFn: async () =>
      (await api.get<PurchaseRequest[]>(`/cafes/${cafeId}/procurement/requests`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: reqKey });
    queryClient.invalidateQueries({ queryKey: ['procurement-settings', cafeId] });
  };

  const setLevel = useMutation({
    mutationFn: (level: number) => api.patch(`/cafes/${cafeId}/procurement/settings/level`, { level }),
    onSuccess: invalidate,
  });

  const run = useMutation({
    mutationFn: () => api.post(`/cafes/${cafeId}/procurement/run`, {}),
    onSuccess: (res) => {
      const d = res.data as { plan?: { summary?: string }; message?: string };
      setRunResult(d.plan?.summary ?? d.message ?? 'Анализ выполнен');
      invalidate();
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/cafes/${cafeId}/procurement/requests/${id}/approve`, {}),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/cafes/${cafeId}/procurement/requests/${id}/reject`, { reason }),
    onSuccess: invalidate,
  });

  const currentLevel = settings?.procurementLevel ?? 2;

  return (
    <div>
      <PageTitle
        action={
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? '🤖 Анализ…' : '🤖 Запустить AI-анализ'}
          </Button>
        }
      >
        Закупки (AI-агент)
      </PageTitle>

      {/* Autonomy level */}
      <Card className="p-5 mb-5">
        <div className="font-medium mb-3">Уровень автономии агента</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => setLevel.mutate(l.level)}
              disabled={setLevel.isPending}
              className={`text-left rounded-xl border-2 p-4 transition ${
                currentLevel === l.level
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-slate-800">{l.label}</div>
              <div className="text-xs text-slate-500 mt-1">{l.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {runResult && (
        <div className="bg-brand-50 border border-brand-100 text-brand-800 rounded-lg px-4 py-3 text-sm mb-5">
          🤖 {runResult}
        </div>
      )}

      {isLoading && <Spinner />}
      {error && <ErrorBox error={error} />}

      <div className="space-y-4">
        {requests?.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[r.status]}`}>
                    {STATUS_RU[r.status]}
                  </span>
                  {r.aiGenerated && (
                    <span className="text-xs text-brand-600">🤖 AI</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">{dateTime(r.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{tenge(r.totalAmount ?? 0)}</div>
              </div>
            </div>

            {r.aiJustification && (
              <div className="text-sm text-slate-500 italic mb-3">«{r.aiJustification}»</div>
            )}

            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th className="font-normal pb-1">Ингредиент</th>
                  <th className="font-normal pb-1 text-right">Кол-во</th>
                  <th className="font-normal pb-1">Поставщик</th>
                  <th className="font-normal pb-1 text-right">Цена</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="py-1.5">{it.ingredient.name}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {it.quantity} {it.ingredient.unit}
                    </td>
                    <td className="py-1.5">
                      {it.supplier?.name ?? '—'}
                      {it.aiReasoning && (
                        <div className="text-xs text-slate-400">{it.aiReasoning}</div>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {it.unitPrice != null ? tenge(it.unitPrice) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {r.status === 'PENDING_APPROVAL' && (
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const reason = prompt('Причина отклонения:');
                    if (reason) reject.mutate({ id: r.id, reason });
                  }}
                >
                  Отклонить
                </Button>
                <Button onClick={() => approve.mutate(r.id)} disabled={approve.isPending}>
                  Согласовать и отправить
                </Button>
              </div>
            )}
          </Card>
        ))}
        {requests?.length === 0 && (
          <div className="text-slate-400 text-sm text-center py-10">
            Заявок нет. Запустите AI-анализ, чтобы агент проверил остатки.
          </div>
        )}
      </div>
    </div>
  );
}
