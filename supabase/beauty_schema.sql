-- ════════════════════════════════════════════════════════════════
--  BEAUTY BOOKING — схема базы данных (Supabase / Postgres)
--  Запустить один раз в SQL Editor проекта Supabase для beauty.
-- ════════════════════════════════════════════════════════════════

-- Для хэширования паролей
create extension if not exists pgcrypto;

-- ── Мастера (публичные профили) ─────────────────────────────────
create table if not exists beauty_masters (
  id               text primary key,
  name             text not null,
  username         text,
  phone            text,
  specialization   text default 'nails',
  city             text default '',
  bio              text default '',
  photo            text,
  rating           numeric default 0,
  reviews_count    int default 0,
  work_start       text default '09:00',
  work_end         text default '19:00',
  work_days        jsonb default '[1,2,3,4,5,6]',
  deposit_percent  int default 0,
  deposit_required boolean default false,
  self_registered  boolean default true,
  created_at       timestamptz default now()
);

-- ── Аккаунты (приватно: телефон + хэш пароля) ───────────────────
create table if not exists beauty_accounts (
  id            text primary key,
  phone         text unique not null,
  password_hash text not null,
  master_id     text references beauty_masters(id) on delete cascade,
  created_at    timestamptz default now()
);

-- ── Услуги ──────────────────────────────────────────────────────
create table if not exists beauty_services (
  id         text primary key,
  master_id  text not null,
  name       text not null,
  category   text default 'nails',
  price      int default 0,
  duration   int default 60,
  active     boolean default true,
  created_at timestamptz default now()
);

-- ── Портфолио ───────────────────────────────────────────────────
create table if not exists beauty_portfolio (
  id         text primary key,
  master_id  text not null,
  url        text,
  caption    text default '',
  category   text default 'nails',
  created_at timestamptz default now()
);

-- ── Записи ──────────────────────────────────────────────────────
create table if not exists beauty_bookings (
  id               text primary key,
  master_id        text not null,
  client_name      text,
  client_phone     text,
  date             text,
  start_time       text,
  end_time         text,
  service_id       text,
  service_name     text,
  service_price    int default 0,
  deposit_required boolean default false,
  deposit_percent  int default 0,
  deposit_amount   int default 0,
  deposit_paid     int default 0,
  deposit_status   text default 'not_required',
  receipt_url      text,
  status           text default 'awaiting_confirmation',
  comment          text default '',
  created_at       timestamptz default now()
);

-- ── Блокировки времени ──────────────────────────────────────────
create table if not exists beauty_blocks (
  id         text primary key,
  master_id  text not null,
  date       text,
  start_time text,
  end_time   text,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
--  Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table beauty_masters   enable row level security;
alter table beauty_services  enable row level security;
alter table beauty_portfolio enable row level security;
alter table beauty_bookings  enable row level security;
alter table beauty_blocks    enable row level security;
-- Аккаунты: RLS включён, политик НЕТ → прямого доступа по anon-ключу нет.
-- Доступ только через функции beauty_register / beauty_login ниже.
alter table beauty_accounts  enable row level security;

-- Публичные таблицы: открыты для anon-ключа (MVP).
-- (пароли тут НЕ хранятся — они в beauty_accounts, который закрыт)
drop policy if exists p_masters   on beauty_masters;
drop policy if exists p_services  on beauty_services;
drop policy if exists p_portfolio on beauty_portfolio;
drop policy if exists p_bookings  on beauty_bookings;
drop policy if exists p_blocks    on beauty_blocks;
create policy p_masters   on beauty_masters   for all using (true) with check (true);
create policy p_services  on beauty_services  for all using (true) with check (true);
create policy p_portfolio on beauty_portfolio for all using (true) with check (true);
create policy p_bookings  on beauty_bookings  for all using (true) with check (true);
create policy p_blocks    on beauty_blocks    for all using (true) with check (true);

-- ════════════════════════════════════════════════════════════════
--  Функции авторизации (пароль проверяется на сервере)
-- ════════════════════════════════════════════════════════════════
create or replace function beauty_register(
  p_name text, p_phone text, p_password text,
  p_specialization text, p_city text, p_username text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone  text := regexp_replace(p_phone, '\D', '', 'g');
  v_id     text := 'bm' || (extract(epoch from now()) * 1000)::bigint::text;
  v_master beauty_masters;
begin
  if length(v_phone) < 10 then
    return jsonb_build_object('error', 'Введите корректный номер телефона');
  end if;
  if length(coalesce(p_password, '')) < 4 then
    return jsonb_build_object('error', 'Пароль минимум 4 символа');
  end if;
  if coalesce(trim(p_name), '') = '' then
    return jsonb_build_object('error', 'Введите имя');
  end if;
  if exists (select 1 from beauty_accounts where phone = v_phone) then
    return jsonb_build_object('error', 'Этот номер уже зарегистрирован');
  end if;

  insert into beauty_masters (
    id, name, username, phone, specialization, city, bio, photo,
    rating, reviews_count, work_start, work_end, work_days,
    deposit_percent, deposit_required, self_registered)
  values (
    v_id, trim(p_name), coalesce(nullif(p_username, ''), v_id), v_phone,
    coalesce(p_specialization, 'nails'), coalesce(p_city, ''), '',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
    0, 0, '09:00', '19:00', '[1,2,3,4,5,6]', 0, false, true)
  returning * into v_master;

  insert into beauty_accounts (id, phone, password_hash, master_id)
  values (v_id, v_phone, crypt(p_password, gen_salt('bf')), v_id);

  return to_jsonb(v_master);
end;
$$;

create or replace function beauty_login(p_phone text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone  text := regexp_replace(p_phone, '\D', '', 'g');
  v_acc    beauty_accounts;
  v_master beauty_masters;
begin
  select * into v_acc from beauty_accounts where phone = v_phone;
  if v_acc.id is null then
    return jsonb_build_object('error', 'Аккаунт не найден. Зарегистрируйтесь.');
  end if;
  if v_acc.password_hash <> crypt(p_password, v_acc.password_hash) then
    return jsonb_build_object('error', 'Неверный пароль');
  end if;
  select * into v_master from beauty_masters where id = v_acc.master_id;
  return to_jsonb(v_master);
end;
$$;

grant execute on function beauty_register(text, text, text, text, text, text) to anon;
grant execute on function beauty_login(text, text) to anon;

-- ════════════════════════════════════════════════════════════════
--  Демо-мастер (чтобы публичная ссылка-витрина работала сразу)
-- ════════════════════════════════════════════════════════════════
insert into beauty_masters (
  id, name, username, phone, specialization, city, bio, photo,
  rating, reviews_count, work_start, work_end, work_days,
  deposit_percent, deposit_required, self_registered)
values (
  'beauty_demo_master', 'Айгерим Касымова', 'aigerim_nails', '77771234567',
  'nails', 'Алматы',
  'Мастер маникюра и педикюра с 6-летним опытом. Работаю с гель-лаком, наращиванием, дизайном. Использую только безопасные материалы.',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
  4.9, 47, '09:00', '19:00', '[1,2,3,4,5,6]', 20, true, false)
on conflict (id) do nothing;

insert into beauty_services (id, master_id, name, category, price, duration, active) values
  ('bs1', 'beauty_demo_master', 'Маникюр с покрытием', 'nails', 5000, 90, true),
  ('bs2', 'beauty_demo_master', 'Педикюр с покрытием', 'nails', 6500, 90, true),
  ('bs3', 'beauty_demo_master', 'Маникюр + педикюр', 'nails', 10000, 150, true),
  ('bs4', 'beauty_demo_master', 'Наращивание ногтей', 'nails', 12000, 180, true),
  ('bs5', 'beauty_demo_master', 'Коррекция наращивания', 'nails', 7000, 120, true),
  ('bs6', 'beauty_demo_master', 'Снятие покрытия', 'nails', 1500, 30, true)
on conflict (id) do nothing;

insert into beauty_portfolio (id, master_id, url, caption, category) values
  ('p1', 'beauty_demo_master', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', 'Нюдовый дизайн', 'nails'),
  ('p2', 'beauty_demo_master', 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400&q=80', 'Летний дизайн', 'nails'),
  ('p3', 'beauty_demo_master', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', 'Французский маникюр', 'nails'),
  ('p4', 'beauty_demo_master', 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400&q=80', 'Омбре', 'nails')
on conflict (id) do nothing;
