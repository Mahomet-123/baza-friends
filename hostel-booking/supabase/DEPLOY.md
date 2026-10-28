# Интеграция сайта (otdyh.vercel.app) с релизным CRM

Сайт отправляет заявку с формы бронирования в CRM через Supabase Edge Function
`create-booking`. Гость в таблицу не пишет напрямую — только функция под
`service_role`, и только если знает общий секрет `SITE_BOOKING_KEY`.

Админка сайта (`#/manager`) читает и подтверждает/отклоняет заявки через
вторую функцию — `site-bookings` (тот же секрет). Никакого localStorage: всё
хранится в Supabase, поэтому заявка сразу видна и менеджеру в CRM, и в
админке сайта.

## 1. Применить миграцию в базе
Открыть Supabase → SQL Editor → вставить целиком
`database/supabase-migration-site-bookings.sql` → Run.
(Делает `bed_id` необязательным, добавляет `source`/`unit_name`/`status`/
`prepaid`/`adults`/`kids`, индексы и возвращает ограничение `no_overlap`
для коек.)

## 2. Задать секреты для Edge Function
Supabase → Edge Functions → Secrets (или CLI):
```
supabase secrets set SITE_BOOKING_KEY="<длинный случайный ключ>"
supabase secrets set SUPABASE_URL="https://juahnruwcfbvrrlruojv.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role ключ из Project Settings>"
supabase secrets set HOSTEL_OWNER_ID="<uuid владельца хостела>"
```
UUID владельца получить так (SQL Editor):
```sql
select id from auth.users where email = 'fransdelaser+hostel@gmail.com';
```

## 3. Деплой функций
```
supabase functions deploy create-booking --project-ref juahnruwcfbvrrlruojv
supabase functions deploy site-bookings --project-ref juahnruwcfbvrrlruojv
```
Функции лежат в:
- `supabase/functions/create-booking/index.ts` — приём заявки с сайта;
- `supabase/functions/site-bookings/index.ts` — чтение заявок + смена статуса
  для админки сайта.

## 4. Настроить сайт
В `assets/js/crm-bridge.js` (корень сайта `baza-friends`) указать:
- `SUPABASE_URL = 'https://juahnruwcfbvrrlruojv.supabase.co'`
- `SITE_KEY = '<тот же SITE_BOOKING_KEY>'`

Этот файл — единственная точка, где сайт знает адрес проекта и секрет.
Он вызывает:
- `POST /functions/v1/create-booking` (отправка заявки, `BF.submitBooking`);
- `GET  /functions/v1/site-bookings` (список заявок, `BF.listBookings`);
- `POST /functions/v1/site-bookings` (смена статуса, `BF.setBookingStatus`).

## Что происходит дальше
- Заявка попадает в CRM со `source='site'`, `status='new'`, `bed_id=NULL`.
- В календаре CRM такая бронь подсвечивается синим, в «Бронях» появляется
  фильтр «С сайта», бейдж «Новая», а под календарём — панель «Заявки с сайта»
  с кнопками Подтвердить / Отклонить.
- Менеджер звонит, подтверждает (`status='confirmed'`) и назначает койку.
- Предоплата (`prepaid`) и итог (цена × ночи) видны в бухгалтерии:
  Касса = сумма предоплат, Долг = итоги − предоплаты.
- В админке сайта `#/manager` те же заявки можно подтвердить/отклонить
  (через `site-bookings`), не заходя в CRM.
