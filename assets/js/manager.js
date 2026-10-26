/* Админка сайта (#/manager): список заявок (те же данные, что и в CRM)
   + панель настроек базы (белый лейбл). Заявки берутся из общего store. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  BF.renderManager = function () {
    const reqs = BF.listBookings();
    const rows = reqs.length ? reqs.map(r => {
      const st = r.status === 'confirmed' ? `<span class="tag ok">${BF.t('confirmed')}</span>`
        : r.status === 'rejected' ? `<span class="tag bad">${BF.t('rejected')}</span>`
        : `<span class="tag">${BF.t('new')}</span>`;
      const acts = (r.status === 'new' || r.source === 'site')
        ? `<button class="btn small" data-confirm="${r.id}">${BF.t('confirm')}</button> <button class="btn small ghost" data-reject="${r.id}">${BF.t('reject')}</button>`
        : '';
      const adults = r.adults != null ? r.adults : r.guests;
      const kids = r.kids || 0;
      const who = kids > 0
        ? `${adults} ${BF.t('m_adults')} + ${kids} ${BF.t('m_kids')}`
        : `${adults} ${BF.t('m_adults')}`;
      const src = r.source === 'site' ? ` <span class="tag" style="background:#E1F5EE;color:#0F6E56">${BF.t('from_site')}</span>` : '';
      return `<tr>
        <td data-label="${BF.t('m_unit')}">${r.unit_name || BF.t('unknown')}${src}</td>
        <td data-label="${BF.t('m_guest')}">${r.guest}<br><small class="muted">${r.phone || ''}</small></td>
        <td data-label="${BF.t('m_dates')}">${r.checkin} → ${r.checkout}<br><small class="muted">${who}</small></td>
        <td data-label="${BF.t('m_status')}">${st}</td><td data-label="${BF.t('m_actions')}">${acts}</td></tr>`;
    }).join('') : `<tr><td colspan="5" class="empty">${BF.t('empty')}</td></tr>`;

    const s = S.settings;
    document.getElementById('app').innerHTML = `
      <section class="wrap manager">
        <div class="sec-head" style="text-align:left;margin:24px 0"><h2>${BF.t('manager_title')}</h2><p>${BF.t('manager_sub')}</p></div>
        <div class="panel">
          <h3>${BF.t('settings_title')}</h3>
          <label>${BF.t('s_brand')}<input id="setBrand" value="${s.brandName}"></label>
          <label>${BF.t('s_color')}<input id="setColor" type="color" value="${s.primaryColor}"></label>
          <label>${BF.t('s_phone')}<input id="setPhone" value="${s.contactPhone}"></label>
          <button class="btn small" id="saveSettings">${BF.t('s_save')}</button>
        </div>
        <table class="req-table">
          <thead><tr><th>${BF.t('m_unit')}</th><th>${BF.t('m_guest')}</th><th>${BF.t('m_dates')}</th><th>${BF.t('m_status')}</th><th>${BF.t('m_actions')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;

    document.querySelectorAll('[data-confirm]').forEach(b => b.onclick = () => BF.setStatus(Number(b.dataset.confirm), 'confirmed'));
    document.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => BF.setStatus(Number(b.dataset.reject), 'rejected'));
    document.getElementById('saveSettings').onclick = () => {
      S.settings.brandName = document.getElementById('setBrand').value;
      S.settings.primaryColor = document.getElementById('setColor').value;
      S.settings.contactPhone = document.getElementById('setPhone').value;
      localStorage.setItem('bf_settings', JSON.stringify(S.settings));
      BF.applySettings(); BF.applyLang();
    };
  };

  /* подтвердить/отклонить заявку — меняем статус в общем store и перерисовываем */
  BF.setStatus = function (id, status) {
    BF.setBookingStatus(id, status);
    BF.renderManager();
  };
})();
