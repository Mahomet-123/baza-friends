# DEPENDENCY_GRAPH — Граф зависимостей

## Внутренние зависимости

### Порядок подключения в `index.html`
1. `assets/supabase.js`
2. `i18n/01-ru.js`
3. `i18n/02-en.js`
4. `i18n/03-ar.js`
5. `i18n/04-engine.js`
6. `app/01-constants.js`
7. `app/02-helpers.js`
8. `app/03-data.js`
9. `app/04-buildings.js`
10. `app/05-stats-map.js`
11. `app/06-bookings.js`
12. `app/07-structure.js`
13. `app/08-analytics.js`
14. `app/09-finance.js`
15. `app/10-calendar.js`
16. `app/11-team.js`
17. `app/12-modals.js`
18. `app/13-booking-actions.js`
19. `app/14-structure-mutations.js`
20. `app/15-export-import.js`
21. `app/16-views.js`
22. `app/17-init.js`
23. `app/18-toast.js`
24. `app/19-ui-modals.js`

### Использование глобальных функций
- Все модули используют глобальные переменные и функции, определённые в более ранних файлах.
- `app/17-init.js` — единственный модуль, который обращается к DOM и запускает приложение.
- `app/03-data.js` использует функции из `01-constants` и `02-helpers`, а также `finRow` из `09-finance`.
- `app/08-analytics.js` использует `fmtMoney`, `fmtSAR`, `allBeds`, `bedState` и т.д.

## Внешние зависимости

- **Supabase JS SDK** (`assets/supabase.js`) — глобальный `window.supabase`.
- **Шрифты** — системные.
- **Иконки** — встроенные SVG (Lucide), локально.

## API-зависимости (Supabase)

### Auth
- `sb.auth.signUp` (с проверкой `has_invite` через RPC)
- `sb.auth.signInWithPassword`
- `sb.auth.signOut`
- `sb.auth.resetPasswordForEmail`
- `sb.auth.onAuthStateChange`
- `sb.auth.updateUser`

### REST (PostgREST)
- `sb.from('structure')` — чтение/запись планировки.
- `sb.from('bookings')` — брони.
- `sb.from('booking_phones')` — телефоны (RLS).
- `sb.from('hostel_members')` — участники.
- `sb.from('invites')` — приглашения.
- `sb.from('hostel_settings')` — настройки.
- `sb.from('finance')` — финансовые операции.

## Переменные окружения / конфигурация

- `SUPABASE_URL` (в `app/01-constants.js`)
- `SUPABASE_KEY` (publishable key, там же)
- Vercel project ID/org ID в `.vercel/project.json`