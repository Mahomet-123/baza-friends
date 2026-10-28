-- МИГРАЦИЯ: бухгалтерия хостела (расходы и прочие доходы)
-- Видна всем участникам хостела — и владельцу, и менеджерам.
-- Вставить целиком в SQL Editor → Run.

create table if not exists finance (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid(),   -- хостел
  created_by uuid not null default auth.uid(),   -- кто внёс операцию
  kind       text not null check (kind in ('expense','income')),
  category   text not null,
  amount     numeric not null check (amount >= 0),
  date       date not null,
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists finance_owner_date on finance (owner, date);

alter table finance enable row level security;
drop policy if exists "hostel members finance" on finance;
create policy "hostel members finance" on finance for all to authenticated
  using (owner in (select my_hostels()))
  with check (owner in (select my_hostels()));
