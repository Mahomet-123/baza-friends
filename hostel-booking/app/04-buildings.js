/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Здания ---------- */
let curBuilding = 'all';   // 'all' | id здания

/* у старых данных зданий нет — заводим одно и складываем в него все квартиры */
function ensureBuildings(){
  if (!state) return false;
  let changed = false;
  if (!Array.isArray(state.buildings) || !state.buildings.length) {
    state.buildings = [{ id: state.nextId++, name: t('building_n', {n: 1}) }];
    changed = true;
  }
  const first = state.buildings[0].id;
  for (const apt of state.apartments) {
    if (!apt.buildingId || !state.buildings.some(b => b.id === apt.buildingId)) {
      apt.buildingId = first; changed = true;
    }
  }
  return changed;
}
const buildingName = id => state.buildings.find(b => b.id === id)?.name || '—';
/* квартиры выбранного здания (или все) */
function visibleApartments(){
  if (curBuilding === 'all') return state.apartments;
  return state.apartments.filter(a => a.buildingId === curBuilding);
}
function bedsOfVisible(){
  const out = [];
  for (const apt of visibleApartments())
    for (const room of apt.rooms)
      for (const bed of room.beds)
        out.push({ apt, room, bed });
  return out;
}
function renderBuildingBar(){
  if (state.buildings.length < 2 && !mapEdit) return ''; // одно здание — не мозолим глаза
  const chip = (id, name, active) =>
    `<button class="bld-chip ${active ? 'on' : ''}" data-bld="${id}">${esc(name)}</button>`;
  const chips = [chip('all', t('all_buildings'), curBuilding === 'all')]
    .concat(state.buildings.map(b => chip(b.id, b.name, curBuilding === b.id)));
  const edit = mapEdit ? `
    <button class="bld-chip add" data-add-bld>${t('add_building')}</button>
    ${curBuilding !== 'all' ? `
      <button class="btn-icon btn-xs" data-ren-bld="${curBuilding}" title="${t('bld_ren_title')}"><span data-icon="pencil"></span></button>
      <button class="btn-icon btn-xs danger" data-del-bld="${curBuilding}" title="${t('bld_del_title')}"><span data-icon="trash"></span></button>` : ''}` : '';
  return `<div class="bld-bar"><span class="bld-label" data-icon="building"></span>${chips.join('')}${edit}</div>`;
}
function pickBuilding(id){
  curBuilding = id === 'all' ? 'all' : Number(id);
  localStorage.setItem('hostel_bld_' + hostel.id, String(curBuilding));
  render();
}
async function addBuilding(){
  const name = await showPrompt(t('bld_name_prompt'), {
    title: t('add_building'),
    defaultValue: t('building_n', {n: state.buildings.length + 1})
  });
  if (name === null) return;
  const b = { id: state.nextId++, name: name.trim() || t('building_n', {n: state.buildings.length + 1}) };
  state.buildings.push(b);
  curBuilding = b.id;
  localStorage.setItem('hostel_bld_' + hostel.id, String(b.id)); // иначе выбор слетит при перечитывании
  await persistStructure();   // дожидаемся записи, потом рисуем
  render();
}
async function renameBuilding(id){
  const b = state.buildings.find(x => x.id === id);
  if (!b) return;
  const name = await showPrompt(t('bld_name_prompt'), {
    title: t('bld_ren_title'),
    defaultValue: b.name
  });
  if (name === null) return;
  b.name = name.trim() || b.name;
  await persistStructure();
  render();
}
async function deleteBuilding(id){
  if (state.buildings.length < 2) { alert(t('bld_last')); return; }
  const apts = state.apartments.filter(a => a.buildingId === id);
  if (apts.length) {
    alert(`В здании «${buildingName(id)}» ещё ${apts.length} квартир(ы).\n` +
          'Сначала перенесите их в другое здание или удалите — во вкладке «Структура».');
    return;
  }
  const ok = await showConfirm(t('bld_del_confirm', {name: buildingName(id)}), {
    title: t('bld_del_title'),
    okText: t('del_t'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  state.buildings = state.buildings.filter(b => b.id !== id);
  curBuilding = 'all';
  localStorage.setItem('hostel_bld_' + hostel.id, 'all');
  await persistStructure();
  render();
}