-- Создание владельца хостела
-- Замените email на email нужного пользователя
-- Пользователь должен быть предварительно создан в Authentication → Users
insert into hostel_members (hostel_id, user_id, role, email)
select id, id, 'owner', email
from auth.users
where email = 'owner@example.com';

-- Использовать его нужно так:
-- 1. Создайте пользователя в Supabase Auth (Authentication → Users → Add user).
-- 2. В SQL Editor откройте этот файл.
-- 3. Замените 'owner@example.com' на email созданного пользователя.
-- 4. Выполните (Run).
-- После этого пользователь станет владельцем и сможет войти в приложение.