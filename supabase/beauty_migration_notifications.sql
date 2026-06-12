-- ════════════════════════════════════════════════════════════════
--  BEAUTY — миграция: уведомления (в приложении + WhatsApp)
--  Запустить один раз в SQL Editor проекта Supabase (beauty).
--  Безопасно запускать повторно.
-- ════════════════════════════════════════════════════════════════

-- ── Настройки WhatsApp-уведомлений у мастера ────────────────────
-- whatsapp_notify  — мастер включил уведомления в WhatsApp
-- whatsapp_apikey  — личный ключ CallMeBot (бесплатная отправка в свой WhatsApp)
alter table beauty_masters add column if not exists whatsapp_notify boolean default false;
alter table beauty_masters add column if not exists whatsapp_apikey text default '';

-- ── Живые уведомления в приложении (Supabase Realtime) ──────────
-- Включаем трансляцию новых записей, чтобы кабинет мастера получал
-- уведомление мгновенно, без обновления страницы.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'beauty_bookings'
  ) then
    alter publication supabase_realtime add table beauty_bookings;
  end if;
end $$;
