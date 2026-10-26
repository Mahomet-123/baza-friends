/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Действия над бронями ---------- */
async function deleteBooking(id){
  const b = state.bookings.find(x=>x.id===id);
  if (!b) return;
  const ok = await showConfirm(t('del_bk_confirm', {guest: b.guest, in: fmtDate(b.checkin), out: fmtDate(b.checkout)}), {
    title: t('del_t'),
    okText: t('del_t'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  saving++; // блокируем автообновление во время удаления
  try {
    const { error } = await sb.from('bookings').delete().eq('id', id);
    if (error) { showToast(t('del_bk_fail') + error.message, 'error'); return; }
    state.bookings = state.bookings.filter(x=>x.id!==id);
    render();
    if (!$('#bedModal').hidden && currentBedId) openBedModal(currentBedId);
  } finally {
    saving--; // снимаем блокировку
  }
}
async function checkoutBooking(id){
  const b = state.bookings.find(x=>x.id===id);
  if (!b) return;
  const today = todayStr();

  /* Гость заехал сегодня: выезд «сегодня» = ноль ночей, база такую бронь не хранит.
     Значит это отмена заселения — освобождаем место, удаляя бронь. */
  if (today <= b.checkin) {
    const ok = await showConfirm(`Гость «${b.guest}» заехал сегодня (${fmtDate(b.checkin)}).\n` +
        `Выселение в тот же день = отмена заселения: бронь будет удалена, место освободится.\n\nПродолжить?`, {
      title: t('evict'),
      okText: t('evict'),
      cancelText: t('cancel')
    });
    if (!ok) return;
    saving++; // блокируем автообновление во время удаления
    try {
      const { error } = await sb.from('bookings').delete().eq('id', id);
      if (error) { showToast(t('evict_fail') + error.message, 'error'); return; }
      state.bookings = state.bookings.filter(x => x.id !== id);
      render();
      if (!$('#bedModal').hidden && currentBedId) openBedModal(currentBedId);
      return;
    } finally {
      saving--; // снимаем блокировку
    }
  }

  const ok = await showConfirm(t('evict_confirm', {guest: b.guest}), {
    title: t('evict'),
    okText: t('evict'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  saving++; // блокируем автообновление во время обновления
  try {
    const { error } = await sb.from('bookings').update({ checkout: today }).eq('id', id);
    if (error) { showToast(t('evict_fail') + error.message, 'error'); return; }
    b.checkout = today;
    render();
    if (!$('#bedModal').hidden && currentBedId) openBedModal(currentBedId);
  } finally {
    saving--; // снимаем блокировку
  }
}
function findBookingAction(e){
  const ed = e.target.closest('[data-edit]');
  if (ed) {
    const b = state.bookings.find(x=>x.id===ed.dataset.edit);
    if (b) openBookingModal(null, b);
    return true;
  }
  const del = e.target.closest('[data-del]');
  if (del) { deleteBooking(del.dataset.del); return true; }
  const co = e.target.closest('[data-checkout]');
  if (co) { checkoutBooking(co.dataset.checkout); return true; }
  return false;
}