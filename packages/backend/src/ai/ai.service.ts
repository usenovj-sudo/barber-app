import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';

// Weekday index 0=Monday … 6=Sunday
export const WEEKDAY_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Per-dish average portions sold on each weekday (0=Mon … 6=Sun)
export interface DishWeekdaySales {
  dishId: string;
  dishName: string;
  avgByWeekday: number[]; // length 7 — forecast/expected portions per weekday
}

export interface DemandForecast {
  summary: string;
  forecast: DishWeekdaySales[];
  insights: string[];
}

export interface IngredientAnalysis {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  parLevel: number;
  leadTimeDays: number;
  safetyStockPct: number;
  avgDailyUsage: number;
  reorderPoint: number;
  daysUntilStockout: number;
  neededQty: number;
  candidates: SupplierCandidate[];
}

export interface SupplierCandidate {
  supplierId: string;
  supplierName: string;
  productName: string;
  price: number;
  rating: number;
  preferenceScore: number;
  minOrderQty: number;
  compositeScore: number;
}

export interface ProcurementItem {
  ingredientId: string;
  ingredientName: string;
  selectedSupplierId: string | null;
  quantity: number;
  unitPrice: number | null;
  reasoning: string;
  aiScore: number;
  urgency: 'CRITICAL' | 'HIGH' | 'NORMAL';
  alternativeQuotes: SupplierCandidate[];
}

export interface AgentProcurementPlan {
  items: ProcurementItem[];
  summary: string;
  totalEstimatedAmount: number;
}

// ─── AI menu / dish generation ──────────────────────────────────────────────

export interface GeneratedIngredient {
  name: string;
  unit: string; // kg | l | pcs | g …
  quantity: number; // per 1 portion, in `unit`
  estimatedPricePerUnit: number; // ₸ per unit — a starting guess the admin can edit
}

export interface GeneratedDish {
  name: string;
  description: string;
  section: string; // hot | cold | bar | dessert
  suggestedPrice: number; // ₸
  ingredients: GeneratedIngredient[];
  source: 'ai' | 'rules'; // where the recipe came from (honest to the admin)
  note: string;
}

// Ingredient the caller already has, so generation can reuse names/units
export interface ExistingIngredient {
  name: string;
  unit: string;
  pricePerUnit: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ─── Score supplier (price 40% + rating 40% + preference 20%) ────────────

  scoreSuppliers(candidates: Omit<SupplierCandidate, 'compositeScore'>[]): SupplierCandidate[] {
    if (!candidates.length) return [];

    const prices = candidates.map((c) => c.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    return candidates.map((c) => {
      const priceScore = priceRange === 0 ? 100 : 100 * (1 - (c.price - minPrice) / priceRange);
      const ratingScore = c.rating * 20; // 0-5 → 0-100
      const prefScore = c.preferenceScore; // 0-100
      const compositeScore = 0.4 * priceScore + 0.4 * ratingScore + 0.2 * prefScore;
      return { ...c, compositeScore: Math.round(compositeScore * 10) / 10 };
    });
  }

  // ─── Main AI procurement plan via Claude ─────────────────────────────────

  async generateProcurementPlan(
    cafeName: string,
    ingredients: IngredientAnalysis[],
  ): Promise<AgentProcurementPlan> {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-placeholder')) {
      this.logger.warn('No real ANTHROPIC_API_KEY — using rule-based fallback');
      return this.ruleBasedPlan(ingredients);
    }

    const systemPrompt = `Ты — AI-агент закупок для кафе "${cafeName}".
Твоя задача: проанализировать остатки и выбрать оптимального поставщика для каждой позиции.
Критерии выбора: compositeScore (уже посчитан) — выбирай поставщика с наивысшим score.
При равенстве score отдавай приоритет более низкой цене.
Отвечай ТОЛЬКО через инструмент create_procurement_plan, без лишнего текста.`;

    const userMessage = `Текущая дата: ${new Date().toLocaleDateString('ru-RU')}.
Ингредиенты, требующие закупки:
${JSON.stringify(ingredients, null, 2)}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: systemPrompt,
        tools: [
          {
            name: 'create_procurement_plan',
            description: 'Создать план закупок с обоснованием выбора поставщика',
            input_schema: {
              type: 'object' as const,
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      ingredientId: { type: 'string' },
                      ingredientName: { type: 'string' },
                      selectedSupplierId: { type: ['string', 'null'] },
                      quantity: { type: 'number' },
                      unitPrice: { type: ['number', 'null'] },
                      reasoning: { type: 'string', description: 'Краткое обоснование выбора (1-2 предложения)' },
                      aiScore: { type: 'number', description: 'Оценка уверенности 0-100' },
                      urgency: { type: 'string', enum: ['CRITICAL', 'HIGH', 'NORMAL'] },
                    },
                    required: ['ingredientId', 'ingredientName', 'selectedSupplierId', 'quantity', 'unitPrice', 'reasoning', 'aiScore', 'urgency'],
                  },
                },
                summary: { type: 'string', description: 'Краткое резюме плана закупок (1-2 предложения)' },
                totalEstimatedAmount: { type: 'number' },
              },
              required: ['items', 'summary', 'totalEstimatedAmount'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'create_procurement_plan' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolUse = response.content.find((c) => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool_use in Claude response');
      }

      const plan = toolUse.input as AgentProcurementPlan;

      // Attach alternative quotes from analysis
      return {
        ...plan,
        items: plan.items.map((item) => {
          const analysis = ingredients.find((i) => i.id === item.ingredientId);
          return {
            ...item,
            alternativeQuotes: analysis?.candidates ?? [],
          };
        }),
      };
    } catch (err) {
      this.logger.error('Claude API error, falling back to rule-based:', err);
      return this.ruleBasedPlan(ingredients);
    }
  }

  // ─── Rule-based fallback when no API key ─────────────────────────────────

  private ruleBasedPlan(ingredients: IngredientAnalysis[]): AgentProcurementPlan {
    const items: ProcurementItem[] = ingredients.map((ing) => {
      const best = ing.candidates.sort((a, b) => b.compositeScore - a.compositeScore)[0] ?? null;
      const urgency =
        ing.daysUntilStockout <= 1 ? 'CRITICAL' : ing.daysUntilStockout <= 3 ? 'HIGH' : 'NORMAL';

      return {
        ingredientId: ing.id,
        ingredientName: ing.name,
        selectedSupplierId: best?.supplierId ?? null,
        quantity: Math.max(ing.neededQty, best?.minOrderQty ?? 0),
        unitPrice: best?.price ?? null,
        reasoning: best
          ? `Выбран "${best.supplierName}" — лучший compositeScore (${best.compositeScore.toFixed(1)}): цена ${best.price}₸/${ing.unit}, рейтинг ${best.rating}/5.`
          : 'Поставщик не найден, требуется ручной выбор.',
        aiScore: best?.compositeScore ?? 0,
        urgency,
        alternativeQuotes: ing.candidates,
      };
    });

    const total = items.reduce(
      (sum, i) => sum + (i.unitPrice ?? 0) * i.quantity,
      0,
    );

    const critical = items.filter((i) => i.urgency === 'CRITICAL').map((i) => i.ingredientName);

    return {
      items,
      summary: critical.length
        ? `Критичный уровень запасов: ${critical.join(', ')}. Рекомендуется срочная закупка ${items.length} позиций на ~${Math.round(total).toLocaleString('ru')}₸.`
        : `Рекомендуется плановая закупка ${items.length} позиций на ~${Math.round(total).toLocaleString('ru')}₸.`,
      totalEstimatedAmount: Math.round(total),
    };
  }

  // ─── Demand forecast by day of week ───────────────────────────────────────

  async forecastDemand(
    cafeName: string,
    history: DishWeekdaySales[],
  ): Promise<DemandForecast> {
    // Rule-based numeric forecast: expected portions per weekday = historical average.
    const base = this.ruleBasedForecast(history);

    if (
      !process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-placeholder') ||
      history.length === 0
    ) {
      return base;
    }

    // With a real key, ask Claude to add narrative insights on top of the numbers.
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: `Ты — аналитик спроса кафе "${cafeName}". По истории продаж (порции по дням недели)
дай краткие практичные выводы: какие блюда готовить больше в какие дни, где пик спроса,
какие позиции слабые. Отвечай ТОЛЬКО через инструмент demand_insights.`,
        tools: [
          {
            name: 'demand_insights',
            description: 'Выводы по спросу',
            input_schema: {
              type: 'object' as const,
              properties: {
                summary: { type: 'string', description: 'Резюме в 1-2 предложения' },
                insights: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-5 конкретных рекомендаций',
                },
              },
              required: ['summary', 'insights'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'demand_insights' },
        messages: [
          {
            role: 'user',
            content: `Дни недели: 0=Пн … 6=Вс. Продажи по блюдам:\n${JSON.stringify(history, null, 2)}`,
          },
        ],
      });
      const toolUse = response.content.find((c) => c.type === 'tool_use');
      if (toolUse && toolUse.type === 'tool_use') {
        const out = toolUse.input as { summary: string; insights: string[] };
        return { ...base, summary: out.summary, insights: out.insights };
      }
      return base;
    } catch (err) {
      this.logger.error('Claude demand forecast error, using rule-based:', err);
      return base;
    }
  }

  private ruleBasedForecast(history: DishWeekdaySales[]): DemandForecast {
    const totalWeek = history.reduce(
      (s, d) => s + d.avgByWeekday.reduce((a, b) => a + b, 0),
      0,
    );
    // Find the busiest weekday across all dishes
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
    for (const d of history) {
      d.avgByWeekday.forEach((v, i) => (weekdayTotals[i] += v));
    }
    const peakIdx = weekdayTotals.indexOf(Math.max(...weekdayTotals));
    const topDish = [...history].sort(
      (a, b) =>
        b.avgByWeekday.reduce((x, y) => x + y, 0) - a.avgByWeekday.reduce((x, y) => x + y, 0),
    )[0];

    const insights: string[] = [];
    if (history.length) {
      insights.push(
        `Пик спроса — ${WEEKDAY_RU[peakIdx]} (~${Math.round(weekdayTotals[peakIdx])} порц./день). Готовьте запас заранее.`,
      );
      if (topDish) {
        insights.push(
          `Самое ходовое блюдо — «${topDish.dishName}» (~${Math.round(
            topDish.avgByWeekday.reduce((a, b) => a + b, 0),
          )} порц./нед).`,
        );
      }
      const weak = history.filter(
        (d) => d.avgByWeekday.reduce((a, b) => a + b, 0) < 1,
      );
      if (weak.length) {
        insights.push(
          `Слабые позиции (<1 порц./нед): ${weak.map((d) => d.dishName).join(', ')} — пересмотрите меню/цену.`,
        );
      }
    }

    return {
      summary: history.length
        ? `Прогноз на неделю: ~${Math.round(totalWeek)} порций. Пик — ${WEEKDAY_RU[peakIdx]}.`
        : 'Недостаточно данных о продажах для прогноза. Нужна история оплаченных заказов.',
      forecast: history,
      insights,
    };
  }

  // ─── Generate a dish + its recipe from a name ─────────────────────────────

  async generateDish(
    cafeName: string,
    dishName: string,
    existing: ExistingIngredient[],
  ): Promise<GeneratedDish> {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-placeholder')) {
      this.logger.warn('No real ANTHROPIC_API_KEY — using rule-based dish generation');
      return this.ruleBasedDish(dishName, existing);
    }

    const systemPrompt = `Ты — шеф-повар и технолог кафе "${cafeName}".
По названию блюда составь технологическую карту: описание, кухонная секция (hot/cold/bar/dessert),
разумная цена продажи в тенге (₸) и список ингредиентов с количеством НА ОДНУ ПОРЦИЮ.
Единицы: kg, l, pcs, g. Если у кафе уже есть похожий ингредиент — используй его точное название и единицу.
Отвечай ТОЛЬКО через инструмент create_dish.`;

    const userMessage = `Блюдо: "${dishName}".
Ингредиенты, которые уже есть у кафе (используй их названия/единицы, где подходит):
${existing.length ? JSON.stringify(existing, null, 2) : '(пока нет своих ингредиентов)'}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [
          {
            name: 'create_dish',
            description: 'Создать блюдо с рецептом (ингредиенты на 1 порцию)',
            input_schema: {
              type: 'object' as const,
              properties: {
                name: { type: 'string' },
                description: { type: 'string', description: 'Короткое аппетитное описание (1 предложение)' },
                section: { type: 'string', enum: ['hot', 'cold', 'bar', 'dessert'] },
                suggestedPrice: { type: 'number', description: 'Цена продажи в ₸' },
                ingredients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      unit: { type: 'string', enum: ['kg', 'l', 'pcs', 'g'] },
                      quantity: { type: 'number', description: 'Количество на 1 порцию' },
                      estimatedPricePerUnit: { type: 'number', description: 'Ориентировочная цена за единицу, ₸' },
                    },
                    required: ['name', 'unit', 'quantity', 'estimatedPricePerUnit'],
                  },
                },
                note: { type: 'string', description: 'Замечание повару (1 предложение)' },
              },
              required: ['name', 'description', 'section', 'suggestedPrice', 'ingredients', 'note'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'create_dish' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolUse = response.content.find((c) => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool_use in Claude response');
      }
      const out = toolUse.input as Omit<GeneratedDish, 'source'>;
      return { ...out, source: 'ai' };
    } catch (err) {
      this.logger.error('Claude dish generation error, using rule-based:', err);
      return this.ruleBasedDish(dishName, existing);
    }
  }

  // Rule-based recipe knowledge base — runs when no ANTHROPIC_API_KEY is set.
  private ruleBasedDish(dishName: string, existing: ExistingIngredient[]): GeneratedDish {
    const q = dishName.trim().toLowerCase();

    // Each template: keywords that match the dish name → base recipe (per portion).
    type Tpl = {
      keys: string[];
      section: string;
      ingredients: GeneratedIngredient[];
    };
    const KB: Tpl[] = [
      { keys: ['плов', 'palov', 'osh'], section: 'hot', ingredients: [
        { name: 'Рис', unit: 'kg', quantity: 0.15, estimatedPricePerUnit: 350 },
        { name: 'Баранина', unit: 'kg', quantity: 0.12, estimatedPricePerUnit: 3200 },
        { name: 'Морковь', unit: 'kg', quantity: 0.08, estimatedPricePerUnit: 120 },
        { name: 'Лук', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 100 },
        { name: 'Масло растительное', unit: 'l', quantity: 0.03, estimatedPricePerUnit: 800 },
      ]},
      { keys: ['лагман', 'lagman'], section: 'hot', ingredients: [
        { name: 'Мука', unit: 'kg', quantity: 0.12, estimatedPricePerUnit: 200 },
        { name: 'Говядина', unit: 'kg', quantity: 0.1, estimatedPricePerUnit: 2600 },
        { name: 'Морковь', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 120 },
        { name: 'Перец болгарский', unit: 'kg', quantity: 0.04, estimatedPricePerUnit: 500 },
        { name: 'Лук', unit: 'kg', quantity: 0.04, estimatedPricePerUnit: 100 },
      ]},
      { keys: ['манты', 'manty'], section: 'hot', ingredients: [
        { name: 'Мука', unit: 'kg', quantity: 0.12, estimatedPricePerUnit: 200 },
        { name: 'Фарш', unit: 'kg', quantity: 0.1, estimatedPricePerUnit: 2400 },
        { name: 'Лук', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 100 },
      ]},
      { keys: ['шашлык', 'шашлик', 'kebab', 'кебаб', 'шаурма', 'shaurma'], section: 'hot', ingredients: [
        { name: 'Мясо', unit: 'kg', quantity: 0.25, estimatedPricePerUnit: 2800 },
        { name: 'Лук', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 100 },
      ]},
      { keys: ['борщ', 'borsch', 'суп', 'soup', 'шурпа', 'shurpa'], section: 'hot', ingredients: [
        { name: 'Говядина', unit: 'kg', quantity: 0.08, estimatedPricePerUnit: 2600 },
        { name: 'Картофель', unit: 'kg', quantity: 0.1, estimatedPricePerUnit: 90 },
        { name: 'Морковь', unit: 'kg', quantity: 0.04, estimatedPricePerUnit: 120 },
        { name: 'Капуста', unit: 'kg', quantity: 0.06, estimatedPricePerUnit: 90 },
        { name: 'Лук', unit: 'kg', quantity: 0.03, estimatedPricePerUnit: 100 },
      ]},
      { keys: ['оливье', 'olivie', 'салат', 'salad', 'цезарь', 'caesar'], section: 'cold', ingredients: [
        { name: 'Картофель', unit: 'kg', quantity: 0.08, estimatedPricePerUnit: 90 },
        { name: 'Морковь', unit: 'kg', quantity: 0.03, estimatedPricePerUnit: 120 },
        { name: 'Яйцо', unit: 'pcs', quantity: 1, estimatedPricePerUnit: 60 },
        { name: 'Майонез', unit: 'l', quantity: 0.03, estimatedPricePerUnit: 900 },
        { name: 'Курица', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 1400 },
      ]},
      { keys: ['пицца', 'pizza'], section: 'hot', ingredients: [
        { name: 'Мука', unit: 'kg', quantity: 0.2, estimatedPricePerUnit: 200 },
        { name: 'Сыр', unit: 'kg', quantity: 0.1, estimatedPricePerUnit: 3500 },
        { name: 'Томатный соус', unit: 'l', quantity: 0.05, estimatedPricePerUnit: 700 },
      ]},
      { keys: ['бургер', 'burger', 'гамбургер'], section: 'hot', ingredients: [
        { name: 'Булка', unit: 'pcs', quantity: 1, estimatedPricePerUnit: 120 },
        { name: 'Котлета', unit: 'pcs', quantity: 1, estimatedPricePerUnit: 400 },
        { name: 'Сыр', unit: 'kg', quantity: 0.02, estimatedPricePerUnit: 3500 },
        { name: 'Овощи', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 400 },
      ]},
      { keys: ['паста', 'pasta', 'спагетти', 'spaghetti', 'макарон'], section: 'hot', ingredients: [
        { name: 'Паста', unit: 'kg', quantity: 0.12, estimatedPricePerUnit: 400 },
        { name: 'Соус', unit: 'l', quantity: 0.08, estimatedPricePerUnit: 700 },
        { name: 'Сыр', unit: 'kg', quantity: 0.02, estimatedPricePerUnit: 3500 },
      ]},
      { keys: ['чай', 'tea', 'çay'], section: 'bar', ingredients: [
        { name: 'Чай', unit: 'kg', quantity: 0.005, estimatedPricePerUnit: 6000 },
        { name: 'Сахар', unit: 'kg', quantity: 0.02, estimatedPricePerUnit: 400 },
      ]},
      { keys: ['кофе', 'coffee', 'капучино', 'латте', 'эспрессо', 'americano', 'американо'], section: 'bar', ingredients: [
        { name: 'Кофе', unit: 'kg', quantity: 0.012, estimatedPricePerUnit: 9000 },
        { name: 'Молоко', unit: 'l', quantity: 0.15, estimatedPricePerUnit: 500 },
      ]},
      { keys: ['сок', 'juice', 'лимонад', 'lemonade', 'компот', 'морс'], section: 'bar', ingredients: [
        { name: 'Сок концентрат', unit: 'l', quantity: 0.05, estimatedPricePerUnit: 1200 },
        { name: 'Вода', unit: 'l', quantity: 0.2, estimatedPricePerUnit: 50 },
        { name: 'Сахар', unit: 'kg', quantity: 0.01, estimatedPricePerUnit: 400 },
      ]},
      { keys: ['торт', 'десерт', 'dessert', 'пирожное', 'чизкейк', 'cake'], section: 'dessert', ingredients: [
        { name: 'Мука', unit: 'kg', quantity: 0.08, estimatedPricePerUnit: 200 },
        { name: 'Сахар', unit: 'kg', quantity: 0.05, estimatedPricePerUnit: 400 },
        { name: 'Яйцо', unit: 'pcs', quantity: 2, estimatedPricePerUnit: 60 },
        { name: 'Масло сливочное', unit: 'kg', quantity: 0.04, estimatedPricePerUnit: 3000 },
      ]},
    ];

    const tpl = KB.find((t) => t.keys.some((k) => q.includes(k)));

    // Snap a generated ingredient to an existing cafe ingredient (same name) so
    // we reuse its unit & real price instead of creating a duplicate.
    const snap = (ing: GeneratedIngredient): GeneratedIngredient => {
      const match = existing.find((e) => e.name.toLowerCase() === ing.name.toLowerCase());
      return match
        ? { ...ing, unit: match.unit, estimatedPricePerUnit: match.pricePerUnit || ing.estimatedPricePerUnit }
        : ing;
    };

    const ingredients = (tpl
      ? tpl.ingredients
      : [
          // Unknown dish → honest generic skeleton the admin fills in.
          { name: 'Основной ингредиент', unit: 'kg', quantity: 0.15, estimatedPricePerUnit: 1000 },
          { name: 'Гарнир', unit: 'kg', quantity: 0.1, estimatedPricePerUnit: 300 },
          { name: 'Специи и масло', unit: 'kg', quantity: 0.02, estimatedPricePerUnit: 800 },
        ]
    ).map(snap);

    const cost = ingredients.reduce((s, i) => s + i.quantity * i.estimatedPricePerUnit, 0);
    // Suggest a price at ~3× food cost, rounded up to the nearest 50 ₸.
    const suggestedPrice = Math.max(50, Math.ceil((cost * 3) / 50) * 50);

    const name = dishName.trim().replace(/^./, (c) => c.toUpperCase());
    return {
      name,
      description: tpl ? `${name} — по классическому рецепту.` : `${name}.`,
      section: tpl?.section ?? 'hot',
      suggestedPrice,
      ingredients,
      source: 'rules',
      note: tpl
        ? 'Рецепт по базовой рецептуре — проверьте количество ингредиентов и цену под своё кафе.'
        : 'Блюдо не распознано — задан черновой состав. Отредактируйте ингредиенты и количество под свой рецепт.',
    };
  }
}
