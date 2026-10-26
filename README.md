# База отдыха «Объект» — прототип сайта и CRM

Прототип одностраничного сайта базы отдыха у Каспийского моря (baza-friends.ru)
и встроенной CRM-админки, работающих как **единая система**.

Статический SPA без бэкенда: все данные — демо, хранятся в `localStorage`
(ключ `hostel_crm_v1`). Сайт и CRM живут на одном origin (GitHub Pages), поэтому
заявка, оставленная на сайте, сразу появляется в таблице броней CRM — без сервера.

## Возможности
- Каталог жилья по категориям (комнаты, коттеджи, 2-этажные дома) со сворачиваемыми блоками.
- Галереи фото объектов: листание влево/вправо + просмотр на весь экран (lightbox).
- Территория базы (без волейбола) с иконками.
- Форма бронирования: взрослые, чекбокс «дети» с полем «сколько детей», расчёт гостей.
- Админка (`hostel-booking/`) — список заявок из сайта и CRM с тегами «с сайта».
- RU/EN переключение языка.
- Белая метка (название, цвет, телефон) применяется на лету.
- Полностью адаптивная вёрстка, офлайн-плейсхолдеры фото (SVG, без внешних файлов).

## Структура
```
index.html                  — оболочка сайта (подключает модули CSS/JS)
assets/css/                 — стили, разбитые по зонам (tokens, base, header,
                              hero, catalog, territory, detail, modal, gallery,
                              lightbox, form, manager, footer, responsive)
assets/js/                  — модули сайта (namespace window.BF)
  data.js                   — демо-данные, иконки, i18n, категории, территория
  state.js / i18n.js        — состояние и переводы
  home.js / detail.js       — главная и карточка объекта
  gallery.js / lightbox.js / swipe.js / modal.js
  form.js                   — форма брони, пишет заявку через crm-bridge.js
  crm-bridge.js             — мост сайт → CRM (пишет в hostel_crm_v1.bookings)
  manager.js                — админка-прослойка на сайте (#/manager)
  router.js / main.js       — роутинг (hash) и точка входа
hostel-booking/             — CRM-админка (отдельный модуль проекта)
  index.html, app/, i18n/   — читает те же localStorage-данные
docs/TZ.md                  — техническое задание на единую систему
scripts/test-linkage.js     — headless-тест: сайт → CRM (puppeteer-core)
```

## Как работает связь сайт → CRM
1. Посетитель оставляет заявку на сайте (`assets/js/form.js`).
2. `crm-bridge.js` записывает строку в `localStorage['hostel_crm_v1'].bookings`
   с полями `owner:'local'`, `source:'site'`.
3. CRM (`hostel-booking/`) при загрузке читает `bookings` с `owner==='local'`
   и показывает их в таблице с бейджем «с сайта».
4. Менеджер меняет статус (`new → confirmed/rejected`) — изменение сохраняется
   обратно в тот же `localStorage`.

Тест связи: `node scripts/test-linkage.js` (требует Chrome и локальный сервер).

## Локальный запуск
Любой статический сервер из папки проекта, например:
```
python -m http.server 8000
# сайт:      http://127.0.0.1:8000/
# CRM:       http://127.0.0.1:8000/hostel-booking/
```
Для входа в CRM подойдёт любой email и пароль (демо-режим).

## Деплой (GitHub Pages)
Сайт и CRM развёрнуты на GitHub Pages с ветки `main` (корень):
- Сайт: **https://mahomet-123.github.io/baza-friends/**
- CRM:  **https://mahomet-123.github.io/baza-friends/hostel-booking/**

Обновление: закоммитьте изменения в `main` — Pages пересоберётся автоматически.

> Прототип работает на демо-данных. Для боевого сайта нужна замена
> `data.js` на реальный источник (CMS/API) и бэкенд для заявок.
