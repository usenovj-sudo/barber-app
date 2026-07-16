import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, ErrorBox, PageTitle, Spinner, Button } from '../components/ui';
import { dateTime } from '../lib/format';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  diff: unknown;
  createdAt: string;
  user: { id: string; name: string; role: string } | null;
}

interface AuditPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: AuditEntry[];
}

interface Filters {
  entities: string[];
  actions: string[];
}

export function AuditPage() {
  const { cafeId } = useAuth();
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const { data: filters } = useQuery({
    queryKey: ['audit-filters', cafeId],
    queryFn: async () => (await api.get<Filters>(`/cafes/${cafeId}/audit/filters`)).data,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', cafeId, page, entity, action],
    queryFn: async () =>
      (
        await api.get<AuditPage>(`/cafes/${cafeId}/audit`, {
          params: { page, pageSize: 20, entity: entity || undefined, action: action || undefined },
        })
      ).data,
  });

  const reset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  return (
    <div>
      <PageTitle>Журнал аудита</PageTitle>

      <div className="flex gap-3 mb-4">
        <select
          value={entity}
          onChange={(e) => reset(setEntity)(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Все сущности</option>
          {filters?.entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => reset(setAction)(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Все действия</option>
          {filters?.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox error={error} />}

      {data && (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="font-normal px-5 py-3">Время</th>
                  <th className="font-normal px-5 py-3">Пользователь</th>
                  <th className="font-normal px-5 py-3">Действие</th>
                  <th className="font-normal px-5 py-3">Сущность</th>
                  <th className="font-normal px-5 py-3">Изменения</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100 align-top">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                      {dateTime(it.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      {it.user?.name ?? '—'}
                      <div className="text-xs text-slate-400">{it.user?.role}</div>
                    </td>
                    <td className="px-5 py-3">
                      <ActionBadge action={it.action} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">{it.entity}</td>
                    <td className="px-5 py-3">
                      <code className="text-xs text-slate-500 break-all">
                        {it.diff ? JSON.stringify(it.diff) : '—'}
                      </code>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                      Записей нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>
              Всего: {data.total} · стр. {data.page}/{data.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Назад
              </Button>
              <Button
                variant="ghost"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const color =
    action === 'CREATE'
      ? 'bg-emerald-100 text-emerald-700'
      : action === 'DELETE'
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-blue-700';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${color}`}>{action}</span>;
}
