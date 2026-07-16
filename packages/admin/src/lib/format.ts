export function tenge(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toLocaleString('ru-RU')} ₸`;
}

export function num(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU');
}

export function pct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n}%`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU');
}

export function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}
