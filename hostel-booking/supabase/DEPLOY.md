# Интеграция сайта (otdyh.vercel.app) с релизным CRM

Сайт и CRM — две точки входа в **одни и те же данные Supabase**. Связь идёт через
три Supabase Edge Function (все с **Verify JWT — OFF**, доступ только по общему
секрету `SITE_BOOKING_KEY` в заголовке `x-site-key`):

- `create-booking` — приём заявки с сайта, авто-подбор свободной койки;
- `site-bookings` — чтение/смена статуса заявок для админки сайта `#/manager`;
- `public-structure` — публичная выдача структуры CRM (категории/объекты) и
  PII-безопасной занятости коек, чтобы сайт строил каталог точно по планировке CRM.

Гость в таблицы не пишет напрямую — только функции под `service_role`, и только если
знают секрет. Никакого `localStorage`: всё в Supabase, заявка сразу видна и менеджеру
в CRM, и в админке сайта.

## 1. Применить миграцию в базе
Открыть Supabase → SQL Editor → вставить целиком
`database/supabase-migration-site-bookings.sql` → Run.
(Делает `bed_id` необязательным, добавляет `source`/`unit_name`/`status`/`prepaid`/
`adults`/`kids`, индексы и возвращает ограничение `no_overlap` для коек. Важно:
`no_overlap` теперь охраняет только реальные койки — `bed_id IS NOT NULL`, поэтому
назначенная койка не может быть продана дважды, а заявка с сайта без койки никого
не блокирует.)

## 2. Задать секреты для Edge Function
Supabase → Edge Functions → Secrets (или CLI):
```
supabase secrets set SITE_BOOKING_KEY="o1B2s3H4i5Y6s7E8c9R0e9T8n7i6Y5c4L3u2C1h"
supabase secrets set SUPABASE_URL="https://juahnruwcfbvrrlruojv.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role ключ из Project Settings>"
supabase secrets set HOSTEL_OWNER_ID="<uuid владельца хостела>"
```
UUID владельца получить так (SQL Editor):
```sql
select id from auth.users where email = 'fransdelaser+hostel@gmail.com';
```
⚠️ `SITE_BOOKING_KEY` здесь и `SITE_KEY` в `assets/js/crm-bridge.js` **должны совпадать**
(сейчас в коде сайта прописан `o1B2s3H4i5Y6s7E8c9R0e9T8n7i6Y5c4L3u2C1h`).

Для каждой функции в дашборде выключить **Verify JWT** (Settings → Edge Functions →
`create-booking` / `site-bookings` / `public-structure` → вкл. «Enforce JWT verification» = OFF).

## 3. Деплой функций
```
supabase functions deploy create-booking --project-ref juahnruwcfbvrrlruojv
supabase functions deploy site-bookings --project-ref juahnruwcfbvrrlruojv
supabase functions deploy public-structure --project-ref juahnruwcfbvrrlruojv
```
Функции лежат в:
- `supabase/functions/create-booking/index.ts` — приём заявки с сайта + авто-койка;
- `supabase/functions/site-bookings/index.ts` — чтение заявок + смена статуса;
- `supabase/functions/public-structure/index.ts` — структура CRM + занятость (PII-safe).

## 4. Настроить сайт
В `assets/js/crm-bridge.js` (корень сайта `baza-friends`) указать:
- `SUPABASE_URL = 'https://juahnruwcfbvrrlruojv.supabase.co'`
- `SITE_KEY = 'o1B2s3H4i5Y6s7E8c9R0e9T8n7i6Y5c4L3u2C1h'`

Этот файл — единственная точка, где сайт знает адрес проекта и секрет. Он вызывает:
- `GET  /functions/v1/public-structure` (структура + занятость, `BF.loadStructure`);
- `POST /functions/v1/create-booking` (отправка заявки, `BF.submitBooking`);
- `GET  /functions/v1/site-bookings` (список заявок, `BF.listBookings`);
- `POST /functions/v1/site-bookings` (смена статуса, `BF.setBookingStatus`).

## 5. Как сайт связан со структурой CRM (Option A)
- **Категории сайта = апартаменты CRM.** Название категории берётся из
  `apartment.name` (например, «Номера», «Коттеджи», «2‑этажные дома»).
- **Объекты сайта = комнаты CRM.** Каждая комната (`room`) = один номер с 1 спальней.
  Реальная раскладка: апартамент №1 → 7 номеров, №2 → 5 коттеджей, №3 → 3 дома (всего 15).
- Цена объекта = `resolvePrice(apartment, room)` (койка → комната → апартамент → 7000 ₽).
- При бронировании сайт передаёт `unitId` (id комнаты). `create-booking` находит
  комнату в структуре, берёт **первую свободную койку** на выбранные даты и ставит
  `bed_id`. Если свободных коек нет → возвращает `{error:'no_free_bed'}` (409),
  сайт показывает «на эти даты мест нет».
- В каталоге сайта есть выбор дат: если на выбранные даты у объекта заняты все койки,
  карточка помечается «Занято» и становится некликабельной (данные занятости —
  из `public-structure`, без имён/телефонов гостей).

## 6. Что происходит дальше
- Заявка попадает в CRM со `source='site'`, `status='new'`, реальным `bed_id`
  (назначенная койка) и `unit_name` = название объекта.
- В календаре CRM такая бронь подсвечивается, в «Бронях» — фильтр «С сайта» и
  бейдж «Новая», под календарём — панель «Заявки с сайта» с кнопками Подтвердить/Отклонить.
- Менеджер звонит, подтверждает (`status='confirmed'`); койка уже зарезервирована.
- Предоплата (`prepaid`) и итог (цена × ночи) видны в бухгалтерии:
  Касса = сумма предоплат, Долг = итоги − предоплаты.
- В админке сайта `#/manager` те же заявки можно подтвердить/отклонить
  (через `site-bookings`), не заходя в CRM.
