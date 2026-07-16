import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, ErrorBox, PageTitle, Spinner } from '../components/ui';
import { num } from '../lib/format';

interface SupplierProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
  contactInfo?: string | null;
  region?: string | null;
  rating: number;
  reviewCount: number;
  products: SupplierProduct[];
}

interface CafeSupplier {
  id: string; // link id
  supplierId: string;
  isFavorite: boolean;
  supplier: Supplier;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-500" title={`${rating}/5`}>
      {'★'.repeat(full)}
      <span className="text-slate-200">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export function SuppliersPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const key = ['suppliers', cafeId];

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<CafeSupplier[]>(`/cafes/${cafeId}/suppliers`)).data,
  });

  const favorite = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.patch(`/cafes/${cafeId}/suppliers/${id}/favorite`, { isFavorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div>
      <PageTitle>Поставщики</PageTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((cs) => (
          <Card key={cs.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-800">{cs.supplier.name}</div>
                <div className="text-xs text-slate-400">
                  {cs.supplier.region ?? ''}
                  {cs.supplier.contactInfo ? ` · ${cs.supplier.contactInfo}` : ''}
                </div>
                <div className="mt-1 text-sm">
                  <Stars rating={cs.supplier.rating} />{' '}
                  <span className="text-slate-400 text-xs">({cs.supplier.reviewCount} отз.)</span>
                </div>
              </div>
              <button
                onClick={() => favorite.mutate({ id: cs.supplierId, isFavorite: !cs.isFavorite })}
                title={cs.isFavorite ? 'Убрать из избранного' : 'В избранное'}
                className={`text-xl ${cs.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
              >
                {cs.isFavorite ? '★' : '☆'}
              </button>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-400 mb-1">
                Каталог ({cs.supplier.products.length})
              </div>
              <ul className="text-sm space-y-0.5">
                {cs.supplier.products.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="text-slate-600">{p.name}</span>
                    <span className="tabular-nums text-slate-500">
                      {num(p.price)} ₸/{p.unit}
                    </span>
                  </li>
                ))}
                {cs.supplier.products.length > 5 && (
                  <li className="text-xs text-slate-400">…ещё {cs.supplier.products.length - 5}</li>
                )}
              </ul>
            </div>
          </Card>
        ))}
        {data?.length === 0 && <div className="text-slate-400 text-sm">Поставщики не подключены</div>}
      </div>
    </div>
  );
}
