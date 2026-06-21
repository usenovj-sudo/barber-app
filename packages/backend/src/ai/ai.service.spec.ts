import { AiService } from './ai.service';

type Candidate = Parameters<AiService['scoreSuppliers']>[0][number];

const base: Omit<Candidate, 'price' | 'rating' | 'preferenceScore'> = {
  supplierId: 's',
  supplierName: 'S',
  productName: 'P',
  minOrderQty: 1,
};

describe('AiService.scoreSuppliers', () => {
  const ai = new AiService();

  it('returns empty for no candidates', () => {
    expect(ai.scoreSuppliers([])).toEqual([]);
  });

  it('weights price 40% + rating 40% + preference 20%', () => {
    const [cheap, pricey] = ai.scoreSuppliers([
      { ...base, supplierId: 'cheap', price: 100, rating: 5, preferenceScore: 100 },
      { ...base, supplierId: 'pricey', price: 200, rating: 5, preferenceScore: 100 },
    ]);
    // cheap: priceScore 100, rating 100, pref 100 → 100
    expect(cheap.compositeScore).toBe(100);
    // pricey: priceScore 0, rating 100, pref 100 → 0.4*0 + 0.4*100 + 0.2*100 = 60
    expect(pricey.compositeScore).toBe(60);
  });

  it('gives every candidate full price score when prices are equal', () => {
    const scored = ai.scoreSuppliers([
      { ...base, supplierId: 'a', price: 150, rating: 4, preferenceScore: 50 },
      { ...base, supplierId: 'b', price: 150, rating: 3, preferenceScore: 50 },
    ]);
    // priceScore = 100 for both; a: 0.4*100+0.4*80+0.2*50=82, b: 0.4*100+0.4*60+0.2*50=74
    expect(scored[0].compositeScore).toBe(82);
    expect(scored[1].compositeScore).toBe(74);
  });

  it('ranks the best composite highest', () => {
    const scored = ai
      .scoreSuppliers([
        { ...base, supplierId: 'mid', price: 150, rating: 4, preferenceScore: 60 },
        { ...base, supplierId: 'best', price: 100, rating: 5, preferenceScore: 80 },
        { ...base, supplierId: 'worst', price: 200, rating: 2, preferenceScore: 10 },
      ])
      .sort((a, b) => b.compositeScore - a.compositeScore);
    expect(scored[0].supplierId).toBe('best');
    expect(scored[2].supplierId).toBe('worst');
  });
});
