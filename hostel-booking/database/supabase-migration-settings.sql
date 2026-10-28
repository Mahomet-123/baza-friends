-- МИГРАЦИЯ: настройка «скрывать телефоны клиентов» (по умолчанию — ПОКАЗЫВАТЬ всем сотрудникам)
-- Менять настройку может только владелец. Вставить целиком в SQL Editor → Run.

create table if not exists hostel_settings (
  hostel_id      uuid primary key,
  private_phones boolean not null default false,   -- false = телефоны видны всей команде
  updated_at     timestamptz not null default now()
);

alter table hostel_settings enable row level security;
drop policy if exists "members read settings" on hostel_settings;
drop policy if exists "owner writes settings" on hostel_settings;

create policy "members read settings" on hostel_settings for select to authenticated
  using (hostel_id in (select my_hostels()));

create policy "owner writes settings" on hostel_settings for all to authenticated
  using (is_owner(hostel_id)) with check (is_owner(hostel_id));

-- существующим хостелам оставляем нынешнее поведение (телефоны приватные),
-- владелец сможет выключить это тумблером; новые хостелы стартуют с false
insert into hostel_settings (hostel_id, private_phones)
select owner, true from structure
on conflict (hostel_id) do nothing;

-- ===== телефоны: видимость теперь зависит от настройки =====
drop policy if exists "own phones only" on booking_phones;
drop policy if exists "phones read"   on booking_phones;
drop policy if exists "phones insert" on booking_phones;
drop policy if exists "phones update" on booking_phones;
drop policy if exists "phones delete" on booking_phones;

-- видит автор брони ВСЕГДА; остальные участники — только если приватность выключена
create policy "phones read" on booking_phones for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from bookings b
    left join hostel_settings hs on hs.hostel_id = b.owner
    where b.id = booking_phones.booking_id
      and b.owner in (select my_hostels())
      and coalesce(hs.private_phones, false) = false
  )
);

create policy "phones insert" on booking_phones for insert to authenticated
with check (
  exists (select 1 from bookings b
          where b.id = booking_phones.booking_id and b.owner in (select my_hostels()))
);

create policy "phones update" on booking_phones for update to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from bookings b
    left join hostel_settings hs on hs.hostel_id = b.owner
    where b.id = booking_phones.booking_id
      and b.owner in (select my_hostels())
      and coalesce(hs.private_phones, false) = false
  )
) with check (true);

create policy "phones delete" on booking_phones for delete to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from bookings b
    left join hostel_settings hs on hs.hostel_id = b.owner
    where b.id = booking_phones.booking_id
      and b.owner in (select my_hostels())
      and coalesce(hs.private_phones, false) = false
  )
);
