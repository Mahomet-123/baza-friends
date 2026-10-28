/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Таблица броней ---------- */
function renderAptFilter(){
  const sel = $('#filterApt');
  const cur = sel.value;
  sel.innerHTML = `<option value="">${t('f_all_apts')}</option>` +
    state.apartments.map(a=>`<option value="${a.id}">${t('apt')} ${esc(a.name)}</option>`).join('');
  if ([...sel.options].some(o=>o.value===cur)) sel.value = cur;
}
function renderBookings(){
  const q = $('#searchBookings').value.trim().toLowerCase();
  const aptId = $('#filterApt').value;
  const stFilter = $('#filterStatus').value;
  const srcFilter = $('#filterSource').value;
  const order = { active:0, future:1, past:2 };
  const rows = state.bookings
    .filter(b=>{
      const st = bkStatus(b);
      if (stFilter!=='all' && st!==stFilter) return false;
      if (srcFilter!=='all' && (b.source||'crm')!==srcFilter) return false;
      if (aptId) {
        const f = findBed(b.bedId);
        if (!f || String(f.apt.id)!==aptId) return false;
      }
      if (q && !(`${b.guest} ${b.phone||''}`.toLowerCase().includes(q))) return false;
      return true;
    })
    .sort((a,b)=>{
      const d = order[bkStatus(a)] - order[bkStatus(b)];
      return d !== 0 ? d : (a.checkin < b.checkin ? -1 : 1);
    });
  const stName = { active:t('s_active'), future:t('s_future'), past:t('s_past') };
  $('#bookingsBody').innerHTML = rows.map(b=>{
    const st = bkStatus(b);
    const isSite = (b.source||'crm')==='site';
    const n = nightsOf(b);
    const sum = b.price ? fmtSAR(n * b.price) : '—';
    const prep = b.prepaid ? fmtSAR(b.prepaid) : '—';
    const place = isSite
      ? `<span class="place-chip">${esc(b.unitName||t('bk_unit'))}</span> <span class="pill site">${t('from_site')}</span>`
      : `<span class="place-chip">${esc(placeLabel(b.bedId))}</span>`;
    const srcStatus = isSite ? `<span class="pill src-${b.status||'new'}">${t('st_'+(b.status||'new'))}</span> ` : '';
    return `<tr>
      <td><b>${esc(b.guest)}</b>${b.note?`<div class="note-cell">${esc(b.note)}</div>`:''}
        <div class="note-cell">${t('entered_by', {who: authorOf(b)})}</div></td>
      <td>${phoneCell(b)}</td>
      <td>${place}</td>
      <td>${fmtDate(b.checkin)}</td>
      <td>${fmtDate(b.checkout)}</td>
      <td>${n}</td>
      <td>${sum}</td>
      <td>${prep}</td>
      <td>${sum}</td>
      <td><span class="pill ${b.paid?'paid':'unpaid'}">${b.paid?t('paid'):t('unpaid')}</span></td>
      <td><span class="pill ${st}">${stName[st]}</span> ${srcStatus}</td>
      <td><div class="row-actions">
        <button class="btn-icon" data-edit="${b.id}" title="${t('edit_t')}"><span data-icon="pencil"></span></button>
        <button class="btn-icon" data-del="${b.id}" title="${t('del_t')}"><span data-icon="trash"></span></button>
      </div></td>
    </tr>`;
  }).join('');
  $('#bookingsEmpty').hidden = rows.length > 0;
  hydrateIcons($('#bookingsBody'));
}