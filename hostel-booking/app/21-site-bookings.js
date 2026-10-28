/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Заявки с сайта: панель в календаре + подтверждение/отклонение ----------
   Ответственность ТОЛЬКО за заявки, пришедшие с сайта:
   - блок «Заявки с сайта» под календарём (список + кнопки);
   - смена статуса заявки (новая → подтверждена / отклонена).
   Рендер календаря — 10-calendar.js, перетаскивание — 20-calendar-drag.js. */

/* HTML-блок с заявками с сайта (пустая строка, если заявок нет) */
function siteBookingsPanelHtml(){
  if (!state) return '';
  const list = state.bookings.filter(b => (b.source || 'crm') === 'site');
  if (!list.length) return '';
  const order = { new: 0, confirmed: 1, rejected: 2 };
  const sorted = [...list].sort((a, b) => {
    const d = (order[a.status || 'new'] ?? 9) - (order[b.status || 'new'] ?? 9);
    return d !== 0 ? d : (a.checkin < b.checkin ? -1 : 1);
  });
  const rows = sorted.map(b => {
    const st = b.status || 'new';
    const acts = st === 'new'
      ? `<button class="btn btn-sm btn-primary" data-site-confirm="${b.id}">${t('bk_confirm')}</button>
         <button class="btn btn-sm btn-ghost" data-site-reject="${b.id}">${t('bk_reject')}</button>`
      : '';
    return `<div class="site-booking ${st}">
      <div class="sb-main"><b>${esc(b.guest)}</b> · ${esc(b.unitName || t('bk_unit'))}
        <div class="sb-dates">${fmtDate(b.checkin)} → ${fmtDate(b.checkout)}</div>
        ${b.note ? `<div class="sb-note">${esc(b.note)}</div>` : ''}
      </div>
      <span class="pill src-${st}">${t('st_' + st)}</span>
      <div class="sb-acts">${acts}</div>
    </div>`;
  }).join('');
  return `<div class="site-bookings-panel">
    <h3>${t('cal_site_bookings')}</h3>
    <div class="site-bookings-list">${rows}</div>
  </div>`;
}

/* сменить статус заявки с сайта (подтвердить / отклонить) */
async function setSiteBookingStatus(id, status){
  const b = state.bookings.find(x => String(x.id) === String(id));
  if (!b) return;
  saving++;
  try {
    const { error } = await sb.from('bookings').update({ status }).eq('id', b.id);
    if (error) throw error;
    b.status = status;
    render();
    showToast(status === 'confirmed' ? t('site_confirmed') : t('site_rejected'));
  } catch (e2) {
    showToast(t('bk_err_save') + (e2.message || e2), 'error');
  } finally {
    saving--;
  }
}
