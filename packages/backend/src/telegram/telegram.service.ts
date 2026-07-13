import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const API = 'https://api.telegram.org';

/**
 * Telegram notifications for suppliers. Uses long polling (getUpdates) so it
 * works behind NAT with no public URL. Entirely optional: without
 * TELEGRAM_BOT_TOKEN every method is a graceful no-op.
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  private botUsername: string | null = null;
  private offset = 0;
  private polling = false;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return !!this.token && !this.token.startsWith('changeme');
  }

  async onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.log('Telegram disabled (no TELEGRAM_BOT_TOKEN)');
      return;
    }
    const me = await this.call('getMe');
    this.botUsername = me?.result?.username ?? null;
    this.logger.log(`Telegram bot @${this.botUsername} connected`);
    this.polling = true;
    void this.pollLoop();
  }

  onModuleDestroy() {
    this.polling = false;
  }

  async getBotUsername(): Promise<string | null> {
    if (!this.isEnabled()) return null;
    if (!this.botUsername) {
      const me = await this.call('getMe');
      this.botUsername = me?.result?.username ?? null;
    }
    return this.botUsername;
  }

  // Deep link the supplier taps to bind their chat: t.me/<bot>?start=<code>
  async linkUrl(code: string): Promise<string | null> {
    const bot = await this.getBotUsername();
    return bot ? `https://t.me/${bot}?start=${code}` : null;
  }

  async notifySupplier(supplierId: string, text: string) {
    if (!this.isEnabled()) return;
    const users = await this.prisma.supplierUser.findMany({
      where: { supplierId, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });
    for (const u of users) {
      await this.call('sendMessage', {
        chat_id: u.telegramChatId,
        text,
        parse_mode: 'HTML',
      });
    }
  }

  // ─── Long-polling loop: handles /start <code> to bind a chat ───────────────

  private async pollLoop() {
    while (this.polling) {
      try {
        const res = await this.call('getUpdates', { offset: this.offset, timeout: 30 });
        for (const update of res?.result ?? []) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (err) {
        this.logger.warn(`Telegram poll error: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  private async handleUpdate(update: Record<string, unknown>) {
    const message = update.message as { chat?: { id: number }; text?: string } | undefined;
    const text = message?.text ?? '';
    const chatId = message?.chat?.id;
    if (!chatId) return;

    if (text.startsWith('/start')) {
      const code = text.split(' ')[1]?.trim();
      if (!code) {
        await this.send(chatId, 'Откройте кабинет поставщика и нажмите «Подключить Telegram».');
        return;
      }
      const user = await this.prisma.supplierUser.findFirst({ where: { telegramLinkCode: code } });
      if (!user) {
        await this.send(chatId, '❌ Код не найден или устарел. Сгенерируйте новый в кабинете.');
        return;
      }
      await this.prisma.supplierUser.update({
        where: { id: user.id },
        data: { telegramChatId: String(chatId), telegramLinkCode: null },
      });
      await this.send(chatId, '✅ Уведомления подключены. Вы будете получать новые заявки от кафе.');
    }
  }

  private async send(chatId: number, text: string) {
    await this.call('sendMessage', { chat_id: chatId, text });
  }

  private async call(method: string, body?: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    return res.json();
  }
}
