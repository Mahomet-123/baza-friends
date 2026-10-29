/* Мост между сайтом и CRM.
   Заявка, оставленная на сайте, уходит в релизный CRM через Edge Function
   create-booking (секрет передаётся в заголовке x-site-key). Админка сайта
   (#/manager) читает и меняет статус заявок через Edge Function
   site-bookings (тот же секрет). Никакого localStorage — всё хранится в
   Supabase, как и в самой CRM, поэтому заявка сразу видна менеджеру в
   календаре и в панели «Заявки с сайта».

   Кроме того, сайт подгружает структуру объектов (категории = апартаменты CRM,
   юниты = комнаты) через Edge Function public-structure и перестраивает каталог
   ровно по той планировке, что заведена в CRM.

   Настройки заполняются при деплое (см. hostel-booking/DEPLOY.md):
   - SUPABASE_URL — адрес вашего проекта Supabase;
   - SUPABASE_KEY — публичный (publishable) ключ того же проекта: его требует
                   шлюз Edge Functions в заголовке apikey;
   - SITE_KEY     — тот же секрет, что задан в секретах Edge Function
                   (SITE_BOOKING_KEY). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};

  // ⚠️ ЗАМЕНИТЬ ПРИ ДЕПЛОЕ на реальные значения своего проекта:
  const SUPABASE_URL = 'https://juahnruwcfbvrrlruojv.supabase.co';
  const SITE_KEY = 'o1B2s3H4i5Y6s7E8c9R0e9T8n7i6Y5c4L3u2C1h'; // должен совпадать с SITE_BOOKING_KEY Edge Function
  // публичный (publishable) ключ проекта: шлюз Edge Functions требует его
  // в заголовке apikey даже при выключенной JWT-проверке. Ключ публичный —
  // он и так рассчитан на то, чтобы быть в браузере (RLS всё равно держит).
  const SUPABASE_KEY = 'sb_publishable_xBMrQ8eigUTt-ByLx5z6eA_rsmTysSb';

  const FN = SUPABASE_URL + '/functions/v1';

  // палитра цветов для категорий (по индексу апартамента в CRM)
  const PALETTE = ['#5DCAA5', '#1D9E75', '#0F6E56', '#3AA0C2', '#E0A23B'];

  /* универсальный вызов Edge Function с секретом сайта */
  async function call(path, body) {
    const opts = {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
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

  /* загрузить структуру CRM и перестроить каталог сайта.
     Возвращает true, если структура успешно применилась. */
  BF.loadStructure = async function () {
    try {
      const data = await call('/public-structure');
      if (data && data.ok) {
        BF.buildUnitsFromStructure(data);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('loadStructure failed, используем демо-данные:', e.message);
      return false;
    }
  };

  /* построить CATEGORIES (апартаменты) и UNITS (комнаты) из ответа CRM.
     Сохраняем также «сырую» занятость, чтобы помечать «занято» на сайте. */
  BF.buildUnitsFromStructure = function (data) {
    const cats = (data.categories || []).map((c, i) => ({
      id: c.id,
      name_ru: c.name, name_en: c.name,
      short_ru: c.name, short_en: c.name,
      count: c.roomCount || 0,
      price: c.resolvedPrice || 0,
      icon: ['bed', 'home', 'building'][i % 3],
      color: PALETTE[i % PALETTE.length],
    }));

    const units = (data.units || []).map(u => {
      const cat = cats.find(c => c.id === u.categoryId) || {};
      const color = cat.color || '#1D9E75';
      const code = u.name || ('#' + u.id);
      return {
        id: u.id,
        category: u.categoryId,
        code: code,
        name_ru: u.name || ('Объект ' + u.id),
        name_en: u.name || ('Unit ' + u.id),
        price: u.price || 0,
        capacity: Math.max(1, u.beds || 1) * 2,   // оценка: ~2 гостя на койку
        beds: u.beds || 1,
        amenities: ['Wi-Fi', 'Кондиционер', 'Санузел'],
        desc_ru: 'Объект базы отдыха «Объект».',
        desc_en: 'Recreation base unit.',
        photoColor: color,
        photos: [
          { svg: makeScene('exterior', color, code), labelKey: 'photo_ext' },
          { svg: makeScene('interior', color, code), labelKey: 'photo_int' },
          { svg: makeScene('view', color, code),     labelKey: 'photo_view' },
          { svg: makeScene('terrace', color, code),  labelKey: 'photo_terr' },
        ],
        active: true,
        bedsDetail: u.bedsDetail || [],
      };
    });

    // индекс bed_id по юниту — для быстрого подсчёта занятости
    const bedsByUnit = {};
    units.forEach(u => { bedsByUnit[u.id] = (u.bedsDetail || []).map(b => b.id); });

    CATEGORIES = cats;
    UNITS = units;
    BF._occupancy = data.occupancy || [];
    BF._unitsBeds = bedsByUnit;
    return { categories: cats, units };
  };

  /* сколько свободных коек у юнита на диапазон [ci, co).
     -1 — неизвестно (нет данных CRM), 0 — всё занято, >0 — есть свободные. */
  BF.unitFreeBeds = function (unitId, ci, co) {
    if (!BF._occupancy || !BF._unitsBeds) return -1;
    const beds = BF._unitsBeds[String(unitId)] || [];
    if (!beds.length) return -1;
    let free = 0;
    for (const bedId of beds) {
      const taken = BF._occupancy.some(o =>
        o.bedId === bedId &&
        o.status !== 'rejected' &&
        o.checkin < co && o.checkout > ci
      );
      if (!taken) free++;
    }
    return free;
  };

  /* отправить заявку с сайта → Edge Function create-booking */
  BF.submitBooking = async function (p) {
    const r = await call('/create-booking', {
      guest: p.name || '',
      unitId: p.unitId != null ? String(p.unitId) : '',
      unitName: p.unitName || '',
      phone: p.phone || '',
      checkin: p.checkin || '',
      checkout: p.checkout || '',
      price: Number(p.price) || 0,
      prepaid: Number(p.prepaid) || 0,
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
