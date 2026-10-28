/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Календарь (шахматка по койкам) ---------- */
let calYM = null;

function renderCalendar(){
  const v = $('#viewCalendar');
  if (!state) { v.innerHTML = ''; return; }
  if (!calYM) { const t = new Date(); calYM = { y: t.getFullYear(), m: t.getMonth() }; }
  const { y, m } = calYM;
  const { from, to, days } = monthRange(y, m);
  const today = todayStr();
  const iso = d => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const head = `<div class="cal-row cal-head">
    <div class="cal-bed">${t('cal_bed_col')}</div>
    <div class="cal-days" style="--days:${days}">
      ${Array.from({length: days}, (_, i) => {
        const d = i + 1, day = iso(d);
        const wd = new Date(y, m, d).getDay();
        return `<div class="cal-cell ${day === today ? 'today' : ''} ${wd === 5 || wd === 6 ? 'weekend' : ''}" style="grid-column:${d}">${d}</div>`;
      }).join('')}
    </div>
  </div>`;

  let rows = '';
  for (const apt of visibleApartments()) {
    /* каждая квартира — своя секция: её липкий заголовок выталкивается следующей,
       а не накладывается на предыдущий */
    const bld = (curBuilding === 'all' && state.buildings.length > 1)
      ? esc(buildingName(apt.buildingId)) + ' · ' : '';
    rows += `<section class="cal-apt-group">
      <div class="cal-apt"><span>${bld}${t('apt')} ${esc(apt.name)} · ${t('floor')} ${esc(apt.floor)}</span></div>`;
      for (const room of apt.rooms) {
        for (const bed of room.beds) {
          /* grid-column задаём ЯВНО: иначе автораскладка перепрыгивает колонки,
             занятые полосами броней, и «сегодня» уезжает вправо */
          const cells = Array.from({length: days}, (_, i) => {
            const day = iso(i + 1);
            return `<div class="cal-cell ${day === today ? 'today' : ''}" style="grid-column:${i + 1}" data-new="${bed.id}|${day}" title="${t('cal_free_hint', {bed: bedLabel(room, bed), date: fmtDate(day)})}"></div>`;
          }).join('');
          /* полосы броней поверх сетки */
          const bars = state.bookings.filter(b => b.bedId === bed.id && b.checkin < to && b.checkout > from)
            .map(b => {
              const s = b.checkin < from ? 1 : new Date(b.checkin).getUTCDate();
              const e = b.checkout > to ? days + 1 : new Date(b.checkout).getUTCDate();
              const span = Math.max(1, e - s);
              const cls = bkStatus(b) === 'past' ? 'past' : (bkStatus(b) === 'future' ? 'future' : 'live');
              const siteCls = (b.source || 'crm') === 'site' ? ' site' : '';
              const who = canSeePhone(b) ? (b.phone || '') : t('phone_hidden');
              return `<div class="cal-bar ${cls}${siteCls}" style="grid-column:${s} / span ${span}"
                data-bar="${b.id}"
                title="${esc(b.guest)} · ${fmtDate(b.checkin)} → ${fmtDate(b.checkout)} · ${cls === 'live' ? t('cal_lives') : cls === 'future' ? t('cal_booked') : t('cal_left')} · ${t('entered_by', {who: authorOf(b)})}${who ? ' · ' + esc(who) : ''}"
                ><span>${esc(b.guest)}</span><span class="cal-bar__resize" title="${t('drag_hint')}"></span></div>`;
            }).join('');
          rows += `<div class="cal-row" data-bed="${bed.id}">
            <div class="cal-bed ${room.type === 'capsule' ? 'capsule' : ''}">
              ${room.type === 'capsule' ? '' : `<i>${esc(room.name)}</i>`}${bedLabel(room, bed)}
            </div>
            <div class="cal-days" style="--days:${days}">${cells}${bars}</div>
          </div>`;
        }
      }
      rows += `</section>`;
    }

  /* заявки с сайта — отдельный блок (файл 16-site-bookings.js) */
  const sitePanel = siteBookingsPanelHtml();

  v.innerHTML = `
    <div class="an-month-nav">
      <button class="btn-icon" id="calPrev" title="${t('prev_month')}">‹</button>
      <h2>${tMonths()[m]} ${y}</h2>
      <button class="btn-icon" id="calNext" title="${t('next_month')}">›</button>
      <span class="an-note">${t('cal_hint')}</span>
    </div>
    <div class="legend cal-legend">
      <span class="l-live"><i></i>${t('cal_live')}</span>
      <span class="l-fut"><i></i>${t('cal_future')}</span>
      <span class="l-pastb"><i></i>${t('cal_past')}</span>
      <span class="l-site"><i></i>${t('from_site')}</span>
      <span class="l-free"><i></i>${t('cal_free')}</span>
    </div>
    <div class="cal-wrap">${head}${rows}</div>
    ${sitePanel}`;
  fitCalendar();
  initCalendarDrag();
}

/* календарь тянем до низа экрана: вся прокрутка — внутри него, страница стоит,
   поэтому строка дат и заголовок квартиры не уезжают */
function fitCalendar(){
  const wrap = document.querySelector('.cal-wrap');
  if (!wrap || $('#viewCalendar').hidden) return;
  const top = wrap.getBoundingClientRect().top;
  const h = Math.max(220, (window.visualViewport?.height || innerHeight) - top - 12);
  wrap.style.maxHeight = h + 'px';
}