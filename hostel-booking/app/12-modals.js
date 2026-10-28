/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Модалки ---------- */
function openModal(id){ $('#'+id).hidden = false; }
function closeModal(id){ $('#'+id).hidden = true; }

let currentBedId = null;
function openBedModal(bedId){
  const f = findBed(bedId);
  if (!f) return;
  currentBedId = bedId;
  $('#bedModalTitle').textContent =
    `${t('apt')} ${f.apt.name} · ${f.room.type==='capsule' ? '' : t('room')+' '+f.room.name+' · '}${bedLabel(f.room, f.bed)}`;
  const st = bedState(bedId);
  const pill = st.code==='busy'
    ? `<span class="pill active">${t('lg_busy')}</span>`
    : st.code==='resv' ? `<span class="pill future">${t('lg_resv')}</span>`
    : `<span class="pill paid">${t('lg_free')}</span>`;
  const list = bedBookings(bedId);
  const cur = list.filter(b=>bkStatus(b)!=='past').sort((a,b)=>a.checkin<b.checkin?-1:1);
  const past = list.filter(b=>bkStatus(b)==='past').sort((a,b)=>a.checkin>b.checkin?-1:1).slice(0,5);
  const item = b=>{
    const st2 = bkStatus(b);
    return `<div class="bk-item ${st2}">
      <div class="bk-main">
        <b>${esc(b.guest)}</b> · ${phoneCell(b)}
        <div class="bk-dates">${t('entered_by', {who: authorOf(b)})} · ${fmtDate(b.checkin)} → ${fmtDate(b.checkout)} (${nightsOf(b)} ${t('nights_short')})
          ${b.price?` · ${fmtSAR(nightsOf(b)*b.price)}`:''} · ${b.paid?t('paid'):t('unpaid')}
          ${b.note?`<br>${esc(b.note)}`:''}</div>
      </div>
      ${st2==='active'?`<button class="btn btn-ghost btn-sm" data-checkout="${b.id}"><span data-icon="check"></span> ${t('evict')}</button>`:''}
      <button class="btn-icon" data-edit="${b.id}" title="${t('edit_t')}"><span data-icon="pencil"></span></button>
      <button class="btn-icon" data-del="${b.id}" title="${t('del_t')}"><span data-icon="trash"></span></button>
    </div>`;
  };
  $('#bedModalBody').innerHTML = `
    <div class="bed-status-line">${pill}
      <button class="btn btn-primary btn-sm" id="btnBedNewBooking"><span data-icon="plus"></span> ${t('checkin_now')}</button>
    </div>
    ${cur.length ? cur.map(item).join('') : `<p class="empty-note">${t('no_active_bookings')}</p>`}
    ${past.length ? `<div class="bk-past-head">${t('history')}</div>${past.map(item).join('')}` : ''}`;
  hydrateIcons($('#bedModalBody'));
  openModal('bedModal');
}

let editingId = null;
let editingUpdatedAt = null; // для оптимистичной блокировки
function fillBedSelect(selectedBedId){
  const sel = $('#bkBed');
  sel.innerHTML = state.apartments.map(apt=>{
    const opts = apt.rooms.map(room=>room.beds.map(bed=>{
      const st = bedState(bed.id).code;
      const mark = st==='busy' ? t('bed_busy_mark') : st==='resv' ? t('bed_resv_mark') : '';
      return `<option value="${bed.id}" ${bed.id===selectedBedId?'selected':''}>${bedLabel(room,bed)}${mark}</option>`;
    }).join('')).join('');
    const bld = state.buildings.length > 1 ? buildingName(apt.buildingId) + ' · ' : '';
    return `<optgroup label="${esc(bld)}${t('apt')} ${esc(apt.name)} (${t('floor')} ${esc(apt.floor)})">${opts}</optgroup>`;
  }).join('');
}
function openBookingModal(bedId, booking){
  editingId = booking ? booking.id : null;
  editingUpdatedAt = booking?.updatedAt || null;
  $('#bookingModalTitle').textContent = booking ? t('edit_booking') : t('new_booking');
  fillBedSelect(booking ? booking.bedId : bedId);
  $('#bkGuest').value = booking?.guest || '';
  /* чужую бронь править можно, но телефон её клиента скрыт и недоступен */
  const hidden = booking && !canSeePhone(booking); // чужой телефон скрыт настройкой
  const ph = $('#bkPhone');
  ph.disabled = !!hidden;
  ph.value = hidden ? '' : (booking?.phone || '');
  ph.placeholder = hidden ? t('bk_phone_hidden_ph') : '+7 …';
  const today = todayStr();
  const tomorrow = (()=>{ const d=new Date(today); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  $('#bkIn').value  = booking?.checkin  || today;
  $('#bkOut').value = booking?.checkout || tomorrow;
  $('#bkPrice').value = booking?.price ?? '';
  $('#bkPrepaid').value = booking?.prepaid ?? '';
  $('#bkPaid').checked = !!booking?.paid;
  $('#bkNote').value = booking?.note || '';
  $('#bkError').hidden = true;
  recalcBookingTotal();
  openModal('bookingModal');
  $('#bkGuest').focus();
}

/* автопересчёт «Итого» = цена за ночь × количество ночей */
function recalcBookingTotal(){
  const price = Number($('#bkPrice').value) || 0;
  const inD = $('#bkIn').value, outD = $('#bkOut').value;
  let n = 0;
  if (inD && outD) {
    const diff = (new Date(outD) - new Date(inD)) / 86400000;
    n = Math.max(0, Math.round(diff));
  }
  const total = price * n;
  $('#bkTotal').value = total ? fmtSAR(total) : '—';
  return total;
}
async function saveBookingFromForm(e){
  e.preventDefault();
  const bedId = Number($('#bkBed').value);
  const checkin = $('#bkIn').value, checkout = $('#bkOut').value;
  const err = $('#bkError');
  if (!checkin || !checkout || checkout <= checkin) {
    err.textContent = t('bk_err_dates');
    err.hidden = false; return;
  }
  const clash = state.bookings.find(b =>
    b.bedId === bedId && b.id !== editingId &&
    b.checkin < checkout && checkin < b.checkout);
  if (clash) {
    err.textContent = t('bk_err_clash', {guest: clash.guest, in: fmtDate(clash.checkin), out: fmtDate(clash.checkout)});
    err.hidden = false; return;
  }
  const data = {
    bedId, checkin, checkout,
    guest: $('#bkGuest').value.trim(),
    phone: $('#bkPhone').value.trim(),
    price: Number($('#bkPrice').value) || 0,
    paid: $('#bkPaid').checked,
    prepaid: Number($('#bkPrepaid').value) || 0,
    note: $('#bkNote').value.trim(),
  };
  const btn = $('#bkSubmit');
  btn.disabled = true; btn.textContent = t('saving');
  saving++; // блокируем автообновление во время записи
  try {
    if (editingId) {
      const old = state.bookings.find(x=>x.id===editingId);
      const { data: updatedRows, error } = await sb.from('bookings')
        .update(bkToRow(data))
        .eq('id', editingId)
        .eq('updated_at', editingUpdatedAt)
        .select();
      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(t('bk_optimistic_conflict'));
      }
      const updatedRow = updatedRows[0];
      if (canSeePhone(old)) await savePhone(editingId, data.phone); // скрытый телефон не трогаем
      else data.phone = old.phone;
      Object.assign(old, rowToBk(updatedRow, { [updatedRow.id]: canSeePhone(old) ? data.phone : old.phone }));
    } else {
      const { data: row, error } = await sb.from('bookings').insert(bkToRow(data)).select().single();
      if (error) throw error;
      await savePhone(row.id, data.phone);
      state.bookings.push(rowToBk(row, { [row.id]: data.phone }));
    }
  } catch(e2) {
    let msg = e2.code === '23P01'
      ? t('bk_err_clash_remote')
      : (e2.message === t('bk_optimistic_conflict') ? t('bk_optimistic_conflict') : t('bk_err_save') + (e2.message || e2));
    err.textContent = msg;
    showToast(msg, 'error');
    err.hidden = false;
    btn.disabled = false; btn.textContent = t('save');
    saving--; // снимаем блокировку при ошибке
    return;
  }
  saving--; // снимаем блокировку после успешного сохранения
  btn.disabled = false; btn.textContent = t('save');
  closeModal('bookingModal');
  if (currentBedId && !$('#bedModal').hidden) openBedModal(currentBedId);
  render();
}