-- МИГРАЦИЯ: два независимых профиля (hostel / xilon)
-- Каждый логин видит только свои данные. Вставить целиком в SQL Editor → Run.

create extension if not exists btree_gist;

-- 1) колонка владельца: новые записи сами получают id вошедшего пользователя
alter table structure add column if not exists owner uuid default auth.uid();
alter table bookings  add column if not exists owner uuid default auth.uid();

-- 2) всё, что накоплено до сих пор (144 койки и т.д.), остаётся профилю hostel
update structure set owner = (select id from auth.users where email = 'fransdelaser+hostel@gmail.com') where owner is null;
update bookings  set owner = (select id from auth.users where email = 'fransdelaser+hostel@gmail.com') where owner is null;
alter table structure alter column owner set not null;
alter table bookings  alter column owner set not null;

-- 3) планировка: одна строка на профиль (ключ теперь owner, а не id=1)
alter table structure drop constraint structure_pkey;
alter table structure drop constraint if exists structure_id_check;
alter table structure alter column id set default 1;
alter table structure add primary key (owner);

-- 4) запрет пересечения дат на койку — внутри одного профиля
alter table bookings drop constraint no_overlap;
alter table bookings add constraint no_overlap exclude using gist (
  owner with =,
  bed_id with =,
  daterange(checkin, checkout) with &&
);

-- 5) политики: каждый профиль видит и меняет только своё
drop policy "authenticated full access structure" on structure;
drop policy "authenticated full access bookings" on bookings;

create policy "own rows structure" on structure for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy "own rows bookings" on bookings for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
