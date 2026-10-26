/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Структура ---------- */
function renderStructure(){
  const v = $('#structureList');
  v.innerHTML = state.apartments.map(apt=>{
    const rooms = apt.rooms.map(room=>{
      const kind = room.type==='capsule' ? t('struct_caps_kind') : t('struct_room_kind');
      const nameInput = `<input type="text" value="${esc(room.name)}" maxlength="20"
        data-room-name="${room.id}" title="${t('struct_name_title')}">`;
      return `<div class="struct-room ${room.type}">
        <span class="room-kind">${kind}</span>
        ${nameInput}
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)">
          ${t('struct_beds')} <input type="number" min="0" max="40" value="${room.beds.length}" data-room-beds="${room.id}">
        </label>
        <span class="grow"></span>
        <button class="btn btn-danger btn-sm" data-del-room="${room.id}"><span data-icon="trash"></span> ${t('struct_remove')}</button>
      </div>`;
    }).join('');
    const bldSelect = `<label class="field"><span>${t('struct_building')}</span>
      <select class="select" data-apt-bld="${apt.id}">${
        state.buildings.map(b => `<option value="${b.id}" ${b.id === apt.buildingId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')
      }</select></label>`;
    return `<div class="struct-apt">
      <div class="struct-apt-head">
        ${bldSelect}
        <label class="field"><span>${t('struct_apt_name')}</span>
          <input type="text" value="${esc(apt.name)}" maxlength="20" data-apt-name="${apt.id}"></label>
        <label class="field"><span>${t('struct_floor')}</span>
          <input type="number" value="${esc(apt.floor)}" min="0" max="99" data-apt-floor="${apt.id}"></label>
        <button class="btn btn-danger" data-del-apt="${apt.id}"><span data-icon="trash"></span> ${t('struct_del_apt')}</button>
      </div>
      <div class="struct-rooms">${rooms}</div>
      <div class="struct-add-row">
        <button class="btn btn-ghost btn-sm" data-add-room="${apt.id}"><span data-icon="plus"></span> ${t('add_room')}</button>
        <button class="btn btn-ghost btn-sm" data-add-caps="${apt.id}"><span data-icon="plus"></span> ${t('add_capsules')}</button>
      </div>
    </div>`;
  }).join('');
  hydrateIcons(v);
}