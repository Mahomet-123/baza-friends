/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Команда (владелец: менеджеры) ---------- */
function renderTeam(){
  const v = $('#viewTeam');
  if (!isOwner()) { v.innerHTML = ''; return; }
  const rows = members.map(m => `
    <div class="team-row">
      <span class="team-ava" data-icon="users"></span>
      <div class="team-main">
        <b>${esc(m.email || t('team_no_email'))}</b>
        <div class="team-sub">${m.role === 'owner' ? t('role_owner') : t('role_manager')}${m.user_id === me ? t('team_you') : ''}</div>
      </div>
      ${m.user_id === me ? '' :
        `<button class="btn btn-danger btn-sm" data-del-member="${m.user_id}"><span data-icon="trash"></span> ${t('team_remove')}</button>`}
    </div>`).join('');
  const pending = invites.map(i => `
    <div class="team-row pending">
      <span class="team-ava" data-icon="mail"></span>
      <div class="team-main">
        <b>${esc(i.email)}</b>
        <div class="team-sub">${t('team_pending')}</div>
      </div>
      <button class="btn btn-danger btn-sm" data-del-invite="${esc(i.email)}"><span data-icon="trash"></span> ${t('team_cancel_invite')}</button>
    </div>`).join('');
  v.innerHTML = `
    <div class="an-card">
      <h4>${t('team_title')}</h4>
      ${rows}${pending}
      <form class="team-add" id="teamAddForm">
        <input type="email" id="teamEmail" placeholder="${t('team_email_ph')}" required>
        <button type="submit" class="btn btn-primary"><span data-icon="plus"></span> ${t('team_add_btn')}</button>
      </form>
      <p id="teamMsg" class="team-msg" hidden></p>
    </div>
    <div class="an-card">
      <h4>${t('team_phones_title')}</h4>
      <label class="switch-row">
        <span class="switch">
          <input type="checkbox" id="togglePrivatePhones" ${settings.privatePhones ? 'checked' : ''}>
          <i></i>
        </span>
        <span class="switch-text">
          <b>${t('team_phones_toggle')}</b>
          <span>${settings.privatePhones ? t('team_phones_on') : t('team_phones_off')}</span>
        </span>
      </label>
      <p class="team-note-small">${t('team_phones_note')}</p>
    </div>
    <div class="an-card team-note">
      <h4>${t('team_how_title')}</h4>
      <p>${t('team_how_1')}</p>
      <p>${t('team_how_2')}</p>
    </div>`;
  hydrateIcons(v);
}

async function setPrivatePhones(on){
  saving++; // блокируем автообновление во время сохранения настройки
  try {
    const { error } = await sb.from('hostel_settings')
      .upsert({ hostel_id: hostel.id, private_phones: on, updated_at: new Date().toISOString() },
              { onConflict: 'hostel_id' });
    if (error) { showToast(t('team_phones_fail') + error.message, 'error'); renderTeam(); return; }
    settings.privatePhones = on;
    await cloudLoad();   // перечитать телефоны: база теперь отдаёт их по новому правилу
    render();
    switchView('team');
  } finally {
    saving--;
  }
}

async function addManager(email){
  const msg = $('#teamMsg');
  const clean = email.trim().toLowerCase();
  if (!clean.includes('@')) {
    msg.textContent = t('team_email_bad');
    msg.className = 'team-msg err'; msg.hidden = false;
    return;
  }
  saving++; // блокируем автообновление во время добавления участника
  try {
    await sb.from('hostel_members').upsert(
      { user_id: 'u_' + clean, hostel_id: hostel.id, role: 'manager', email: clean, name: '' },
      { onConflict: 'user_id' });
    if (!members.some(m => m.user_id === 'u_' + clean))
      members.push({ user_id: 'u_' + clean, hostel_id: hostel.id, role: 'manager', email: clean, name: '' });
    renderTeam();
    const m2 = $('#teamMsg');
    m2.textContent = t('team_invited_ok', {email: clean});
    m2.className = 'team-msg ok'; m2.hidden = false;
  } finally {
    saving--;
  }
}
async function removeMember(userId){
  const m = members.find(x => x.user_id === userId);
  if (!m) return;
  const ok = await showConfirm(t('team_remove_confirm', {email: m.email || t('by_staff')}), {
    title: t('team_remove'),
    okText: t('team_remove'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  saving++; // блокируем автообновление во время удаления участника
  try {
    const { error } = await sb.from('hostel_members').delete()
      .eq('hostel_id', hostel.id).eq('user_id', userId);
    if (error) { showToast(t('team_remove_fail') + error.message, 'error'); return; }
    if (m.email) await sb.from('invites').delete().eq('hostel_id', hostel.id).eq('email', m.email.toLowerCase());
    members = members.filter(x => x.user_id !== userId);
    renderTeam();
  } finally {
    saving--;
  }
}
async function cancelInvite(email){
  saving++; // блокируем автообновление во время отмены приглашения
  try {
    const { error } = await sb.from('invites').delete().eq('hostel_id', hostel.id).eq('email', email);
    if (error) { showToast(t('team_cancel_fail') + error.message, 'error'); return; }
    invites = invites.filter(i => i.email !== email);
    renderTeam();
  } finally {
    saving--;
  }
}

async function markPaid(id){
  const b = state.bookings.find(x => x.id === id);
  if (!b) return;
  saving++; // блокируем автообновление во время отметки оплаты
  try {
    const { error } = await sb.from('bookings').update({ paid: true }).eq('id', id);
    if (error) { showToast(t('mark_paid_fail') + error.message, 'error'); return; }
    b.paid = true;
    render();
  } finally {
    saving--;
  }
}