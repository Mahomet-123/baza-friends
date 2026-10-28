-- МИГРАЦИЯ: менеджеры + приватные телефоны клиентов
-- Владелец и менеджеры работают в одном хостеле: видят все брони (имя, даты, место),
-- но ТЕЛЕФОН клиента видит только тот, кто эту бронь внёс. Запрет — на уровне базы.
-- Вставить целиком в SQL Editor → Run.

-- ============ 1. Участники хостела ============
create table if not exists hostel_members (
  hostel_id  uuid not null,               -- id хостела = id аккаунта владельца
  user_id    uuid not null,
  role       text not null check (role in ('owner','manager')),
  email      text,
  created_at timestamptz not null default now(),
  primary key (hostel_id, user_id)
);

alter table hostel_members add column if not exists name text;

-- нынешние владельцы становятся владельцами своих хостелов
insert into hostel_members (hostel_id, user_id, role, email)
select s.owner, s.owner, 'owner', u.email
from structure s join auth.users u on u.id = s.owner
on conflict do nothing;

-- SECURITY DEFINER, чтобы политики не зацикливались на самой таблице
create or replace function my_hostels()
returns setof uuid language sql security definer stable set search_path = public as $$
  select hostel_id from hostel_members where user_id = auth.uid();
$$;

create or replace function is_owner(h uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from hostel_members
                 where hostel_id = h and user_id = auth.uid() and role = 'owner');
$$;

-- ============ 2. Приглашения менеджеров ============
create table if not exists invites (
  hostel_id  uuid not null,
  email      text not null,
  created_at timestamptz not null default now(),
  primary key (hostel_id, email)
);

alter table invites enable row level security;
drop policy if exists "owner manages invites" on invites;
drop policy if exists "invitee reads own invite" on invites;

create policy "owner manages invites" on invites for all to authenticated
  using (is_owner(hostel_id)) with check (hostel_id = auth.uid());

create policy "invitee reads own invite" on invites for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ============ 3. Политики участников ============
alter table hostel_members enable row level security;
drop policy if exists "read members of my hostels" on hostel_members;
drop policy if exists "create own owner membership" on hostel_members;
drop policy if exists "join as manager by invite" on hostel_members;
drop policy if exists "owner removes members" on hostel_members;

create policy "read members of my hostels" on hostel_members for select to authenticated
  using (hostel_id in (select my_hostels()) or user_id = auth.uid());

-- новый владелец заводит свой хостел
create policy "create own owner membership" on hostel_members for insert to authenticated
  with check (user_id = auth.uid() and hostel_id = auth.uid() and role = 'owner');

-- менеджер вступает в хостел только при наличии приглашения на его email
create policy "join as manager by invite" on hostel_members for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'manager'
    and exists (select 1 from invites i
                where i.hostel_id = hostel_members.hostel_id
                  and lower(i.email) = lower(auth.jwt() ->> 'email'))
  );

create policy "owner removes members" on hostel_members for delete to authenticated
  using (is_owner(hostel_id) and user_id <> auth.uid());

-- ============ 4. Кто внёс бронь ============
alter table bookings add column if not exists created_by uuid default auth.uid();
update bookings set created_by = owner where created_by is null;
alter table bookings alter column created_by set not null;

-- ============ 5. Телефоны — в отдельную таблицу, видит только автор брони ============
create table if not exists booking_phones (
  booking_id uuid primary key references bookings(id) on delete cascade,
  phone      text not null default '',
  created_by uuid not null default auth.uid()
);

insert into booking_phones (booking_id, phone, created_by)
select id, phone, created_by from bookings where coalesce(phone, '') <> ''
on conflict do nothing;

alter table bookings drop column if exists phone;

alter table booking_phones enable row level security;
drop policy if exists "own phones only" on booking_phones;
create policy "own phones only" on booking_phones for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- ============ 6. Данные хостела видны всем его участникам ============
drop policy if exists "own rows structure" on structure;
drop policy if exists "own rows bookings" on bookings;
drop policy if exists "hostel members structure" on structure;
drop policy if exists "hostel members bookings" on bookings;

create policy "hostel members structure" on structure for all to authenticated
  using (owner in (select my_hostels())) with check (owner in (select my_hostels()));

create policy "hostel members bookings" on bookings for all to authenticated
  using (owner in (select my_hostels())) with check (owner in (select my_hostels()));
