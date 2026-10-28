/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Drag&drop броней в календаре (перенос + ресайз) ----------
   Ответственность ТОЛЬКО за перетаскивание полос броней:
   - перенос на другую койку / дату (указатель на теле цветой полосы)
   - изменение срока за правый край (.cal-bar__resize)
   Запись в БД — через updateBookingDates(); сам рендер календаря в 10-calendar.js. */

let calSuppressClick = false; // подавить клик, если была переноска

/* преобразование «день месяца» → дата ISO (берём текущий открытый месяц) */
function calIsoFor(day){
  const { y, m } = calYM;
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function initCalendarDrag(){
  const wrap = document.querySelector('#viewCalendar .cal-wrap');
  if (!wrap) return;
  const bars = wrap.querySelectorAll('.cal-bar');
  bars.forEach(bar => bar.addEventListener('pointerdown', e => startBarDrag(e, bar)));
}

function startBarDrag(e, bar){
  if (e.button !== undefined && e.button !== 0) return; // только левая кнопка
  const booking = state.bookings.find(b => String(b.id) === String(bar.dataset.bar));
  if (!booking) return;

  const container = bar.closest('.cal-days');
  if (!container) return;
  const days = Number(container.style.getPropertyValue('--days')) || 30;
  const rect = container.getBoundingClientRect();
  const dayWidth = rect.width / days;

  const gc = bar.style.gridColumn;                 // "a / span b"
  const m = /(\d+)\s*\/\s*span\s+(\d+)/.exec(gc);
  const s0 = m ? Number(m[1]) : 1;
  const span0 = m ? Number(m[2]) : 1;
  const e0 = s0 + span0 - 1;

  const mode = e.target.closest('.cal-bar__resize') ? 'resize' : 'move';
  const startX = e.clientX, startY = e.clientY;
  let moved = false;
  let bedTarget = booking.bedId;

  bar.setPointerCapture(e.pointerId);
  bar.classList.add('dragging');
  container.classList.add('dragging-active');

  function onMove(ev){
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    const delta = Math.round(dx / dayWidth);

    if (mode === 'move') {
      const newS = Math.min(Math.max(s0 + delta, 1), days - (span0 - 1));
      const newE = newS + span0 - 1;
      bar.style.gridColumnStart = newS;
      bar.style.gridColumnEnd = 'span ' + span0;
      /* подсветка целевой строки (койки) под курсором */
      document.querySelectorAll('.cal-row.drop-row').forEach(r => r.classList.remove('drop-row'));
      const row = rowUnderY(ev.clientY);
      if (row && row.dataset.bed) { row.classList.add('drop-row'); bedTarget = Number(row.dataset.bed); }
    } else { // resize — меняем только конец полосы
      const newE = Math.min(Math.max(e0 + delta, s0 + 1), days + 1);
      bar.style.gridColumnEnd = 'span ' + (newE - s0 + 1);
    }
  }

  function onUp(ev){
    bar.releasePointerCapture(e.pointerId);
    bar.removeEventListener('pointermove', onMove);
    bar.removeEventListener('pointerup', onUp);
    bar.classList.remove('dragging');
    container.classList.remove('dragging-active');
    document.querySelectorAll('.cal-row.drop-row').forEach(r => r.classList.remove('drop-row'));

    if (!moved) return;             // это был обычный клик — пусть откроется модалка
    calSuppressClick = true;        // гасим клик, который браузер сгенерит за pointerup
    setTimeout(() => { calSuppressClick = false; }, 0);

    const gc2 = /(\d+)\s*\/\s*span\s+(\d+)/.exec(bar.style.gridColumn);
    const sNow = gc2 ? Number(gc2[1]) : s0;
    const spanNow = gc2 ? Number(gc2[2]) : span0;
    const eNow = sNow + spanNow - 1;

    if (mode === 'move') {
      const checkin = calIsoFor(sNow);
      const checkout = calIsoFor(eNow + 1); // полоса занимает дни [sNow..eNow], выезд = следующий день
      const bedId = (bedTarget != null && bedTarget !== booking.bedId) ? bedTarget : booking.bedId;
      updateBookingDates(booking.id, bedId, checkin, checkout);
    } else {
      const checkout = calIsoFor(eNow + 1);
      updateBookingDates(booking.id, booking.bedId, booking.checkin, checkout);
    }
  }

  bar.addEventListener('pointermove', onMove);
  bar.addEventListener('pointerup', onUp);
}

function rowUnderY(y){
  const rows = document.querySelectorAll('#viewCalendar .cal-row');
  for (const r of rows) {
    const rr = r.getBoundingClientRect();
    if (y >= rr.top && y <= rr.bottom) return r;
  }
  return null;
}

/* запись перемещённой/продлённой брони в Supabase (RLS разрешает менеджеру своего хостела) */
async function updateBookingDates(id, bedId, checkin, checkout){
  const b = state.bookings.find(x => x.id === id);
  if (!b) return;
  if (typeof saving !== 'undefined') saving++;
  try {
    const { error } = await sb.from('bookings')
      .update({ bed_id: bedId, checkin, checkout })
      .eq('id', id);
    if (error) throw error;
    b.bedId = bedId; b.checkin = checkin; b.checkout = checkout;
    render();
    showToast(t('bk_moved'));
  } catch (e2) {
    const msg = (e2.code === '23P01') ? t('bk_err_clash_remote')
      : (t('bk_err_save') + (e2.message || e2));
    showToast(msg, 'error');
    render(); // вернуть полосу на место
  } finally {
    if (typeof saving !== 'undefined') saving--;
  }
}
