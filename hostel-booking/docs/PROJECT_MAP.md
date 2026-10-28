# PROJECT_MAP — Карта проекта «Хостел · бронирование коек»

## Общее описание
Одностраничное приложение для управления койко-местами в хостеле.
Технологии: чистый HTML/CSS/JavaScript + Supabase (PostgreSQL, Auth, REST).
Локализация: русский, английский, арабский (RTL).
Деплой: Vercel.

## Структура каталогов

```
C:.
│   index.html
│   styles.css
│   manifest.webmanifest
│   .gitignore
│   README.md
│
├───app/
│   01-constants.js
│   02-helpers.js
│   03-data.js
│   04-buildings.js
│   05-stats-map.js
│   06-bookings.js
│   07-structure.js
│   08-analytics.js
│   09-finance.js
│   10-calendar.js
│   11-team.js
│   12-modals.js
│   13-booking-actions.js
│   14-structure-mutations.js
│   15-export-import.js
│   16-views.js
│   17-init.js
│   18-toast.js
│   19-ui-modals.js
│
├───assets/
│   supabase.js
│   иконки, логотипы, фоновое изображение
│
├───css/
│   modals.css
│
├───database/
│   SETUP-SUPABASE.md
│   supabase-schema.sql
│   supabase-migration-profiles.sql
│   supabase-migration-team.sql
│   supabase-migration-settings.sql
│   supabase-migration-accounting.sql
│   supabase-function-has-invite.sql
│   supabase-migration-optimistic-lock.sql
│   supabase-insert-owner.sql
│
├───i18n/
│   01-ru.js
│   02-en.js
│   03-ar.js
│   04-engine.js
│
├───docs/
│   PROJECT_MAP.md
│   DEPENDENCY_GRAPH.md
│   FILE_BY_FILE_ANALYSIS.md
│   BUSINESS_LOGIC.md
│   CONFIGURATION_GUIDE.md
│   STEP_BY_STEP_REBUILD.md
│   AI_MEMORY.md
│
└───tests/
    tests.html
    tests.js
    integration.html
    integration-tests.js
```

## Ключевые модули `app/`

- **01-constants** — иконки, конфигурация Supabase, глобальные переменные, функции прав, преобразования броней.
- **02-helpers** — DOM-хелперы, работа с датами, поиск, статусы.
- **03-data** — загрузка и сохранение данных в Supabase, определение хостела, миграция первого запуска.
- **04-buildings** — управление зданиями.
- **05-stats-map** — статистика и карта мест.
- **06-bookings** — таблица броней с фильтрами.
- **07-structure** — вкладка «Структура».
- **08-analytics** — аналитика: KPI, графики, должники.
- **09-finance** — бухгалтерия: расходы, доходы, операции.
- **10-calendar** — календарь-шахматка.
- **11-team** — команда, приглашения, приватность телефонов.
- **12-modals** — модалки койки и брони, форма сохранения.
- **13-booking-actions** — удаление, выселение, делегирование действий.
- **14-structure-mutations** — мутации структуры.
- **15-export-import** — экспорт/импорт JSON.
- **16-views** — переключение вкладок и общий рендер.
- **17-init** — инициализация приложения, обработчики событий.
- **18-toast** — всплывающие уведомления.
- **19-ui-modals** — кастомные confirm/prompt.

## Архитектура
- Приложение загружается после `DOMContentLoaded`.
- Supabase Auth используется для входа/регистрации.
- Все данные хранятся в Supabase, изолированы RLS.
- Оптимистичная блокировка через `updated_at` предотвращает перезапись при одновременном редактировании.
- Автообновление каждые 30 секунд и при фокусе.
- Кастомные модальные окна заменяют системные `confirm`/`prompt`.