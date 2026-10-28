/* Мост между сайтом и CRM.
   Заявка, оставленная на сайте, уходит в релизный CRM через Edge Function
   create-booking (секрет передаётся в заголовке x-site-key). Админка сайта
   (#/manager) читает и меняет статус заявок через Edge Function
   site-bookings (тот же секрет). Никакого localStorage — всё хранится в
   Supabase, как и в самой CRM, поэтому заявка сразу видна менеджеру в
   календаре и в панели «Заявки с сайта».

   Настройки заполняются при деплое (см. hostel-booking/DEPLOY.md):
   - SUPABASE_URL — адрес вашего проекта Supabase;
   - SITE_KEY     — тот же секрет, что задан в секретах Edge Function
                   (SITE_BOOKING_KEY). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};

  // ⚠️ ЗАМЕНИТЬ ПРИ ДЕПЛОЕ на реальные значения своего проекта:
  const SUPABASE_URL = 'https://juahnruwcfbvrrlruojv.supabase.co';
  const SITE_KEY = 'o1B2s3H4i5Y6s7E8c9R0e9T8n7i6Y5c4L3u2C1h'; // должен совпадать с SITE_BOOKING_KEY Edge Function

  const FN = SUPABASE_URL + '/functions/v1';

  /* универсальный вызов Edge Function с секретом сайта */
  async function call(path, body) {
    const opts = {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-site-key': SITE_KEY,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(FN + path, opts);
    if (!res.ok) {
      let msg = 'http_' + res.status;
      try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    try { return await res.json(); } catch (e) { return null; }
  }

  /* отправить заявку с сайта → Edge Function create-booking */
  BF.submitBooking = async function (p) {
    const r = await call('/create-booking', {
      guest: p.name || '',
      unitName: p.unitName || '',
      phone: p.phone || '',
      checkin: p.checkin || '',
      checkout: p.checkout || '',
      price: Number(p.price) || 0,
      comment: p.comment || '',
      adults: Number(p.adults) || 0,
      kids: Number(p.kids) || 0,
    });
    return r && r.id ? r.id : null;
  };

  /* список заявок для админки сайта (#/manager) */
  BF.listBookings = async function () {
    const data = await call('/site-bookings');
    const rows = (data && data.bookings) || [];
    return rows.map(r => ({
      id: r.id,
      guest: r.guest || '',
      phone: r.phone || '',
      checkin: r.checkin || '',
      checkout: r.checkout || '',
      adults: r.adults != null ? r.adults : r.guests,
      kids: r.kids || 0,
      guests: r.guests || 0,
      status: r.status || 'new',
      source: r.source || 'crm',
      unit_name: r.unit_name || '',
    }));
  };

  /* сменить статус заявки (подтвердить/отклонить) */
  BF.setBookingStatus = async function (id, status) {
    await call('/site-bookings', { id, status });
  };
})();
