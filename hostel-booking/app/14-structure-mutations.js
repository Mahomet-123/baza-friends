/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Структура: мутации ---------- */
function bedsOfRoom(room){ return room.beds.map(b=>b.id); }
function bookingsOnBeds(bedIds){
  return state.bookings.filter(b=>bedIds.includes(b.bedId) && bkStatus(b)!=='past');
}
function addApartment(){
  const bld = curBuilding === 'all' ? state.buildings[0].id : curBuilding;
  const inBld = state.apartments.filter(a => a.buildingId === bld).length;
  state.apartments.push({ id: state.nextId++, buildingId: bld,
    name: String(inBld + 1), floor: 1, rooms: [] });
  save(); render();
}
async function deleteApartment(aptId){
  const apt = state.apartments.find(a=>a.id===aptId);
  if (!apt) return;
  const beds = apt.rooms.flatMap(bedsOfRoom);
  const live = bookingsOnBeds(beds).length;
  const msg = live
    ? t('del_apt_confirm_busy', {name: apt.name, n: live})
    : t('del_apt_confirm', {name: apt.name});
  const ok = await showConfirm(msg, {
    title: t('del_apt_title'),
    okText: t('del_t'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  cloudDeleteBookingsByBeds(beds);
  state.bookings = state.bookings.filter(b=>!beds.includes(b.bedId));
  state.apartments = state.apartments.filter(a=>a.id!==aptId);
  save(); render();
}
function addRoom(aptId, type){
  const apt = state.apartments.find(a=>a.id===aptId);
  if (!apt) return;
  let name;
  if (type==='capsule') name = 'Капсулы'; // храним каноничное имя, показываем переводом
  else {
    const used = apt.rooms.filter(r=>r.type==='room').map(r=>r.name);
    name = 'ABCEFGHKLMN'.split('').find(ch=>!used.includes(ch)) || 'X';
  }
  const room = { id: state.nextId++, name, type, beds: [] };
  const count = 1; // по умолчанию одно место; остальные добавляются вручную
  for (let i=1;i<=count;i++) room.beds.push({ id: state.nextId++, num: i, name: '' });
  apt.rooms.push(room);
  save(); render();
}
async function deleteRoom(roomId){
  for (const apt of state.apartments) {
    const room = apt.rooms.find(r=>r.id===roomId);
    if (!room) continue;
    const beds = bedsOfRoom(room);
    const live = bookingsOnBeds(beds).length;
    const label = room.type==='capsule' ? `«${roomDisplayName(room)}»` : t('room_label', {name: room.name});
    const msg = live
      ? t('del_room_confirm_busy', {n: live, label})
      : t('del_room_confirm', {label, name: apt.name});
    const ok = await showConfirm(msg, {
      title: t('del_room_title'),
      okText: t('del_t'),
      cancelText: t('cancel')
    });
    if (!ok) return;
    cloudDeleteBookingsByBeds(beds);
    state.bookings = state.bookings.filter(b=>!beds.includes(b.bedId));
    apt.rooms = apt.rooms.filter(r=>r.id!==roomId);
    save(); render();
    return;
  }
}
function addBed(roomId){
  for (const apt of state.apartments) {
    const room = apt.rooms.find(r=>r.id===roomId);
    if (!room) continue;
    const num = room.beds.length ? Math.max(...room.beds.map(b=>b.num)) + 1 : 1;
    room.beds.push({ id: state.nextId++, num, name: '' });
    save(); render();
    return;
  }
}
async function removeBed(bedId){
  const f = findBed(bedId);
  if (!f) return;
  const live = bookingsOnBeds([bedId]).length;
  const label = `${f.room.type==='capsule' ? t('box_word') : t('bed_word')} ${bedLabel(f.room, f.bed)}`;
  const msg = live
    ? t('del_bed_confirm_busy', {n: live, label})
    : t('del_bed_confirm', {label, name: f.apt.name});
  const ok = await showConfirm(msg, {
    title: t('del_bed_title'),
    okText: t('del_t'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  cloudDeleteBookingsByBeds([bedId]);
  state.bookings = state.bookings.filter(b=>b.bedId!==bedId);
  f.room.beds = f.room.beds.filter(b=>b.id!==bedId);
  save(); render();
}
async function renameApartment(aptId){
  const apt = state.apartments.find(a=>a.id===aptId);
  if (!apt) return;
  const result = await showApartmentPrompt(apt.name, apt.floor);
  if (result === null) return;
  apt.name = result.name.trim() || apt.name;
  apt.floor = result.floor;
  save(); render();
}
/* переименование койки: пустое значение → вернуть стандартную подпись (Комната-Н / Бокс N) */
async function renameBed(bedId){
  const f = findBed(bedId);
  if (!f) return;
  const result = await showPrompt(t('ren_bed_title', { label: bedLabel(f.room, f.bed) }), {
    title: t('ren_bed_title', { label: bedLabel(f.room, f.bed) }),
    defaultValue: f.bed.name || '',
    okText: t('save'),
    cancelText: t('cancel')
  });
  if (result === null) return;
  f.bed.name = result.trim();
  save(); render();
}
async function resizeRoom(roomId, newCount){
  for (const apt of state.apartments) {
    const room = apt.rooms.find(r=>r.id===roomId);
    if (!room) continue;
    newCount = Math.max(0, Math.min(40, newCount));
    if (newCount > room.beds.length) {
      let num = room.beds.length ? Math.max(...room.beds.map(b=>b.num)) : 0;
      while (room.beds.length < newCount) room.beds.push({ id: state.nextId++, num: ++num, name: '' });
    } else if (newCount < room.beds.length) {
      const removed = room.beds.slice(newCount);
      const live = bookingsOnBeds(removed.map(b=>b.id)).length;
      if (live) {
        const ok = await showConfirm(t('del_beds_confirm', {n: live}), {
          title: t('struct_remove'),
          okText: t('del_t'),
          cancelText: t('cancel')
        });
        if (!ok) { render(); return; }
      }
      const removedIds = removed.map(b=>b.id);
      cloudDeleteBookingsByBeds(removedIds);
      state.bookings = state.bookings.filter(b=>!removedIds.includes(b.bedId));
      room.beds = room.beds.slice(0, newCount);
    }
    save(); render();
    return;
  }
}