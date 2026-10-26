/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Аналитика ---------- */
let anYM = null; // {y, m} — выбранный месяц (m: 0-11)

function fmtSAR(n){ return fmtMoney(Math.round(n)) + ' ₽'; }
function guestKey(b){
  const digits = (b.phone || '').replace(/\D/g, '');
  return digits.length >= 5 ? 't' + digits : 'n' + (b.guest || '').trim().toLowerCase();
}
/* сколько ночей брони попадает в интервал [from, to) (ISO-даты, checkout эксклюзивный) */
function nightsInRange(b, from, to){
  const a = b.checkin  > from ? b.checkin  : from;
  const z = b.checkout < to   ? b.checkout : to;
  return Math.max(0, Math.round((new Date(z) - new Date(a)) / 86400000));
}
function monthRange(y, m){ // [первый день месяца, первый день следующего)
  const p = n => String(n + 1).padStart(2, '0');
  const from = `${y}-${p(m)}-01`;
  const to = m === 11 ? `${y + 1}-01-01` : `${y}-${p(m + 1)}-01`;
  return { from, to, days: new Date(y, m + 1, 0).getDate() };
}
function monthAccrued(y, m){ // начислено за месяц (все брони)
  const { from, to } = monthRange(y, m);
  return state.bookings.reduce((s, b) => s + nightsInRange(b, from, to) * (b.price || 0), 0);
}

function renderAnalytics(){
  const v = $('#viewAnalytics');
  if (!state) { v.innerHTML = ''; return; }
  if (!anYM) { const t = new Date(); anYM = { y: t.getFullYear(), m: t.getMonth() }; }
  const { y, m } = anYM;
  const { from, to, days } = monthRange(y, m);
  const today = todayStr();
  const beds = allBeds();
  const totalBeds = beds.length;

  /* — деньги и оплаты по броням, пересекающим месяц — */
  const monthBk = state.bookings.filter(b => nightsInRange(b, from, to) > 0);
  let accrued = 0, received = 0, debt = 0, paidCnt = 0, unpaidCnt = 0, occNights = 0;
  const debtors = [];
  for (const b of monthBk) {
    const n = nightsInRange(b, from, to);
    occNights += n;
    const sum = n * (b.price || 0);
    accrued += sum;
    if (b.paid) { received += sum; paidCnt++; }
    else {
      debt += sum; unpaidCnt++;
      debtors.push({ b, fullDebt: nightsOf(b) * (b.price || 0) });
    }
  }

  /* — гости: новые, вернувшиеся, выехавшие — */
  const firstByGuest = {};
  for (const b of state.bookings) {
    const k = guestKey(b);
    if (!(k in firstByGuest) || b.checkin < firstByGuest[k]) firstByGuest[k] = b.checkin;
  }
  const monthGuests = new Set(monthBk.map(guestKey));
  let newGuests = 0, returningGuests = 0;
  for (const k of monthGuests) {
    if (firstByGuest[k] >= from && firstByGuest[k] < to) newGuests++;
    else if (firstByGuest[k] < from) returningGuests++;
  }
  let departed = 0;
  for (const b of state.bookings) {
    if (b.checkout >= from && b.checkout < to) {
      const k = guestKey(b);
      if (!state.bookings.some(x => guestKey(x) === k && x.checkin >= b.checkout)) departed++;
    }
  }

  /* — заполняемость, средние — */
  const capacity = totalBeds * days;
  const occPct = capacity ? Math.round(occNights / capacity * 100) : 0;
  const adr = occNights ? accrued / occNights : 0;
  const started = state.bookings.filter(b => b.checkin >= from && b.checkin < to);
  const avgStay = started.length
    ? Math.round(started.reduce((s, b) => s + nightsOf(b), 0) / started.length * 10) / 10 : 0;

  const kpis = `
    <div class="an-kpis">
      <div class="stat"><b>${fmtSAR(accrued)}</b><span>${t('an_accrued')}</span></div>
      <div class="stat s-free"><b>${fmtSAR(received)}</b><span>${t('an_received')}</span></div>
      <div class="stat s-busy"><b>${fmtSAR(debt)}</b><span>${t('an_debt')}</span></div>
      <div class="stat s-free"><b>${paidCnt}</b><span>${t('an_paid_cnt')}</span></div>
      <div class="stat s-busy"><b>${unpaidCnt}</b><span>${t('an_unpaid_cnt')}</span></div>
      <div class="stat"><b>${newGuests}</b><span>${t('an_new')}</span></div>
      <div class="stat"><b>${returningGuests}</b><span>${t('an_return')}</span></div>
      <div class="stat"><b>${departed}</b><span>${t('an_left')}</span></div>
      <div class="stat s-resv"><b>${occPct}%</b><span>${t('an_occ')}</span></div>
      <div class="stat"><b>${fmtSAR(adr)}</b><span>${t('an_adr')}</span></div>
      <div class="stat"><b>${avgStay}</b><span>${t('an_stay')}</span></div>
    </div>`;

  /* — график: загрузка по дням месяца — */
  let dailyBars = '';
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const busy = state.bookings.reduce((s, b) => s + (b.checkin <= iso && iso < b.checkout ? 1 : 0), 0);
    const pct = totalBeds ? Math.round(busy / totalBeds * 100) : 0;
    dailyBars += `<div class="an-bar ${iso === today ? 'today' : ''} ${pct >= 90 ? 'full' : ''}"
      style="height:${Math.max(pct, 2)}%" title="${d} ${tMonthsShort()[m]}: ${t('busy_of', {busy, total: totalBeds, pct})}"></div>`;
  }
  const daily = `<div class="an-card"><h4>${t('an_daily', {month: tMonths()[m]})}</h4>
    <div class="an-chart">${dailyBars}</div>
    <div class="an-chart-x"><span>1</span><span>${Math.round(days / 2)}</span><span>${days}</span></div></div>`;

  /* — график: выручка за 6 месяцев — */
  const revCols = [];
  let maxRev = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    const val = monthAccrued(d.getFullYear(), d.getMonth());
    maxRev = Math.max(maxRev, val);
    revCols.push({ label: tMonthsShort()[d.getMonth()], val, cur: i === 0 });
  }
  const rev = `<div class="an-card"><h4>${t('an_by_month')}</h4><div class="an-chart an-rev">${
    revCols.map(c => `<div class="an-col ${c.cur ? 'cur' : ''}">
      <div class="an-colbar"><i style="height:${maxRev ? Math.max(Math.round(c.val / maxRev * 100), 3) : 3}%"></i></div>
      <b>${c.val ? fmtMoney(Math.round(c.val)) : '·'}</b><span>${c.label}</span></div>`).join('')
  }</div></div>`;

  /* — топ квартир по выручке месяца — */
  const bedApt = {};
  for (const { apt, bed } of beds) bedApt[bed.id] = apt;
  const byApt = new Map();
  for (const b of monthBk) {
    const apt = bedApt[b.bedId];
    if (!apt) continue;
    byApt.set(apt.id, (byApt.get(apt.id) || 0) + nightsInRange(b, from, to) * (b.price || 0));
  }
  const aptRows = [...byApt.entries()]
    .map(([id, sum]) => ({ apt: state.apartments.find(a => a.id === id), sum }))
    .filter(r => r.apt).sort((a, b) => b.sum - a.sum);
  const maxApt = aptRows.length ? aptRows[0].sum : 0;
  const top = `<div class="an-card"><h4>${t('an_top_apts')}</h4>${
    aptRows.length ? aptRows.map(r => `<div class="an-top-row">
        <span class="an-top-name">${t('apt')} ${esc(r.apt.name)}</span>
        <div class="an-top-bar"><i style="width:${maxApt ? Math.max(Math.round(r.sum / maxApt * 100), 2) : 2}%"></i></div>
        <b>${fmtSAR(r.sum)}</b></div>`).join('')
      : `<p class="empty-note">${t('an_no_accruals')}</p>`
  }</div>`;

  /* — должники — */
  debtors.sort((a, b) => b.fullDebt - a.fullDebt);
  const debtTable = `<div class="an-card"><h4>${t('an_debtors')}</h4>${
    debtors.length ? `<div class="table-wrap an-debt-wrap"><table class="bookings-table an-debt-table"><thead>
      <tr><th>${t('th_guest')}</th><th>${t('th_phone')}</th><th>${t('th_place')}</th><th>${t('th_in')}</th><th>${t('th_out')}</th><th>${t('an_debt_per_bk')}</th><th></th></tr></thead><tbody>${
      debtors.map(({ b, fullDebt }) => `<tr>
        <td><b>${esc(b.guest)}</b></td>
        <td>${phoneCell(b)}</td>
        <td><span class="place-chip">${esc(placeLabel(b.bedId))}</span></td>
        <td>${fmtDate(b.checkin)}</td>
        <td>${fmtDate(b.checkout)}</td>
        <td><b>${fmtSAR(fullDebt)}</b></td>
        <td><button class="btn btn-ghost btn-sm" data-mark-paid="${b.id}"><span data-icon="check"></span> ${t('mark_paid')}</button></td>
      </tr>`).join('')
    }</tbody></table></div>`
    : `<p class="empty-note">${t('an_all_paid')}</p>`
  }</div>`;

  v.innerHTML = `
    <div class="an-month-nav">
      <button class="btn-icon" id="anPrev" title="${t('prev_month')}">‹</button>
      <h2>${tMonths()[m]} ${y}</h2>
      <button class="btn-icon" id="anNext" title="${t('next_month')}">›</button>
      <span class="an-note">${t('an_note')}</span>
    </div>
    ${kpis}
    <div class="an-grid2">${daily}${rev}</div>
    ${top}
    ${debtTable}`;
  hydrateIcons(v);
}