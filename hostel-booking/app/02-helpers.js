/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Хелперы ---------- */
const $ = s => document.querySelector(s);
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayStr(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}
function fmtDate(iso){ if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}.${m}.${y}`; }
function nightsOf(b){ return Math.max(0, Math.round((new Date(b.checkout)-new Date(b.checkin))/86400000)); }
function fmtMoney(n){ return new Intl.NumberFormat(LANG === 'ru' ? 'ru-RU' : 'en-US').format(n); }

function findBed(bedId){
  for (const apt of state.apartments)
    for (const room of apt.rooms)
      for (const bed of room.beds)
        if (bed.id === bedId) return { apt, room, bed };
  return null;
}
function bedLabel(room, bed){
  if (bed.name) return bed.name;                                   // кастомное имя койки (напр. «Бокс 1», «А-1»)
  return room.type==='capsule' ? `${t('box')} ${bed.num}` : `${room.name}-${bed.num}`;
}
/* эффективная цена: явная цена койки → комнаты → апартамента → 7000 ₽ по умолчанию */
function resolvePrice(apt, room, bed){
  const p = (bed && Number(bed.price) > 0) ? bed.price
          : (room && Number(room.price) > 0) ? room.price
          : (apt && Number(apt.price) > 0) ? apt.price
          : 7000;
  return Number(p) || 7000;
}
function placeLabel(bedId){
  const f = findBed(bedId);
  if (!f) return '— место удалено —';
  return `${t('apt')} ${f.apt.name} · ${bedLabel(f.room, f.bed)}`;
}
function bkStatus(b){
  const today = todayStr();
  if (b.checkout <= today) return 'past';
  if (b.checkin <= today) return 'active';
  return 'future';
}
function bedBookings(bedId){ return state.bookings.filter(b=>b.bedId===bedId); }
function bedState(bedId){
  const list = bedBookings(bedId);
  const active = list.find(b=>bkStatus(b)==='active');
  if (active) return { code:'busy', booking: active };
  const future = list.filter(b=>bkStatus(b)==='future').sort((a,b)=>a.checkin<b.checkin?-1:1)[0];
  if (future) return { code:'resv', booking: future };
  return { code:'free', booking: null };
}
function allBeds(){
  const out = [];
  for (const apt of state.apartments)
    for (const room of apt.rooms)
      for (const bed of room.beds)
        out.push({ apt, room, bed });
  return out;
}

/* ---------- Маска телефона (РФ: +7 (XXX) XXX-XX-XX) ---------- */
function formatPhone(value){
  let raw = String(value || '').replace(/\D/g, '')        // только цифры
    .replace(/^8/, '7')                                   // 8 → 7 (код РФ)
    .replace(/^7/, '');                                   // убираем ведущий 7, добавим сами
  raw = raw.slice(0, 10);                                 // максимум 10 цифр номера
  if (!raw) return '';
  let out = '+7 (' + raw.slice(0, 3);
  if (raw.length >= 3) out += ') ' + raw.slice(3, 6);
  if (raw.length >= 6) out += '-' + raw.slice(6, 8);
  if (raw.length >= 8) out += '-' + raw.slice(8, 10);
  return out;
}
function bindPhoneMask(input){
  if (!input) return;
  input.addEventListener('input', () => {
    const after = formatPhone(input.value);
    if (after !== input.value) {
      const end = after.length;
      input.value = after;
      try { input.setSelectionRange(end, end); } catch(e){}
    }
  });
}