/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Иконки (Lucide, инлайн-SVG) ---------- */
const ICONS = {
  bed:'<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 18h20"/><path d="M12 4v6"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
  pencil:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  bath:'<path d="M9 5 7.6 3.6A2.1 2.1 0 0 0 4 5v7"/><path d="M10 4 8 6"/><path d="M2 12h20"/><path d="M19 12v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5"/><path d="M7 19v2"/><path d="M17 19v2"/>',
  pot:'<path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/>',
  sofa:'<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/><path d="M4 18v2"/><path d="M20 18v2"/>',
  box:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  door:'<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':'<path d="M10.7 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.4 3.4M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 4.3-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="2" y1="2" x2="22" y2="22"/>',
  wallet:'<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 12h.01"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01"/>',
};
function icon(name){
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||''}</svg>`;
}
function hydrateIcons(root){
  (root||document).querySelectorAll('[data-icon]').forEach(el=>{
    if(!el.dataset.done){ el.innerHTML = icon(el.dataset.icon); el.dataset.done='1'; }
  });
}

/* ---------- Доступ (локальный, без сервера) ---------- */
let authMode = 'login'; // 'login' | 'signup'

function setAuthMode(mode){
  authMode = mode;
  const signup = mode === 'signup';
  $('#authTitle').textContent = signup ? t('signup_title') : t('login_title');
  $('#authSub').textContent = signup ? t('signup_sub') : t('login_sub');
  $('#authUserLabel').textContent = signup ? t('signup_email') : t('login_user');
  $('#loginUser').type = signup ? 'email' : 'text';
  $('#loginUser').autocomplete = signup ? 'email' : 'username';
  $('#loginPass').autocomplete = signup ? 'new-password' : 'current-password';
  $('#authPass2Field').hidden = !signup;
  $('#authNameField').hidden = !signup;
  $('#signupName').required = signup;
  $('#loginPass2').required = signup;
  $('#authSubmit').textContent = signup ? t('signup_btn') : t('login_btn');
  $('#authToggle').textContent = signup ? t('auth_to_login') : t('auth_to_signup');
  $('#authForgot').textContent = t('auth_forgot');
  $('#authForgot').hidden = signup;
}
let sb = null; // клиент Supabase

/* ---------- Данные ---------- */
let state = null;

function defaultData(){
  const d = { structVersion: 2, nextId: 1, apartments: [], bookings: [] };
  const makeApt = (name, floor) => {
    const apt = { id: d.nextId++, name, floor, rooms: [] };
    for (const rn of ['A','B','C','E']) {
      const room = { id: d.nextId++, name: rn, type: 'room', beds: [] };
      for (let i = 1; i <= 4; i++) room.beds.push({ id: d.nextId++, num: i });
      apt.rooms.push(room);
    }
    const caps = { id: d.nextId++, name: 'Капсулы', type: 'capsule', beds: [] };
    for (let i = 1; i <= 4; i++) caps.beds.push({ id: d.nextId++, num: i });
    apt.rooms.push(caps);
    d.apartments.push(apt);
  };
  for (let i = 1; i <= 7; i++) makeApt(String(i), i);
  return d;
}
/* — кто я и в каком хостеле — */
let me = null, myEmail = null;      // текущий пользователь
let hostel = null;                  // { id, role: 'owner'|'manager' }
let members = [];                   // участники хостела
let invites = [];                   // приглашённые, но ещё не вошедшие

let settings = { privatePhones: false }; // false = телефоны видны всей команде (по умолчанию)

const isOwner = () => hostel && hostel.role === 'owner';
const isMine  = b => b.createdBy === me;              // бронь внёс я?
/* телефон клиента виден: всегда автору брони; остальным — если приватность выключена */
const canSeePhone = b => isMine(b) || !settings.privatePhones;
const authorOf = b => {                              // «вы» / «владелец» / «менеджер»
  if (isMine(b)) return t('by_you');
  const m = members.find(x => x.user_id === b.createdBy);
  if (!m) return t('by_staff');
  const roleLabel = m.role === 'owner' ? t('role_owner') : t('role_manager');
  return m.name ? `${roleLabel} ${m.name}` : roleLabel;
};

function rowToBk(r, phones){
  return { id: r.id, bedId: r.bed_id, guest: r.guest,
    phone: phones[r.id] || '',        // телефон приходит только для СВОИХ броней (RLS)
    unit_name: r.unit_name || '',     // название объекта (для заявок с сайта)
    source: r.source || '',           // 'site' — заявка пришла с сайта, '' — бронь из CRM
    status: r.status || 'new',        // статус заявки: new/confirmed/rejected
    checkin: r.checkin, checkout: r.checkout, price: Number(r.price) || 0,
    paid: r.paid, note: r.note, createdAt: r.created_at, createdBy: r.created_by,
    updatedAt: r.updated_at };
}
function bkToRow(b){ // телефон не тут — он в booking_phones
  return { bed_id: b.bedId, guest: b.guest, owner: hostel.id,
    checkin: b.checkin, checkout: b.checkout, price: b.price, paid: b.paid, note: b.note };
}