/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Вкладки и общий рендер ---------- */
const VIEW_KEY = 'hostel_view';
const VIEWS = ['map','calendar','bookings','finance','analytics','structure','team'];
function switchView(name){
  /* вкладка переживает обновление: пишем и в localStorage, и в адрес страницы */
  try { localStorage.setItem(VIEW_KEY, name); } catch(e){}
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.view===name));
  $('#viewMap').hidden = name!=='map';
  $('#viewBookings').hidden = name!=='bookings';
  $('#viewStructure').hidden = name!=='structure';
  $('#viewAnalytics').hidden = name!=='analytics';
  $('#viewTeam').hidden = name!=='team';
  $('#viewCalendar').hidden = name!=='calendar';
  $('#viewFinance').hidden = name!=='finance';
  document.body.classList.toggle('cal-mode', name === 'calendar');
  if (name === 'calendar') requestAnimationFrame(fitCalendar);
}
function render(){
  $('#tabTeam').hidden = !isOwner();
  if (hostel) { // бейдж роли — на текущем языке
    const badge = $('#roleBadge');
    badge.textContent = isOwner() ? t('role_owner') : t('role_manager');
    badge.hidden = false;
  }
  renderStats();
  renderMap();
  renderAptFilter();
  renderBookings();
  renderStructure();
  renderAnalytics();
  renderTeam();
  renderCalendar();
  renderFinance();
}