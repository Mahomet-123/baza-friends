/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Инициализация ---------- */
let refreshTimer = null;
function startAutoRefresh(){
  if (refreshTimer) return;
  refreshTimer = setInterval(refreshFromCloud, 30000); // подтягивать чужие изменения раз в 30 с
  window.addEventListener('focus', refreshFromCloud);
}
async function refreshFromCloud(){
  if (!state) return;
  if (saving > 0) return;                                              // идёт сохранение — не затирать
  if (document.querySelector('.modal-backdrop:not([hidden])')) return; // не мешать редактированию
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  try { await cloudLoad(); render(); } catch(e){}
}
async function initApp(){
  $('#loginScreen').hidden = true;
  $('#app').hidden = false;
  $('#statsBar').innerHTML = `<div class="stat"><b>…</b><span>${t('loading')}</span></div>`;
  try {
    await resolveHostel();
    await cloudLoad();
  }
  catch(e){ alert(t('load_fail') + (e.message || e)); return; }
  const badge = $('#roleBadge');
  badge.textContent = isOwner() ? t('role_owner') : t('role_manager');
  badge.hidden = false;
  renderHostelSwitch();
  render();
  /* вкладку уже восстановили до загрузки (savedView), тут только страхуем «Команду» для менеджера */
  if (localStorage.getItem(VIEW_KEY) === 'team' && !isOwner()) switchView('map');
  else if ($('#viewCalendar').hidden === false) fitCalendar();
  startAutoRefresh();
}

document.addEventListener('DOMContentLoaded', ()=>{
  hydrateIcons(document);

  /* язык: кнопки RU/EN/AR на входе и в шапке; применяем сохранённый до всего остального */
  const langBtns = LANGS.map(l =>
    `<button type="button" class="lang-btn" data-lang="${l}">${LANG_NAMES[l]}</button>`).join('');
  $('#loginLangs').innerHTML = langBtns;
  $('#appLangs').innerHTML = langBtns;
  document.addEventListener('click', e=>{
    const lb = e.target.closest('.lang-btn');
    if (lb) setLang(lb.dataset.lang);
  });
  setLang(LANG, false);   // выставит lang/dir, переведёт статичный HTML, подсветит кнопку

  /* вкладку восстанавливаем СРАЗУ (до загрузки данных) — иначе мигает «Карта мест» */
  let saved = location.hash.slice(1);
  if (!VIEWS.includes(saved)) { try { saved = localStorage.getItem(VIEW_KEY); } catch(e){ saved = null; } }
  if (VIEWS.includes(saved)) switchView(saved);

  /* вход / регистрация через Supabase Auth */
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const form = $('#loginForm');
  const errEl = $('#loginError'), okEl = $('#loginOk');
  const showErr = msg => { errEl.textContent = msg; errEl.hidden = false; okEl.hidden = true; };
  const showOk  = msg => { okEl.textContent = msg; okEl.hidden = false; errEl.hidden = true; };
  const clearMsg = () => { errEl.hidden = true; okEl.hidden = true; };

  /* логин → email: старые логины (hostel/xilon) продолжают работать, новые входят по email */
  const resolveEmail = v => {
    const s = v.trim();
    return LOGINS[s.toLowerCase()] || (s.includes('@') ? s : null);
  };

  setAuthMode('login');
  $('#authToggle').addEventListener('click', ()=>{
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
    clearMsg();
  });

  /* сброс пароля письмом */
  $('#authForgot').addEventListener('click', async ()=>{
    const email = resolveEmail($('#loginUser').value);
    if (!email || !email.includes('@')) {
      showErr(t('forgot_hint'));
      return;
    }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (error) { showErr(t('forgot_fail') + error.message); return; }
    showOk(t('forgot_sent', {email}));
  });

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    clearMsg();
    const btn = $('#authSubmit');
    const pass = $('#loginPass').value;

    if (authMode === 'signup') {
      const email = $('#loginUser').value.trim();
      if (!email.includes('@')) { showErr(t('err_email_needed')); return; }
      if (pass.length < 6) { showErr(t('err_pass_short')); return; }
      if (pass !== $('#loginPass2').value) { showErr(t('err_pass_mismatch')); return; }

      // Проверяем приглашение до регистрации
      const { data: invited, error: invErr } = await sb.rpc('has_invite', { p_email: email.toLowerCase() });
      if (invErr || !invited) {
        showErr(t('signup_invite_only'));
        return;
      }

      btn.disabled = true; btn.textContent = t('signup_btn_busy');
      const name = $('#signupName').value.trim();
      const { data, error } = await sb.auth.signUp({
        email,
        password: pass,
        options: { data: { name } }
      });
      btn.disabled = false; btn.textContent = t('signup_btn');
      if (error) {
        showErr(error.message.includes('already registered')
          ? t('err_email_taken')
          : t('err_signup') + error.message);
        return;
      }
      if (!data.session) { // если в проекте включат подтверждение почты
        showOk(t('ok_signup_confirm'));
        setAuthMode('login');
        return;
      }
      initApp(); // попадёт в хостел по приглашению (resolveHostel)
      return;
    }

    const email = resolveEmail($('#loginUser').value);
    if (!email) { showErr(t('err_bad_creds')); return; }
    btn.disabled = true; btn.textContent = t('login_btn_busy');
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    btn.disabled = false; btn.textContent = t('login_btn');
    if (error) {
      showErr(error.code === 'email_not_confirmed'
        ? t('err_not_confirmed')
        : t('err_bad_creds'));
      $('#loginPass').value = '';
      $('#loginPass').focus();
      return;
    }
    initApp();
  });

  /* возврат по ссылке «сменить пароль» из письма */
  sb.auth.onAuthStateChange(async (event) => {
    if (event === 'PASSWORD_RECOVERY') {
      const np = await showPrompt(t('recovery_prompt'), {
        title: t('recovery_prompt'),
        okText: t('save'),
        cancelText: t('cancel')
      });
      if (np === null) return; // отменено
      if (np.length < 6) { showToast(t('err_pass_short'), 'error'); return; }
      const { error } = await sb.auth.updateUser({ password: np });
      if (error) showToast(t('recovery_fail') + error.message, 'error');
      else showToast(t('recovery_ok'), 'success');
    }
  });

  sb.auth.getSession().then(({ data }) => { if (data.session) initApp(); });

  /* вкладки */
  $('#tabs').addEventListener('click', e=>{
    const t = e.target.closest('.tab');
    if (t) switchView(t.dataset.view);
  });

  /* шапка */
  $('#btnLogout').addEventListener('click', async ()=>{
    await sb.auth.signOut();
    location.reload();
  });
  $('#hostelSwitch').addEventListener('change', e=>{
    localStorage.setItem('hostel_pick', e.target.value);
    location.reload();
  });
  $('#btnExport').addEventListener('click', exportData);
  $('#btnImport').addEventListener('click', importWarn);
  $('#importFile').addEventListener('change', e=>{
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  /* карта: койки + редактирование структуры */
  $('#viewMap').addEventListener('click', e=>{
    if (e.target.closest('#btnMapEdit')) { mapEdit = !mapEdit; renderMap(); return; }
    const bld = e.target.closest('[data-bld]');
    if (bld) { pickBuilding(bld.dataset.bld); return; }
    if (e.target.closest('[data-add-bld]')) { addBuilding(); return; }
    const rb = e.target.closest('[data-ren-bld]');
    if (rb) { renameBuilding(Number(rb.dataset.renBld)); return; }
    const db = e.target.closest('[data-del-bld]');
    if (db) { deleteBuilding(Number(db.dataset.delBld)); return; }
    const delBed = e.target.closest('[data-del-bed]');
    if (delBed) { removeBed(Number(delBed.dataset.delBed)); return; }
    const renBed = e.target.closest('[data-ren-bed]');
    if (renBed) { renameBed(Number(renBed.dataset.renBed)); return; }
    const addB = e.target.closest('[data-add-bed]');
    if (addB) { addBed(Number(addB.dataset.addBed)); return; }
    const addR = e.target.closest('[data-add-room]');
    if (addR) { addRoom(Number(addR.dataset.addRoom), 'room'); return; }
    const addC = e.target.closest('[data-add-caps]');
    if (addC) { addRoom(Number(addC.dataset.addCaps), 'capsule'); return; }
    const delR = e.target.closest('[data-del-room-map]');
    if (delR) { deleteRoom(Number(delR.dataset.delRoomMap)); return; }
    const edA = e.target.closest('[data-edit-apt]');
    if (edA) { renameApartment(Number(edA.dataset.editApt)); return; }
    const delA = e.target.closest('[data-del-apt-map]');
    if (delA) { deleteApartment(Number(delA.dataset.delAptMap)); return; }
    if (e.target.closest('[data-add-apt]')) { addApartment(); return; }
    const bed = e.target.closest('[data-bed]');
    if (bed) openBedModal(Number(bed.dataset.bed));
  });

  /* брони: фильтры и действия */
  $('#searchBookings').addEventListener('input', renderBookings);
  $('#filterApt').addEventListener('change', renderBookings);
  $('#filterStatus').addEventListener('change', renderBookings);
  $('#btnNewBooking').addEventListener('click', ()=>{ currentBedId=null; openBookingModal(null, null); });
  $('#bookingsBody').addEventListener('click', findBookingAction);

  /* модалка койки */
  $('#bedModalBody').addEventListener('click', e=>{
    if (e.target.closest('#btnBedNewBooking')) { openBookingModal(currentBedId, null); return; }
    findBookingAction(e);
  });

  /* форма брони */
  $('#bookingForm').addEventListener('submit', saveBookingFromForm);

  /* аналитика: месяцы и «Оплачено» */
  $('#viewAnalytics').addEventListener('click', e=>{
    if (e.target.closest('#anPrev')) {
      anYM.m--; if (anYM.m < 0) { anYM.m = 11; anYM.y--; }
      renderAnalytics(); return;
    }
    if (e.target.closest('#anNext')) {
      anYM.m++; if (anYM.m > 11) { anYM.m = 0; anYM.y++; }
      renderAnalytics(); return;
    }
    const mp = e.target.closest('[data-mark-paid]');
    if (mp) markPaid(mp.dataset.markPaid);
  });

  /* глазок на паролях */
  document.querySelectorAll('.pass-eye').forEach(btn=>{
    btn.innerHTML = icon('eye');
    btn.addEventListener('click', ()=>{
      const inp = $('#' + btn.dataset.eye);
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.innerHTML = icon(show ? 'eye-off' : 'eye');
      btn.setAttribute('aria-label', show ? t('auth_hide_pass') : t('auth_show_pass'));
      btn.classList.toggle('on', show);
      inp.focus();
    });
  });

  /* календарь */
  window.addEventListener('resize', fitCalendar);
  window.visualViewport?.addEventListener('resize', fitCalendar);
  $('#viewCalendar').addEventListener('click', e=>{
    if (e.target.closest('#calPrev')) { calYM.m--; if (calYM.m < 0) { calYM.m = 11; calYM.y--; } renderCalendar(); return; }
    if (e.target.closest('#calNext')) { calYM.m++; if (calYM.m > 11) { calYM.m = 0; calYM.y++; } renderCalendar(); return; }
    /* заявки с сайта: подтвердить / отклонить (файл 21-site-bookings.js) */
    const cf = e.target.closest('[data-site-confirm]');
    if (cf) { setSiteBookingStatus(cf.dataset.siteConfirm, 'confirmed'); return; }
    const rj = e.target.closest('[data-site-reject]');
    if (rj) { setSiteBookingStatus(rj.dataset.siteReject, 'rejected'); return; }
    const bar = e.target.closest('[data-bar]');
    if (bar) {
      const b = state.bookings.find(x => x.id === bar.dataset.bar);
      if (b) openBookingModal(null, b);
      return;
    }
    const cell = e.target.closest('[data-new]');
    if (cell) {
      const [bedId, day] = cell.dataset.new.split('|');
      currentBedId = null;
      openBookingModal(Number(bedId), null);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      $('#bkIn').value = day;
      $('#bkOut').value = next.toISOString().slice(0, 10);
    }
  });

  /* бухгалтерия */
  $('#finKind').addEventListener('change', ()=> fillFinCats($('#finKind').value));
  $('#finForm').addEventListener('submit', saveFinFromForm);
  $('#viewFinance').addEventListener('click', e=>{
    if (e.target.closest('#finPrev')) { finYM.m--; if (finYM.m < 0) { finYM.m = 11; finYM.y--; } renderFinance(); return; }
    if (e.target.closest('#finNext')) { finYM.m++; if (finYM.m > 11) { finYM.m = 0; finYM.y++; } renderFinance(); return; }
    if (e.target.closest('#finAdd')) { openFinModal(null); return; }
    if (e.target.closest('#finCopyPrev')) { copyPrevMonth(); return; }
    const ed = e.target.closest('[data-fin-edit]');
    if (ed) { openFinModal(finance.find(f => f.id === ed.dataset.finEdit)); return; }
    const dl = e.target.closest('[data-fin-del]');
    if (dl) { deleteFin(dl.dataset.finDel); return; }
  });

  /* команда */
  $('#viewTeam').addEventListener('submit', e=>{
    if (e.target.id === 'teamAddForm') { e.preventDefault(); addManager($('#teamEmail').value); }
  });
  $('#viewTeam').addEventListener('click', e=>{
    const dm = e.target.closest('[data-del-member]');
    if (dm) { removeMember(dm.dataset.delMember); return; }
    const di = e.target.closest('[data-del-invite]');
    if (di) { cancelInvite(di.dataset.delInvite); return; }
  });
  $('#viewTeam').addEventListener('change', e=>{
    if (e.target.id === 'togglePrivatePhones') setPrivatePhones(e.target.checked);
  });

  /* структура */
  $('#btnAddApt').addEventListener('click', addApartment);
  const structure = $('#viewStructure');
  structure.addEventListener('click', e=>{
    const delApt = e.target.closest('[data-del-apt]');
    if (delApt) { deleteApartment(Number(delApt.dataset.delApt)); return; }
    const delRoom = e.target.closest('[data-del-room]');
    if (delRoom) { deleteRoom(Number(delRoom.dataset.delRoom)); return; }
    const addR = e.target.closest('[data-add-room]');
    if (addR) { addRoom(Number(addR.dataset.addRoom), 'room'); return; }
    const addC = e.target.closest('[data-add-caps]');
    if (addC) { addRoom(Number(addC.dataset.addCaps), 'capsule'); return; }
  });
  structure.addEventListener('change', e=>{
    const t = e.target;
    if (t.dataset.aptBld !== undefined) {          // перенос квартиры в другое здание
      const apt = state.apartments.find(a=>a.id===Number(t.dataset.aptBld));
      if (apt) { apt.buildingId = Number(t.value); save(); render(); }
      return;
    }
    if (t.dataset.aptName !== undefined) {
      const apt = state.apartments.find(a=>a.id===Number(t.dataset.aptName));
      if (apt) { apt.name = t.value.trim() || apt.name; save(); render(); }
    } else if (t.dataset.aptFloor !== undefined) {
      const apt = state.apartments.find(a=>a.id===Number(t.dataset.aptFloor));
      if (apt) { apt.floor = Number(t.value) || 0; save(); render(); }
    } else if (t.dataset.roomName !== undefined) {
      for (const apt of state.apartments) {
        const room = apt.rooms.find(r=>r.id===Number(t.dataset.roomName));
        if (room) { room.name = t.value.trim() || room.name; save(); render(); break; }
      }
    } else if (t.dataset.roomBeds !== undefined) {
      resizeRoom(Number(t.dataset.roomBeds), Number(t.value));
    } else if (t.dataset.bedName !== undefined) {
      for (const apt of state.apartments) {
        for (const room of apt.rooms) {
          const bed = room.beds.find(b => b.id === Number(t.dataset.bedName));
          if (bed) { bed.name = t.value.trim(); save(); return; }
        }
      }
    }
  });

  /* закрытие модалок */
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-backdrop').forEach(bd=>{
    bd.addEventListener('mousedown', e=>{ if (e.target===bd) bd.hidden = true; });
  });
  document.addEventListener('keydown', e=>{
    if (e.key==='Escape') document.querySelectorAll('.modal-backdrop').forEach(bd=>bd.hidden=true);
  });
});
