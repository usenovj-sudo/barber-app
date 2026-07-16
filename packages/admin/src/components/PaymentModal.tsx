import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { tenge } from '../lib/format';
import { Button } from './ui';

type Method = 'CASH' | 'CARD' | 'QR';

const METHODS: { key: Method; label: string }[] = [
  { key: 'CASH', label: '💵 Наличные' },
  { key: 'CARD', label: '💳 Карта' },
  { key: 'QR', label: '📱 QR' },
];

export function PaymentModal({
  orderId,
  total,
  onClose,
  onPaid,
}: {
  orderId: string;
  total: number;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { cafeId } = useAuth();
  const [method, setMethod] = useState<Method>('CASH');
  const [discount, setDiscount] = useState(0);

  const pay = useMutation({
    mutationFn: () =>
      api.post(`/cafes/${cafeId}/orders/${orderId}/pay`, {
        method,
        discountAmount: discount || undefined,
      }),
    onSuccess: onPaid,
  });

  const finalAmount = Math.max(0, total - discount);
  const errMsg =
    (pay.error as { response?: { data?: { message?: string } } })?.response?.data?.message;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Оплата заказа</h2>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <Row label="Сумма заказа" value={tenge(total)} />
          {discount > 0 && <Row label="Скидка" value={`− ${tenge(discount)}`} />}
          <div className="border-t border-slate-200 mt-2 pt-2">
            <Row label="К оплате" value={tenge(finalAmount)} bold />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-slate-600 mb-2">Способ оплаты</div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`py-3 rounded-lg border-2 text-sm font-medium transition ${
                  method === m.key
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-sm text-slate-600">Скидка, ₸</span>
          <input
            type="number"
            min={0}
            max={total}
            value={discount || ''}
            onChange={(e) => setDiscount(Math.min(total, Math.max(0, Number(e.target.value))))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="0"
          />
        </label>

        {errMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">
            {String(errMsg)}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => pay.mutate()} disabled={pay.isPending}>
            {pay.isPending ? 'Оплата…' : `Принять ${tenge(finalAmount)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-700'}>{value}</span>
    </div>
  );
}
