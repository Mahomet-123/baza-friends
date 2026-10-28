-- МИГРАЦИЯ: заявки с сайта + предоплата
-- Вставить целиком в SQL Editor → Run. Порядок не важен (все операторы IF NOT EXISTS).
--
-- Что меняется:
--  1) bed_id становится необязательным — заявка с сайта приходит на объект (номер/коттедж/дом),
--     а не на конкретную койку. Менеджер назначает койку при подтверждении.
--  2) source — откуда бронь: 'crm' (создал сотрудник) или 'site' (заявка с сайта).
--  3) unit_name — название объекта как на сайте («Номера №3»), показывается в CRM.
--  4) status — состояние заявки: new (ждёт подтверждения) / confirmed / rejected.
--  5) prepaid — предоплата (сколько денег уже получено). Итог = price × ночи.
--  6) adults / kids — сколько взрослых и детей указал гость на сайте
--     (для админки сайта и панели менеджера).

-- ============ 1) койка больше не обязательна ============
alter table bookings alter column bed_id drop not null;

-- ============ 2) новые поля брони ============
alter table bookings add column if not exists source text not null default 'crm';
alter table bookings add column if not exists unit_name text not null default '';
alter table bookings add column if not exists status text not null default 'confirmed';
alter table bookings add column if not exists prepaid numeric not null default 0;
alter table bookings add column if not exists adults integer not null default 0;
alter table bookings add column if not exists kids integer not null default 0;

-- статусы: новая заявка / подтверждена / отклонена
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('new','confirmed','rejected'));

-- ============ 3) индексы ============
-- заявки с сайта: быстрый выбор неподтверждённых
create index if not exists bookings_source_idx  on bookings (source);
create index if not exists bookings_status_idx  on bookings (owner, status);

-- ============ 4) существующие брони = обычные, подтверждённые ============
update bookings set source = 'crm'    where source is null or source = '';
update bookings set status = 'confirmed' where status is null or status = '';

-- ============ 5) ограничение «не пересекаться» остаётся только для коек ============
-- bed_id = NULL не участвует в проверке пересечений (NULL не равен NULL),
-- поэтому заявки с сайта не блокируют друг друга и не занимают койки.
alter table bookings drop constraint if exists no_overlap;
alter table bookings add constraint no_overlap exclude using gist (
  owner with =,
  bed_id with =,
  daterange(checkin, checkout) with &&
);

-- ============ 6) доступ для менеджера: подтверждение заявки ============
-- Политика «hostel members bookings» (из migration-team) уже разрешает участникам
-- хостела читать и менять свои брони — этого достаточно, чтобы менеджер
-- подтвердил заявку с сайта и назначил ей койку.
-- Гостя сайта (анонимного) мы НЕ допускаем к таблице: заявки пишет только
-- Edge Function create-booking через service_role, по секрету сайта.
