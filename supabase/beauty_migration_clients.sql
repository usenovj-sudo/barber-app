-- ════════════════════════════════════════════════════════════════
--  BEAUTY — клиенты: таблицы + функции авторизации
--  Запустить один раз в SQL Editor (beauty-проект). Безопасно повторно.
-- ════════════════════════════════════════════════════════════════

create table if not exists beauty_clients (
  id         text primary key,
  name       text not null,
  phone      text not null,
  created_at timestamptz default now()
);

create table if not exists beauty_client_accounts (
  id            text primary key,
  phone         text unique not null,
  password_hash text not null,
  client_id     text references beauty_clients(id) on delete cascade,
  created_at    timestamptz default now()
);

alter table beauty_clients         enable row level security;
alter table beauty_client_accounts enable row level security;

drop policy if exists p_beauty_clients on beauty_clients;
create policy p_beauty_clients on beauty_clients for all using (true) with check (true);
-- beauty_client_accounts: политик нет — только через RPC-функции

create or replace function beauty_client_register(
  p_name text, p_phone text, p_password text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_phone  text := regexp_replace(p_phone, '\D', '', 'g');
  v_id     text := 'bc' || (extract(epoch from now()) * 1000)::bigint::text;
  v_client beauty_clients;
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
  if exists (select 1 from beauty_client_accounts where phone = v_phone) then
    return jsonb_build_object('error', 'Этот номер уже зарегистрирован');
  end if;

  insert into beauty_clients (id, name, phone)
  values (v_id, trim(p_name), v_phone)
  returning * into v_client;

  insert into beauty_client_accounts (id, phone, password_hash, client_id)
  values (v_id, v_phone, crypt(p_password, gen_salt('bf')), v_id);

  return to_jsonb(v_client);
end;
$$;

create or replace function beauty_client_login(p_phone text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_phone  text := regexp_replace(p_phone, '\D', '', 'g');
  v_acc    beauty_client_accounts;
  v_client beauty_clients;
begin
  select * into v_acc from beauty_client_accounts where phone = v_phone;
  if v_acc.id is null then
    return jsonb_build_object('error', 'Аккаунт не найден. Зарегистрируйтесь.');
  end if;
  if v_acc.password_hash <> crypt(p_password, v_acc.password_hash) then
    return jsonb_build_object('error', 'Неверный пароль');
  end if;
  select * into v_client from beauty_clients where id = v_acc.client_id;
  return to_jsonb(v_client);
end;
$$;

grant execute on function beauty_client_register(text, text, text) to anon;
grant execute on function beauty_client_login(text, text) to anon;
