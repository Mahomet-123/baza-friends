# Настройка Supabase для проекта «Хостел · бронирование коек»

Эта инструкция описывает все шаги от создания проекта до приглашения менеджеров.

## 1. Создать проект Supabase

- Зайдите на https://supabase.com → Sign in → **New project**
- Название: `hostel-booking`
- Регион: ближайший (например, Frankfurt/EU)
- Пароль базы — любой (сохраните его)

## 2. Создать таблицы и политики (миграции)

- Слева **SQL Editor** → New query → вставляйте и выполняйте файлы **по порядку**:
  1. `supabase-schema.sql`
  2. `supabase-migration-profiles.sql`
  3. `supabase-migration-team.sql`
  4. `supabase-migration-settings.sql`
  5. `supabase-migration-accounting.sql`
  6. `supabase-migration-optimistic-lock.sql` — добавляет колонки `updated_at` и триггеры для оптимистичной блокировки. Выполняется как обычная миграция, дополнительных действий не требует.
  7. `database/supabase-function-has-invite.sql`
  
- Затем создайте функцию проверки приглашения (можно выполнить файл `supabase-function-has-invite.sql` или вставить SQL вручную):

```sql
create or replace function has_invite(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from invites
    where lower(email) = lower(coalesce(p_email, ''))
  );
$$;

grant execute on function has_invite(text) to anon, authenticated;
```

## 3. Настроить аутентификацию

- **Authentication → Providers** — включите **Email**.
- **Authentication → Emails** — при необходимости включите **Confirm sign up** (для продакшена). Для теста можно выключить.
- **Authentication → URL Configuration** — укажите **Site URL**:
  - Для локальной разработки: `http://localhost:5501`
  - Для продакшена: `https://ваш-домен.vercel.app`
  - Добавьте оба адреса в **Redirect URLs**.

## 4. Получить ключи API

- Откройте **Settings → API** (или **Settings → API Keys**).
- Скопируйте **Project URL** и **Publishable (anon) key**.
- Вставьте их в `app/01-constants.js`:

```javascript
const SUPABASE_URL = 'ВАШ_URL';
const SUPABASE_KEY = 'ВАШ_PUBLISHABLE_KEY';
```

## 5. Создать владельца хостела

Владелец создаётся только вручную.

1. **Authentication → Users → Add user → Create new user**
   - Email: например `admin@yourcompany.com`
   - Password: надёжный пароль (минимум 6 символов)
   - Галочка **Auto Confirm User** — включить.

2. **SQL Editor** → New query → выполните запрос, заменив email:

```sql
insert into hostel_members (hostel_id, user_id, role, email)
select id, id, 'owner', email
from auth.users
where email = 'admin@yourcompany.com';
```

3. Откройте приложение, войдите с этим email и паролем.  
   При первом входе система автоматически создаст структуру хостела по умолчанию.

## 6. Приглашение менеджеров

- Владелец входит в приложение → вкладка **Команда** → вводит email менеджера.
- Менеджер регистрируется на сайте тем же email (кнопка «Создать аккаунт хостела»).  
  Регистрация возможна **только при наличии приглашения**.
- После регистрации менеджер попадёт в хостел владельца.

## 7. Деплой на Vercel

- Установите Vercel CLI: `npm i -g vercel`
- В папке проекта выполните: `vercel --prod --yes`
- Убедитесь, что в `vercel.json` настроены заголовки.

## Примечания

- `Publishable key` безопасно хранить в коде сайта при включённом RLS.
- Секретные ключи (`service_role`) в браузер не попадают.
- Данные разных хостелов изолированы RLS.