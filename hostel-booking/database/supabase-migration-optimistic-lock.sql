-- Миграция: оптимистичная блокировка (updated_at + триггеры)
-- Защищает от перезаписи изменений, сделанных другими пользователями

-- 1. Добавляем колонку updated_at в bookings и finance, если её нет
alter table bookings add column if not exists updated_at timestamptz not null default now();
alter table finance  add column if not exists updated_at timestamptz not null default now();

-- 2. Триггерная функция: автоматически обновляет updated_at при UPDATE
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 3. Создаём триггеры
drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

drop trigger if exists trg_finance_updated_at on finance;
create trigger trg_finance_updated_at
  before update on finance
  for each row execute function set_updated_at();

drop trigger if exists trg_structure_updated_at on structure;
create trigger trg_structure_updated_at
  before update on structure
  for each row execute function set_updated_at();