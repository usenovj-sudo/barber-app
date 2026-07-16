import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorBox, PageTitle, Spinner } from '../components/ui';
import { PosHall, PosTable, TableStatus, TABLE_STATUS_RU } from '../lib/pos-types';
import { tenge } from '../lib/format';

const STATUS_STYLE: Record<TableStatus, string> = {
  FREE: 'bg-white border-slate-200 hover:border-brand-400',
  OCCUPIED: 'bg-amber-50 border-amber-300 hover:border-amber-400',
  WAITING_PAYMENT: 'bg-red-50 border-red-300 hover:border-red-400',
  RESERVED: 'bg-violet-50 border-violet-300 hover:border-violet-400',
};

const STATUS_DOT: Record<TableStatus, string> = {
  FREE: 'bg-emerald-500',
  OCCUPIED: 'bg-amber-500',
  WAITING_PAYMENT: 'bg-red-500',
  RESERVED: 'bg-violet-500',
};

export function PosTablesPage() {
  const { cafeId } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pos-tables', cafeId],
    queryFn: async () => (await api.get<PosHall[]>(`/cafes/${cafeId}/tables`)).data,
    refetchInterval: 15_000, // keep the floor plan fresh
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div>
      <PageTitle>Залы и столы</PageTitle>
      <div className="space-y-8">
        {data?.map((hall) => (
          <div key={hall.id}>
            <h2 className="text-sm font-medium text-slate-500 mb-3">{hall.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {hall.tables.map((t) => (
                <TableCard key={t.id} table={t} onClick={() => navigate(`/pos/table/${t.id}`)} />
              ))}
            </div>
          </div>
        ))}
        {data?.length === 0 && <div className="text-slate-400 text-sm">Столы не настроены</div>}
      </div>
    </div>
  );
}

function TableCard({ table, onClick }: { table: PosTable; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition shadow-sm ${STATUS_STYLE[table.status]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900">№{table.number}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[table.status]}`} />
      </div>
      <div className="text-xs text-slate-500 mt-1">{TABLE_STATUS_RU[table.status]}</div>
      <div className="text-xs text-slate-400 mt-0.5">до {table.capacity} гостей</div>
      {table.activeOrder && (
        <div className="mt-2 text-sm font-medium text-amber-700">
          {tenge(table.activeOrder.totalAmount)}
        </div>
      )}
    </button>
  );
}
