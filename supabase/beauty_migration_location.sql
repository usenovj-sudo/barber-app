-- ════════════════════════════════════════════════════════════════
--  BEAUTY — миграция: геолокация мастера
--  Запустить один раз в SQL Editor. Безопасно запускать повторно.
-- ════════════════════════════════════════════════════════════════
alter table beauty_masters add column if not exists lat  numeric;
alter table beauty_masters add column if not exists lng  numeric;
alter table beauty_masters add column if not exists address         text default '';
alter table beauty_masters add column if not exists address_comment text default '';
