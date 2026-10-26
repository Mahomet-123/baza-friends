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
function bedLabel(room, bed){ return room.type==='capsule' ? `${t('box')} ${bed.num}` : `${room.name}-${bed.num}`; }
function placeLabel(bedId, unitName){
  const f = findBed(bedId);
  if (!f) return unitName || '— место удалено —'; // для заявок с сайта bed_id нет — показываем объект
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