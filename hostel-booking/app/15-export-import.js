/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Экспорт / импорт ---------- */
function backupBlob(){
  return JSON.stringify({
    apartments: state.apartments, buildings: state.buildings, nextId: state.nextId,
    bookings: state.bookings, finance,
  }, null, 2);
}
function downloadBackup(name){
  const blob = new Blob([backupBlob()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
async function exportData(){
  const phones = state.bookings.filter(b => b.phone).length;
  const ok = await showConfirm(
    'ЭКСПОРТ — скачать резервную копию.\n\n' +
    `В файл попадут: ${state.apartments.length} квартир(ы), ${state.bookings.length} броней, ` +
    `${finance.length} операций бухгалтерии.\n` +
    (phones ? `Внимание: там будут персональные данные гостей (${phones} телефон(ов)) — храните файл в надёжном месте.\n\n` : '\n') +
    'Скачать?',
    {
      title: t('export'),
      okText: t('export'),
      cancelText: t('cancel')
    }
  );
  if (!ok) return;
  downloadBackup(`hostel-backup-${todayStr()}.json`);
}

/* предупреждение ДО выбора файла */
async function importWarn(){
  const ok = await showConfirm(
    '⚠️ ИМПОРТ ЗАМЕНЯЕТ ВСЕ ДАННЫЕ ХОСТЕЛА.\n\n' +
    `Будет УДАЛЕНО: ${state.bookings.length} броней, ${finance.length} операций бухгалтерии, ` +
    `вся нынешняя планировка (${state.apartments.length} квартир) — и вместо них встанут данные из файла.\n\n` +
    'Изменения увидят все сотрудники и все устройства. Отменить это будет нельзя.\n\n' +
    'Перед заменой я автоматически скачаю копию текущих данных.\n\nПродолжить и выбрать файл?',
    {
      title: t('import'),
      okText: t('import'),
      cancelText: t('cancel')
    }
  );
  if (!ok) return;
  downloadBackup(`hostel-ДО-импорта-${todayStr()}.json`);   // страховка
  $('#importFile').click();
}

function importData(file){
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.apartments) || !Array.isArray(data.bookings) || !data.nextId)
        throw new Error(t('imp_bad_format'));
      const ok = await showConfirm(
        'Последняя проверка.\n\n' +
        `Из файла будет загружено: ${data.apartments.length} квартир(ы), ${data.bookings.length} броней, ` +
        `${(data.finance || []).length} операций.\n` +
        `Текущие данные (${state.bookings.length} броней) будут стёрты безвозвратно.\n\nЗаменить?`,
        {
          title: t('import'),
          okText: t('import'),
          cancelText: t('cancel')
        }
      );
      if (!ok) return;

      saving++;
      try {
        const s = await sb.from('structure')
          .update({ data: { apartments: data.apartments, buildings: data.buildings || [], nextId: data.nextId } })
          .eq('owner', hostel.id);
        if (s.error) throw s.error;

        const d = await sb.from('bookings').delete().eq('owner', hostel.id);
        if (d.error) throw d.error;
        if (data.bookings.length) {
          const i = await sb.from('bookings').insert(data.bookings.map(bkToRow)).select();
          if (i.error) throw i.error;
          const rows = (i.data || []).map((row, idx) => ({ booking_id: row.id, phone: data.bookings[idx].phone || '' }))
            .filter(r => r.phone);
          if (rows.length) await sb.from('booking_phones').insert(rows);
        }

        if (Array.isArray(data.finance)) {   // бухгалтерию тоже восстанавливаем
          const df = await sb.from('finance').delete().eq('owner', hostel.id);
          if (df.error) throw df.error;
          if (data.finance.length) {
            const fi = await sb.from('finance').insert(data.finance.map(finToRow));
            if (fi.error) throw fi.error;
          }
        }
      } finally { saving--; }

      await cloudLoad();
      render();
      alert(t('imp_done'));
    } catch(e) {
      alert(t('imp_fail') + (e.message || e));
    }
  };
  reader.readAsText(file);
}