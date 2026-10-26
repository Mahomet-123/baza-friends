/* Мост между сайтом и CRM. Пишет заявку в тот же localStorage['hostel_crm_v1'],
   который читает CRM (hostel-booking/app/00-backend.js). Так заявка, оставленная
   на сайте, сразу попадает в CRM-панель менеджера — без сервера и без сети.
   Форма записи и ключ хранилища совпадают с CRM, поэтому система работает как единая.

   Важно: CRM читает bookings, отфильтрованные по owner === hostel.id, а для локального
   хостела hostel.id === 'local'. Поэтому сайт помечает заявку owner:'local' и source:'site'. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const LS_KEY = 'hostel_crm_v1';
  const OWNER = 'local'; // CRM по умолчанию работает с локальным хостелом 'local'

  /* ---------- низкоуровневая работа с БД (та же форма, что в 00-backend.js CRM) ---------- */
  function readDB() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; }
  }
  function writeDB(db) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) { /* квота переполнена — игнорируем */ }
  }
  function ensureDB() {
    let d = readDB();
    if (!d) {
      d = {
        _seq: 0, accounts: [], session: null,
        hostel_members: [], invites: [],
        structure: null, bookings: [], booking_phones: [], finance: [], hostel_settings: null
      };
      writeDB(d);
    }
    d.bookings = d.bookings || [];
    d.booking_phones = d.booking_phones || [];
    d._seq = d._seq || 0;
    return d;
  }
  function nextId(d) { d._seq = (d._seq || 0) + 1; return d._seq; }

  /* ---------- отправить заявку с сайта → пишем в общий store CRM ---------- */
  BF.submitBooking = function (p) {
    const d = ensureDB();
    const id = nextId(d);
    const now = new Date().toISOString();
    const row = {
      id: id,
      bed_id: null,                      // сайт бронирует «объект», а не койку
      guest: p.name || '',
      owner: OWNER,                      // CRM читает bookings where owner='local'
      unit_name: p.unitName || '',       // название объекта (для CRM-таблицы)
      source: 'site',                    // помечаем, что заявка пришла с сайта
      checkin: p.checkin || '',
      checkout: p.checkout || '',
      price: Number(p.price) || 0,
      paid: false,
      note: p.comment || '',
      status: 'new',                     // новая заявка, ждёт подтверждения менеджером
      adults: p.adults || 0,
      kids: p.kids || 0,
      guests: p.guests || 0,
      created_at: now,
      updated_at: now,
      created_by: null
    };
    d.bookings.push(row);
    // телефон клиента — отдельная таблица (CRM хранит телефоны так же)
    if (p.phone) d.booking_phones.push({ booking_id: id, phone: p.phone });
    writeDB(d);
    return id;
  };

  /* ---------- список заявок для админки сайта (#/manager) ---------- */
  BF.listBookings = function () {
    const d = ensureDB();
    const phones = {};
    (d.booking_phones || []).forEach(r => { phones[r.booking_id] = r.phone; });
    return (d.bookings || []).map(r => ({
      id: r.id,
      guest: r.guest || '',
      phone: phones[r.id] || '',
      checkin: r.checkin || '',
      checkout: r.checkout || '',
      adults: r.adults != null ? r.adults : r.guests,
      kids: r.kids || 0,
      guests: r.guests || 0,
      status: r.status || 'new',
      source: r.source || 'crm',
      unit_name: r.unit_name || ''
    }));
  };

  /* ---------- сменить статус заявки (подтвердить/отклонить) в общем store ---------- */
  BF.setBookingStatus = function (id, status) {
    const d = ensureDB();
    const r = d.bookings.find(x => x.id === id);
    if (r) { r.status = status; r.updated_at = new Date().toISOString(); writeDB(d); }
  };
})();
