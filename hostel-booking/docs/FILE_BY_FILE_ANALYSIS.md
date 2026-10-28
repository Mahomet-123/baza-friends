# FILE_BY_FILE_ANALYSIS — Разбор файлов

## Корень

### index.html
- Содержит разметку экрана входа, приложения, всех вкладок и модалок.
- Подключает стили и скрипты.
- Использует data-атрибуты для локализации (`data-i18n`).

### styles.css
- Основные стили: переменные, адаптивность, RTL, типографика, компоненты.

### css/modals.css
- Стили кастомных модальных окон (`ui-modal`).

### manifest.webmanifest
- PWA-манифест: имя, цвета, иконки.

## app/

- **01-constants.js** — ICONS, `SUPABASE_URL`, `SUPABASE_KEY`, `LOGINS`, `authMode`, `sb`, `state`, `me`, `hostel`, `settings`, функции прав, `rowToBk`/`bkToRow`.
- **02-helpers.js** — `$`, `esc`, даты, `fmtMoney`, `findBed`, `bedLabel`, `placeLabel`, `bkStatus`, `bedBookings`, `bedState`, `allBeds`.
- **03-data.js** — `resolveHostel`, `renderHostelSwitch`, `cloudLoad`, `firstRunMigration`, `persistStructure`, `savePhone`, `cloudDeleteBookingsByBeds`.
- **04-buildings.js** — `curBuilding`, `ensureBuildings`, `visibleApartments`, `renderBuildingBar`, `addBuilding`, `renameBuilding`, `deleteBuilding`.
- **05-stats-map.js** — `renderStats`, `mapEdit`, `renderMap`, `roomDisplayName`, `phoneCell`.
- **06-bookings.js** — `renderAptFilter`, `renderBookings`.
- **07-structure.js** — `renderStructure`.
- **08-analytics.js** — `anYM`, `fmtSAR`, `guestKey`, `nightsInRange`, `monthRange`, `monthAccrued`, `renderAnalytics`.
- **09-finance.js** — `FIN_CATS`, `finance`, `finRow`, `finToRow`, `renderFinance`, `fillFinCats`, `openFinModal`, `saveFinFromForm`, `deleteFin`, `copyPrevMonth`.
- **10-calendar.js** — `calYM`, `renderCalendar`, `fitCalendar`.
- **11-team.js** — `renderTeam`, `setPrivatePhones`, `addManager`, `removeMember`, `cancelInvite`, `markPaid`.
- **12-modals.js** — `openModal`, `closeModal`, `openBedModal`, `fillBedSelect`, `openBookingModal`, `saveBookingFromForm`.
- **13-booking-actions.js** — `deleteBooking`, `checkoutBooking`, `findBookingAction`.
- **14-structure-mutations.js** — мутации структуры.
- **15-export-import.js** — экспорт/импорт.
- **16-views.js** — `VIEW_KEY`, `VIEWS`, `switchView`, `render`.
- **17-init.js** — `startAutoRefresh`, `refreshFromCloud`, `initApp`, обработчики.
- **18-toast.js** — `showToast`.
- **19-ui-modals.js** — `showUiModal`, `showConfirm`, `showPrompt`, `showApartmentPrompt`.

## i18n/

- **01-ru.js**, **02-en.js**, **03-ar.js** — словари.
- **04-engine.js** — `LANGS`, `LANG_NAMES`, `LANG`, `t`, `applyStaticI18n`, `setLang`.

## database/

- **supabase-schema.sql** — исходная схема.
- **supabase-migration-profiles.sql** — мультипользовательские профили.
- **supabase-migration-team.sql** — команда, приглашения.
- **supabase-migration-settings.sql** — приватность телефонов.
- **supabase-migration-accounting.sql** — финансы.
- **supabase-function-has-invite.sql** — функция проверки приглашения.
- **supabase-migration-optimistic-lock.sql** — триггеры updated_at.
- **supabase-insert-owner.sql** — создание владельца.

## tests/

- **tests.html** — запуск модульных тестов.
- **tests.js** — 17 тестов чистых функций.
- **integration.html** — интеграционная страница.
- **integration-tests.js** — 22 теста интерфейса.