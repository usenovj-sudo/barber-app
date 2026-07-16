# Развёртывание в облако (Supabase + Render)

Итог: приложение работает 24/7, открывается с телефона/планшета откуда угодно,
ноутбук не нужен. Нужны 2 бесплатных аккаунта (Supabase, Render). Бэкенд на
Render Starter ≈ $7/мес (всегда включён). База и сайт — бесплатно.

Всё делается кликами в браузере. Ниже — по шагам.

---

## Шаг 0. Обновить свой репозиторий cafe-platform последним кодом

Открой cmd в папке проекта и выполни (по одной строке):

```cmd
cd C:\Users\useno\cafe-platform
git fetch https://github.com/usenovj-sudo/barber-app.git claude/prompt-from-tech-spec-d6p5j6
git checkout FETCH_HEAD -- .
git add -A
git commit -m "sync: последние функции + конфиг деплоя"
git push origin main
```

Теперь в твоём репозитории есть `render.yaml`, кабинет поставщика, Telegram и всё
остальное.

---

## Шаг 1. База данных — Supabase (бесплатно)

1. Зайди на **https://supabase.com** → Sign in with GitHub → **New project**.
2. Имя: `cafe`. Пароль базы — **придумай и сохрани** (понадобится). Регион:
   **Central EU (Frankfurt)** — ближе всего к Казахстану.
3. Подожди ~2 минуты, пока проект создастся.
4. Слева **Connect** (вверху) → вкладка **ORMs** или **Connection string** →
   выбери **Session pooler** (важно: не «Direct», а Session — он совместим с
   Render). Скопируй строку вида:
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
5. Замени `[YOUR-PASSWORD]` на пароль из шага 2. Эту готовую строку сохрани —
   это твой **DATABASE_URL**.

---

## Шаг 2. Бэкенд + сайт — Render

1. Зайди на **https://render.com** → Sign in with GitHub.
2. **New → Blueprint** → выбери репозиторий **cafe-platform** → Render найдёт
   `render.yaml` и покажет два сервиса: `cafe-backend` и `cafe-admin`.
3. Нажми **Apply**. Render начнёт сборку (5–10 мин на первый раз).
   - JWT-секреты Render сгенерирует сам.
   - Демо-данные (админ) создадутся сами при первом старте (AUTO_SEED).

Пока собирается — переходи к шагу 3.

---

## Шаг 3. Прописать 3 значения и связать сервисы

**3.1 — DATABASE_URL (бэкенд):**
- Render → сервис **cafe-backend** → **Environment** → у `DATABASE_URL` нажми
  Edit → вставь строку из Шага 1 → Save.

**3.2 — Узнать адреса.** После сборки Render покажет URL каждого сервиса, вроде:
- бэкенд: `https://cafe-backend.onrender.com`
- сайт:   `https://cafe-admin.onrender.com`

**3.3 — Связать (важно, иначе сайт не достучится до сервера):**
- сервис **cafe-admin** → Environment → `VITE_API_URL` = адрес бэкенда
  (`https://cafe-backend.onrender.com`) → Save → **Manual Deploy → Deploy latest**
  (нужно пересобрать сайт с этим адресом).
- сервис **cafe-backend** → Environment → `ALLOWED_ORIGINS` = адрес сайта
  (`https://cafe-admin.onrender.com`) → Save (бэкенд перезапустится сам).

---

## Шаг 4. Готово

Открой в браузере адрес сайта (`https://cafe-admin.onrender.com`) — с телефона,
планшета, откуда угодно. Вход:

- **admin@arlan.kz** / **admin123** / ID кафе **seed-cafe-001**

Всё, что вводишь, сохраняется в облачную базу (Supabase) — общее для всех
устройств, 24/7.

Кабинет поставщика: `https://cafe-admin.onrender.com/supplier`
(agro@postavka.kz / agro123).

---

## Заметки

- **Стоимость:** Supabase — бесплатно; сайт на Render — бесплатно; бэкенд Render
  Starter ≈ $7/мес (всегда включён). Хочешь протестировать бесплатно — поменяй в
  `render.yaml` у бэкенда `plan: starter` на `plan: free` (но тогда сервер
  засыпает после 15 мин простоя и первый запрос ~30–60 сек).
- **Обновления кода:** после `git push` в `main` Render пересобирает
  автоматически. Изменения структуры базы (миграции) применяются сами при старте.
- **Свой домен** (например `moe-cafe.kz`): Render → сервис → Settings → Custom
  Domain — подключается бесплатно.
- **Telegram-уведомления поставщику:** получи токен у @BotFather и впиши его в
  `TELEGRAM_BOT_TOKEN` у сервиса cafe-backend (Environment) → Save.
- **AI-агент закупок:** для реального Claude впиши `ANTHROPIC_API_KEY`; без него
  работает встроенная логика по правилам.
