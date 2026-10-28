/* Форма заявки. При отправке пишет заявку в релизный CRM через crm-bridge
   (Edge Function create-booking), который подбирает свободную койку и сразу
   резервирует её. Если на выбранные даты мест нет — блокируем отправку
   (и на всякий случай сервер тоже вернёт no_free_bed). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  BF.openForm = function (unitId) {
    const u = BF.getUnit(unitId);
    if (!u) return;
    const name = S.lang === 'ru' ? u.name_ru : u.name_en;
    let f = document.getElementById('formOverlay');
    if (!f) {
      f = document.createElement('div'); f.id = 'formOverlay'; f.className = 'modal hidden';
      f.innerHTML = `<div class="modal-back"></div><div class="modal-box form-box">
        <button class="modal-close" aria-label="close">×</button><div class="form-content"></div></div>`;
      document.body.appendChild(f);
      f.querySelector('.modal-back').onclick = () => f.classList.add('hidden');
      f.querySelector('.modal-close').onclick = () => f.classList.add('hidden');
    }
    const ci = S.dates.checkin || '';
    const co = S.dates.checkout || '';
    f.querySelector('.form-content').innerHTML = `
      <h3>${BF.t('request_title')}</h3>
      <p class="muted">${name} · ${BF.t('request_sub')}</p>
      <form id="reqForm">
        <label>${BF.t('f_name')}<input name="name" required></label>
        <label>${BF.t('f_phone')}<input name="phone" required></label>
        <div class="row">
          <label>${BF.t('f_checkin')}<input type="date" name="checkin" value="${ci}" required></label>
          <label>${BF.t('f_checkout')}<input type="date" name="checkout" value="${co}" required></label>
        </div>
        <div class="row">
          <label>${BF.t('f_adults')}<input type="number" name="adults" min="1" max="20" value="2"></label>
          <label class="kids-field off">${BF.t('f_kids')}<input type="number" name="kids" min="0" max="10" value="1" disabled></label>
        </div>
        <label class="check-line">
          <input type="checkbox" name="hasKids">
          <span class="check-box">${iconHTML('check', 14)}</span>
          <span>${BF.t('f_has_kids')}</span>
        </label>
        <p class="muted total-line">${BF.t('f_total')}: <b id="guestsTotal">2</b></p>
        <label>${BF.t('f_comment')}<textarea name="comment" rows="2"></textarea></label>
        <input type="hidden" name="unitId" value="${u.id}">
        <button class="btn" type="submit">${BF.t('send')}</button>
        <p class="err hidden" id="errMsg"></p>
        <p class="ok hidden" id="okMsg">${BF.t('sent')}</p>
      </form>`;

    const form = f.querySelector('#reqForm');
    const cb = form.querySelector('[name=hasKids]');
    const kidsField = form.querySelector('.kids-field');
    const kidsInput = form.querySelector('[name=kids]');
    const adultsInput = form.querySelector('[name=adults]');
    const totalEl = form.querySelector('#guestsTotal');
    const errEl = form.querySelector('#errMsg');
    function updTotal() {
      const a = Math.max(0, parseInt(adultsInput.value || '0', 10) || 0);
      const k = cb.checked ? Math.max(0, parseInt(kidsInput.value || '0', 10) || 0) : 0;
      totalEl.textContent = String(a + k);
    }
    cb.addEventListener('change', () => {
      kidsField.classList.toggle('off', !cb.checked);
      kidsInput.disabled = !cb.checked;
      updTotal();
    });
    adultsInput.addEventListener('input', updTotal);
    kidsInput.addEventListener('input', updTotal);
    updTotal();

    const showErr = (msg) => {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      f.querySelector('#okMsg').classList.add('hidden');
    };

    f.classList.remove('hidden');
    form.onsubmit = async ev => {
      ev.preventDefault();
      errEl.classList.add('hidden');
      const d = Object.fromEntries(new FormData(form).entries());
      const checkin = d.checkin || '';
      const checkout = d.checkout || '';
      if (checkin && checkout && checkout <= checkin) {
        showErr(BF.t('date_hint'));
        return;
      }
      // клиентская проверка занятости (дублирует серверную, для мгновенного отклика)
      const free = BF.unitFreeBeds(u.id, checkin, checkout);
      if (free === 0) { showErr(BF.t('occupied_msg')); return; }

      const adults = Math.max(1, parseInt(d.adults || '1', 10) || 1);
      const kids = d.hasKids ? Math.max(0, parseInt(d.kids || '0', 10) || 0) : 0;
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        await BF.submitBooking({
          unitId: d.unitId,
          unitName: name,
          name: d.name,
          phone: d.phone,
          checkin,
          checkout,
          adults: adults,
          kids: kids,
          guests: adults + kids,
          comment: d.comment,
          price: u.price
        });
        f.querySelector('#okMsg').classList.remove('hidden');
        setTimeout(() => f.classList.add('hidden'), 1600);
      } catch (e) {
        const msg = (e && e.message === 'no_free_bed') ? BF.t('occupied_msg') : BF.t('err_send');
        showErr(msg);
        btn.disabled = false;
      }
    };
  };
})();
