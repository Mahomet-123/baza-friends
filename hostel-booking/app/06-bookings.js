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
  const order = { active:0, future:1, past:2 };
  const rows = state.bookings
    .filter(b=>{
      const st = bkStatus(b);
      if (stFilter!=='all' && st!==stFilter) return false;
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
    const n = nightsOf(b);
    const sum = b.price ? fmtSAR(n * b.price) : '—';
    return `<tr>
      <td><b>${esc(b.guest)}</b>${b.source==='site'?` <span class="tag" style="background:#E1F5EE;color:#0F6E56">${t('from_site')}</span>`:''}${b.note?`<div class="note-cell">${esc(b.note)}</div>`:''}
        <div class="note-cell">${t('entered_by', {who: authorOf(b)})}</div></td>
      <td>${phoneCell(b)}</td>
      <td><span class="place-chip">${esc(placeLabel(b.bedId, b.unit_name))}</span></td>
      <td>${fmtDate(b.checkin)}</td>
      <td>${fmtDate(b.checkout)}</td>
      <td>${n}</td>
      <td>${sum}</td>
      <td><span class="pill ${b.paid?'paid':'unpaid'}">${b.paid?t('paid'):t('unpaid')}</span></td>
      <td><span class="pill ${st}">${stName[st]}</span></td>
      <td><div class="row-actions">
        <button class="btn-icon" data-edit="${b.id}" title="${t('edit_t')}"><span data-icon="pencil"></span></button>
        <button class="btn-icon" data-del="${b.id}" title="${t('del_t')}"><span data-icon="trash"></span></button>
      </div></td>
    </tr>`;
  }).join('');
  $('#bookingsEmpty').hidden = rows.length > 0;
  hydrateIcons($('#bookingsBody'));
}