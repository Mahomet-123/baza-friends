/* ===== Универсальные модальные окна (confirm / prompt) ===== */
'use strict';

function openUiModal(){
  document.getElementById('uiModal').hidden = false;
}
function closeUiModal(){
  document.getElementById('uiModal').hidden = true;
}

function showUiModal({ title, bodyHtml, actionsHtml, onClose }) {
  const modal = document.getElementById('uiModal');
  if (!modal) return;

  document.getElementById('uiModalTitle').textContent = title;
  document.getElementById('uiModalBody').innerHTML = bodyHtml;
  document.getElementById('uiModalActions').innerHTML = actionsHtml;

  // Закрытие по крестику
  const closeBtn = modal.querySelector('[data-close-ui-modal]');
  if (closeBtn) {
    closeBtn.onclick = () => {
      closeUiModal();
      if (onClose) onClose(null);
    };
  }

  // Закрытие по клику на фон
  modal.onmousedown = (e) => {
    if (e.target === modal) {
      closeUiModal();
      if (onClose) onClose(null);
    }
  };

  openUiModal();
}

function showConfirm(message, { title = '', okText = 'OK', cancelText = 'Отмена' } = {}) {
  return new Promise(resolve => {
    const actionsHtml = `
      <button class="btn btn-ghost" id="uiModalCancel">${esc(cancelText)}</button>
      <button class="btn btn-primary" id="uiModalOk">${esc(okText)}</button>
    `;
    showUiModal({
      title: title || t('app_title'),
      bodyHtml: `<p class="ui-modal-message">${esc(message)}</p>`,
      actionsHtml,
      onClose: resolve
    });

    document.getElementById('uiModalOk').onclick = () => {
      closeUiModal();
      resolve(true);
    };
    document.getElementById('uiModalCancel').onclick = () => {
      closeUiModal();
      resolve(false);
    };
  });
}

function showPrompt(message, { title = '', defaultValue = '', okText = 'OK', cancelText = 'Отмена' } = {}) {
  return new Promise(resolve => {
    const actionsHtml = `
      <button class="btn btn-ghost" id="uiModalCancel">${esc(cancelText)}</button>
      <button class="btn btn-primary" id="uiModalOk">${esc(okText)}</button>
    `;
    showUiModal({
      title: title || t('app_title'),
      bodyHtml: `
        <p class="ui-modal-message">${esc(message)}</p>
        <input type="text" class="ui-modal-input" id="uiModalInput" value="${esc(defaultValue)}" />
      `,
      actionsHtml,
      onClose: resolve
    });

    const input = document.getElementById('uiModalInput');
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = input.value.trim();
        closeUiModal();
        resolve(value === '' ? null : value);
      }
    });

    document.getElementById('uiModalOk').onclick = () => {
      const value = input.value.trim();
      closeUiModal();
      resolve(value === '' ? null : value);
    };
    document.getElementById('uiModalCancel').onclick = () => {
      closeUiModal();
      resolve(null);
    };
  });
}

function showApartmentPrompt(name, floor) {
  return new Promise(resolve => {
    const actionsHtml = `
      <button class="btn btn-ghost" id="uiModalCancel">${esc(t('cancel'))}</button>
      <button class="btn btn-primary" id="uiModalOk">${esc(t('save'))}</button>
    `;
    showUiModal({
      title: t('ren_apt_title'),
      bodyHtml: `
        <label class="field">
          <span>${esc(t('struct_apt_name'))}</span>
          <input type="text" class="ui-modal-input" id="uiAptName" value="${esc(name)}" maxlength="20">
        </label>
        <label class="field">
          <span>${esc(t('struct_floor'))}</span>
          <input type="number" class="ui-modal-input" id="uiAptFloor" value="${esc(String(floor))}" min="0" max="99">
        </label>
      `,
      actionsHtml,
      onClose: resolve
    });

    const nameInput = document.getElementById('uiAptName');
    const floorInput = document.getElementById('uiAptFloor');
    nameInput.focus();

    const save = () => {
      const result = {
        name: nameInput.value.trim(),
        floor: floorInput.value.trim() === '' ? floor : (Number(floorInput.value) || 0)
      };
      closeUiModal();
      resolve(result);
    };

    document.getElementById('uiModalOk').onclick = save;
    document.getElementById('uiModalCancel').onclick = () => {
      closeUiModal();
      resolve(null);
    };

    // Enter в любом поле — сохранение
    [nameInput, floorInput].forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save();
        }
      });
    });
  });
}