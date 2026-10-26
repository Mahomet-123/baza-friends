/* ===== Хостел · бронирование коек ===== */
'use strict';

/* определить хостел и роль (локально — без облака и приглашений) */
async function resolveHostel(){
  const { data: { user } } = await sb.auth.getUser();
  me = user.id; myEmail = user.email;
  const myName = (user.user_metadata && user.user_metadata.name) || '';

  let { data: mems } = await sb.from('hostel_members').select('*');
  let mine = (mems || []).filter(m => m.user_id === me);

  // первый вход этого аккаунта — делаем его владельцем локального хостела
  if (!mine.length) {
    await sb.from('hostel_members').upsert(
      { user_id: me, hostel_id: 'local', role: 'owner', email: myEmail, name: myName },
      { onConflict: 'user_id' });
    ({ data: mems } = await sb.from('hostel_members').select('*'));
    mine = (mems || []).filter(m => m.user_id === me);
  }

  const saved = localStorage.getItem('hostel_pick');
  const pick = mine.find(m => m.hostel_id === saved) || mine.find(m => m.role === 'owner') || mine[0];
  hostel = { id: pick.hostel_id, role: pick.role };
  members = (mems || []).filter(m => m.hostel_id === hostel.id);
  myHostels = mine;
  allMembers = mems || [];
  invites = []; // в автономном режиме приглашений нет
}
let myHostels = [], allMembers = [];
let structureUpdatedAt = null; // для оптимистичной блокировки структуры

/* переключатель, если человек работает в нескольких хостелах (свой + чужой как менеджер) */
function renderHostelSwitch(){
  const sel = $('#hostelSwitch');
  if (myHostels.length < 2) { sel.hidden = true; return; }
  sel.innerHTML = myHostels.map(m => {
    const ownerEmail = allMembers.find(x => x.hostel_id === m.hostel_id && x.role === 'owner')?.email || '';
    const label = m.role === 'owner' ? t('my_hostel') : t('hostel_of', {name: ownerEmail.split('@')[0]});
    return `<option value="${m.hostel_id}" ${m.hostel_id === hostel.id ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('');
  sel.hidden = false;
}

async function cloudLoad(){
  const [s, b, p, f, st] = await Promise.all([
    sb.from('structure').select('data, updated_at').eq('owner', hostel.id).maybeSingle(),
    sb.from('bookings').select('*').eq('owner', hostel.id).order('checkin'),
    sb.from('booking_phones').select('booking_id,phone'), // RLS отдаст по настройке приватности
    sb.from('finance').select('*').eq('owner', hostel.id),
    sb.from('hostel_settings').select('private_phones').eq('hostel_id', hostel.id).maybeSingle(),
  ]);
  if (s.error) throw s.error;
  if (b.error) throw b.error;
  if (p.error) throw p.error;
  settings = { privatePhones: !!st.data?.private_phones };
  if (f.error) throw f.error;
  finance = (f.data || []).map(finRow);
  if (!s.data) {
    if (isOwner()) { await firstRunMigration(); return; }
    state = { apartments: [], nextId: 1, bookings: [] }; // владелец ещё не настроил хостел
    return;
  }
  const phones = {};
  for (const row of (p.data || [])) phones[row.booking_id] = row.phone;
  structureUpdatedAt = s.data.updated_at;
  state = {
    apartments: s.data.data.apartments,
    buildings: s.data.data.buildings || [],
    nextId: s.data.data.nextId || 1,
    bookings: (b.data || []).map(r => rowToBk(r, phones)),
  };
  if (ensureBuildings()) persistStructure();   // старые данные: заводим «Здание 1»
  const savedBld = localStorage.getItem('hostel_bld_' + hostel.id);
  curBuilding = (savedBld && savedBld !== 'all' && state.buildings.some(b2 => b2.id === Number(savedBld)))
    ? Number(savedBld) : 'all';
}

/* первый запуск профиля: создаём в облаке дефолтную планировку */
async function firstRunMigration(){
  saving++; // блокируем автообновление во время создания структуры
  try {
    const base = defaultData();
    const { error } = await sb.from('structure')
      .insert({ owner: hostel.id, id: 1, data: { apartments: base.apartments, nextId: base.nextId } });
    if (error && error.code !== '23505') throw error; // 23505 = другое устройство успело первым
    await cloudLoad();
  } finally {
    saving--;
  }
}

/* сохранить планировку (квартиры/комнаты/койки) в облако */
let saving = 0;   // пока идёт запись — автообновление не трогает state (иначе затрёт правку)
async function persistStructure(){
  saving++;
  try {
    const { data: updatedRows, error } = await sb.from('structure')
      .update({ data: { apartments: state.apartments, buildings: state.buildings, nextId: state.nextId } })
      .eq('owner', hostel.id)
      .eq('updated_at', structureUpdatedAt)
      .select();
    if (error) {
      showToast(t('save_struct_fail') + error.message, 'error');
      return;
    }
    if (!updatedRows || updatedRows.length === 0) {
      // Кто-то изменил структуру за время нашей работы
      showToast(t('struct_optimistic_conflict'), 'error');
      await cloudLoad(); // перезагружаем актуальные данные
      render();
      return;
    }
    structureUpdatedAt = updatedRows[0].updated_at;
  } finally { saving--; }
}

/* телефон брони: своя таблица, доступна только автору брони */
async function savePhone(bookingId, phone){
  saving++; // блокируем автообновление во время записи
  try {
    if (phone) {
      const { error } = await sb.from('booking_phones')
        .upsert({ booking_id: bookingId, phone }, { onConflict: 'booking_id' });
      if (error) console.warn('phone save:', error.message);
    } else {
      await sb.from('booking_phones').delete().eq('booking_id', bookingId);
    }
  } finally {
    saving--;
  }
}
function save(){ persistStructure(); }

async function cloudDeleteBookingsByBeds(bedIds){
  if (!bedIds.length) return;
  saving++; // блокируем автообновление во время удаления
  try {
    const { error } = await sb.from('bookings').delete().in('bed_id', bedIds);
    if (error) showToast(t('del_bookings_fail') + error.message, 'error');
  } finally {
    saving--;
  }
}