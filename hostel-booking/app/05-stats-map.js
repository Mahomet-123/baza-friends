/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Статистика ---------- */
function renderStats(){
  const beds = bedsOfVisible();
  let busy = 0, resv = 0;
  for (const {bed} of beds) {
    const st = bedState(bed.id).code;
    if (st==='busy') busy++;
    else if (st==='resv') resv++;
  }
  const total = beds.length;
  const free = total - busy;
  const futureCnt = state.bookings.filter(b=>bkStatus(b)==='future').length;
  const occ = total ? Math.round(busy/total*100) : 0;
  $('#statsBar').innerHTML = `
    <div class="stat"><b>${total}</b><span>${t('st_total')}</span></div>
    <div class="stat s-busy"><b>${busy}</b><span>${t('st_busy')}</span></div>
    <div class="stat s-free"><b>${free}</b><span>${t('st_free')}</span></div>
    <div class="stat s-resv"><b>${futureCnt}</b><span>${t('st_future')}</span></div>
    <div class="stat"><b>${occ}%</b><span>${t('st_occ')}</span></div>`;
}

/* ---------- Карта мест ---------- */
let mapEdit = false;
function renderMap(){
  const v = $('#viewMap');
  const toolbar = `
    <div class="map-toolbar">
      <div class="legend">
        <span class="l-free"><i></i>${t('lg_free')}</span>
        <span class="l-busy"><i></i>${t('lg_busy')}</span>
        <span class="l-resv"><i></i>${t('lg_resv')}</span>
        <span class="l-wood"><i></i>${t('lg_capsule')}</span>
      </div>
      <button class="btn btn-ghost btn-sm ${mapEdit?'edit-on':''}" id="btnMapEdit" title="${t('map_edit_title')}">
        <span data-icon="${mapEdit?'check':'pencil'}"></span>${mapEdit?t('map_done'):t('map_edit')}</button>
    </div>` + renderBuildingBar();
  const cards = visibleApartments().map(apt=>{
    let total=0, busy=0;
    const roomsHtml = apt.rooms.map(room=>{
      const bedsHtml = room.beds.map(bed=>{
        total++;
        const st = bedState(bed.id);
        if (st.code==='busy') busy++;
        let sub = t('lg_free');
        if (st.code==='busy') sub = esc(st.booking.guest);
        if (st.code==='resv') sub = t('from_date', {date: fmtDate(st.booking.checkin)});
        const cls = ['bed', room.type==='capsule'?'capsule':'', st.code!=='free'?st.code:''].join(' ').trim();
        const delBadge = mapEdit ? `<span class="bed-x" data-del-bed="${bed.id}" title="${t('del_bed_title')}">×</span>` : '';
        return `<button class="${cls}" data-bed="${bed.id}">${delBadge}${bedLabel(room,bed)}<small>${sub}</small></button>`;
      }).join('');
      const addBed = `<button class="bed add-bed" data-add-bed="${room.id}">
        <span data-icon="plus"></span><small>${room.type==='capsule'?t('box_word'):t('bed_word')}</small></button>`;
      const rIcon = room.type==='capsule' ? 'box' : 'door';
      const rName = room.type==='capsule' ? esc(roomDisplayName(room)) : `${t('room')} ${esc(room.name)}`;
      const roomDel = mapEdit ? `<button class="btn-icon btn-xs danger" data-del-room-map="${room.id}" title="${t('del_room_title')}"><span data-icon="trash"></span></button>` : '';
      return `<div class="room-block ${room.type}">
        <div class="room-title"><span data-icon="${rIcon}"></span>${rName}${roomDel}</div>
        <div class="beds">${bedsHtml}${addBed}</div>
      </div>`;
    }).join('');
    const aptCtl = mapEdit ? `
        <button class="btn-icon btn-xs" data-edit-apt="${apt.id}" title="${t('ren_apt_title')}"><span data-icon="pencil"></span></button>
        <button class="btn-icon btn-xs danger" data-del-apt-map="${apt.id}" title="${t('del_apt_title')}"><span data-icon="trash"></span></button>` : '';
    return `<div class="apt-card">
      <div class="apt-head">
        <h3>${t('apt')} ${esc(apt.name)}</h3>
        <span class="apt-floor">${t('floor')} ${esc(apt.floor)}</span>
        <span class="apt-occ">${t('occupied_of', {busy, total})}</span>${aptCtl}
      </div>
      <div class="amenities">
        <span class="amenity"><span data-icon="bath"></span>${t('amen_wc')}</span>
        <span class="amenity"><span data-icon="pot"></span>${t('amen_kitchen')}</span>
        <span class="amenity"><span data-icon="sofa"></span>${t('amen_lounge')}</span>
      </div>
      ${roomsHtml}
      <div class="map-add-row">
        <button class="btn btn-dashed btn-sm" data-add-room="${apt.id}"><span data-icon="plus"></span> ${t('add_room')}</button>
        <button class="btn btn-dashed btn-sm" data-add-caps="${apt.id}"><span data-icon="plus"></span> ${t('add_capsules')}</button>
      </div>
    </div>`;
  }).join('');
  const addApt = `<button class="apt-add" data-add-apt><span data-icon="plus"></span> ${t('add_apt')}</button>`;
  v.innerHTML = toolbar + `<div class="apt-grid">${cards}${addApt}</div>`;
  hydrateIcons(v);
}

/* стандартное имя капсульной комнаты показываем на языке интерфейса */
function roomDisplayName(room){
  return (room.type === 'capsule' && (room.name === 'Капсулы' || room.name === 'Capsules')) ? t('capsules') : room.name;
}

/* телефон: видимость решает настройка хостела (её же соблюдает база) */
function phoneCell(b){
  if (canSeePhone(b)) return esc(b.phone) || '—';
  return `<span class="phone-hidden" title="${t('phone_hidden_title')}"><span data-icon="lock"></span> ${t('phone_hidden')}</span>`;
}
