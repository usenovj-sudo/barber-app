import { ReactNode } from 'react';

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-2xl font-semibold text-slate-900">{children}</h1>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'green' | 'blue' | 'amber' | 'red';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-emerald-600'
      : accent === 'amber'
      ? 'text-amber-600'
      : accent === 'red'
      ? 'text-red-600'
      : 'text-slate-900';
  return (
    <Card className="p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accentClass}`}>{value}</div>
      {sub != null && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </Card>
  );
}

export function Spinner({ label = 'Загрузка…' }: { label?: string }) {
  return <div className="text-slate-400 text-sm py-10 text-center">{label}</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const msg =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (error as Error)?.message ??
    'Ошибка загрузки';
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
      {String(msg)}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50';
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
