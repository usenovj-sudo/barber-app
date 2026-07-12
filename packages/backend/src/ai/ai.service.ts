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
}
