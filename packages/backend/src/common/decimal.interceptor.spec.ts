import { of, lastValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { CallHandler } from '@nestjs/common';
import { DecimalInterceptor } from './decimal.interceptor';

function run(data: unknown) {
  const interceptor = new DecimalInterceptor();
  const next: CallHandler = { handle: () => of(data) };
  return lastValueFrom(interceptor.intercept({} as never, next));
}

describe('DecimalInterceptor', () => {
  it('converts a top-level Decimal to a number', async () => {
    const out = await run(new Prisma.Decimal('12.50'));
    expect(out).toBe(12.5);
  });

  it('converts Decimals nested in objects and arrays', async () => {
    const out = (await run({
      total: new Prisma.Decimal('100'),
      items: [{ price: new Prisma.Decimal('2800'), qty: 2 }],
    })) as { total: number; items: { price: number; qty: number }[] };
    expect(out.total).toBe(100);
    expect(out.items[0].price).toBe(2800);
    expect(out.items[0].qty).toBe(2);
  });

  it('leaves Dates, nulls, and primitives untouched', async () => {
    const d = new Date('2026-06-21T00:00:00.000Z');
    const out = (await run({ when: d, nothing: null, name: 'x', n: 5 })) as Record<string, unknown>;
    expect(out.when).toBe(d);
    expect(out.nothing).toBeNull();
    expect(out.name).toBe('x');
    expect(out.n).toBe(5);
  });

  it('passes through undefined (e.g. @Res handlers)', async () => {
    expect(await run(undefined)).toBeUndefined();
  });
});
