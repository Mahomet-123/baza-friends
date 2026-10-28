-- Функция проверки приглашения по email
-- Позволяет проверить, есть ли приглашение, ещё до регистрации
create or replace function has_invite(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from invites
    where lower(email) = lower(coalesce(p_email, ''))
  );
$$;

grant execute on function has_invite(text) to anon, authenticated;