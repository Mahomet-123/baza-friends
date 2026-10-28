-- Хостел · бронирование коек — схема Supabase
-- Вставить целиком в SQL Editor и нажать Run.

-- для запрета пересекающихся броней на одну койку
create extension if not exists btree_gist;

-- планировка (квартиры/комнаты/койки) — одна JSON-запись
create table if not exists structure (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- брони — по строке на каждую
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  bed_id int not null,
  guest text not null,
  phone text not null default '',
  checkin date not null,
  checkout date not null,
  price numeric not null default 0,
  paid boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (checkout > checkin),
  -- база сама не даст записать две пересекающиеся брони на одну койку
  constraint no_overlap exclude using gist (
    bed_id with =,
    daterange(checkin, checkout) with &&
  )
);

-- доступ только вошедшим (Supabase Auth); анонимам — ничего
alter table structure enable row level security;
alter table bookings  enable row level security;

create policy "authenticated full access structure"
  on structure for all to authenticated
  using (true) with check (true);

create policy "authenticated full access bookings"
  on bookings for all to authenticated
  using (true) with check (true);
