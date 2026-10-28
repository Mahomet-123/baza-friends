# CONFIGURATION_GUIDE — Настройка и адаптация

## Supabase
- `SUPABASE_URL` и `SUPABASE_KEY` в `app/01-constants.js`.
- Миграции в папке `database/` (см. `SETUP-SUPABASE.md`).
- SMTP для писем: см. `database/SETUP-SUPABASE.md` или `SMTP-SETUP-GMAIL.md` (если создан).

## Брендинг
- Название: ключи `app_title`, `brand` в `i18n/*.js`.
- Логотипы: `assets/logo-*.png`.
- Цвета: переменные в `styles.css` (`--accent`, `--bg` и др.).
- Фоновое изображение: `assets/bg-login.svg`.

## Языки
- Поддерживаются RU/EN/AR.
- Добавление языка: создать словарь в `i18n/`, добавить в `LANGS` и `LANG_NAMES`.

## Валюта
- Символ валюты в `fmtSAR` (в `app/08-analytics.js`) и ключах `fin_amount`.
- Сейчас — рубль (₽).

## Роли
- Владелец и менеджер. Задаются в `hostel_members.role`.

## Приватность телефонов
- Настройка `private_phones` в `hostel_settings`, меняется в UI.

## Автообновление
- Интервал 30 секунд в `app/17-init.js` (`setInterval`).

## Тесты
- Запуск модульных: `tests/tests.html`.
- Запуск интеграционных: `tests/integration.html`.