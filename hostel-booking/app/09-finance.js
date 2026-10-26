/* ===== Хостел · бронирование коек ===== */
'use strict';

/* ---------- Бухгалтерия ---------- */
const FIN_CATS = {
  expense: ['rent','utilities','internet','salary','cleaning','laundry','supplies',
            'repair','equipment','food','marketing','taxes','transport','other'],
  income:  ['extra_service','shop','deposit','other_income'],
};
const catName = (kind, key) => t('cat_' + key);

let finance = [];          // операции хостела
let finYM = null;          // выбранный месяц бухгалтерии
let finEditingId = null;
let finOldUpdatedAt = null; // для оптимистичной блокировки

function finRow(r){
  return { id: r.id, kind: r.kind, category: r.category, amount: Number(r.amount) || 0,
    date: r.date, note: r.note, createdBy: r.created_by, updatedAt: r.updated_at };
}
function finToRow(f){
  return { owner: hostel.id, kind: f.kind, category: f.category,
    amount: f.amount, date: f.date, note: f.note };
}

function renderFinance(){
  const v = $('#viewFinance');
  if (!state) { v.innerHTML = ''; return; }
  if (!finYM) { const t = new Date(); finYM = { y: t.getFullYear(), m: t.getMonth() }; }
  const { y, m } = finYM;
  const { from, to } = monthRange(y, m);

  /* доходы от броней: касса (оплачено) и начислено */
  let accrued = 0, cash = 0;
  for (const b of state.bookings) {
    const sum = nightsInRange(b, from, to) * (b.price || 0);
    accrued += sum;
    if (b.paid) cash += sum;
  }
  const debt = accrued - cash;

  const ops = finance.filter(f => f.date >= from && f.date < to)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const otherIncome = ops.filter(o => o.kind === 'income').reduce((s, o) => s + o.amount, 0);
  const expenses = ops.filter(o => o.kind === 'expense').reduce((s, o) => s + o.amount, 0);
  const income = cash + otherIncome;
  const profit = income - expenses;
  const margin = income ? Math.round(profit / income * 100) : 0;

  /* расходы по статьям */
  const byCat = new Map();
  for (const o of ops.filter(o => o.kind === 'expense'))
    byCat.set(o.category, (byCat.get(o.category) || 0) + o.amount);
  const catRows = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = catRows.length ? catRows[0][1] : 0;

  const kpis = `
    <div class="an-kpis">
      <div class="stat s-free"><b>${fmtSAR(cash)}</b><span>${t('fin_cash')}</span></div>
      <div class="stat s-free"><b>${fmtSAR(otherIncome)}</b><span>${t('fin_other_income')}</span></div>
      <div class="stat"><b>${fmtSAR(income)}</b><span>${t('fin_income')}</span></div>
      <div class="stat s-busy"><b>${fmtSAR(expenses)}</b><span>${t('fin_expenses')}</span></div>
      <div class="stat ${profit >= 0 ? 'profit-pos' : 'profit-neg'}"><b>${fmtSAR(profit)}</b><span>${t('fin_profit')}</span></div>
      <div class="stat"><b>${margin}%</b><span>${t('fin_margin')}</span></div>
      <div class="stat s-resv"><b>${fmtSAR(debt)}</b><span>${t('fin_guest_debt')}</span></div>
      <div class="stat"><b>${fmtSAR(accrued)}</b><span>${t('fin_accrued')}</span></div>
    </div>`;

  const cats = `<div class="an-card"><h4>${t('fin_by_cat')}</h4>${
    catRows.length ? catRows.map(([k, sum]) => `<div class="an-top-row">
        <span class="fin-cat-name">${esc(catName('expense', k))}</span>
        <div class="an-top-bar"><i class="bar-exp" style="width:${maxCat ? Math.max(Math.round(sum / maxCat * 100), 2) : 2}%"></i></div>
        <b>${fmtSAR(sum)}</b></div>`).join('')
      : `<p class="empty-note">${t('fin_no_expenses')}</p>`
  }</div>`;

  const opsTable = `<div class="an-card">
    <div class="fin-head">
      <h4>${t('fin_ops')}</h4>
      <div class="fin-actions">
        <button class="btn btn-ghost btn-sm" id="finCopyPrev" title="${t('fin_copy_prev_title')}">
          <span data-icon="copy"></span> ${t('fin_copy_prev')}</button>
        <button class="btn btn-primary btn-sm" id="finAdd"><span data-icon="plus"></span> ${t('fin_add')}</button>
      </div>
    </div>
    ${ops.length ? `<div class="table-wrap an-debt-wrap"><table class="bookings-table an-debt-table"><thead>
      <tr><th>${t('fin_th_date')}</th><th>${t('fin_th_kind')}</th><th>${t('fin_th_cat')}</th><th>${t('fin_th_note')}</th><th>${t('fin_th_sum')}</th><th>${t('fin_th_by')}</th><th></th></tr>
      </thead><tbody>${ops.map(o => `<tr>
        <td>${fmtDate(o.date)}</td>
        <td><span class="pill ${o.kind === 'income' ? 'paid' : 'unpaid'}">${o.kind === 'income' ? t('fin_income_w') : t('fin_expense_w')}</span></td>
        <td>${esc(catName(o.kind, o.category))}</td>
        <td class="note-cell">${esc(o.note) || '—'}</td>
        <td><b class="${o.kind === 'income' ? 'sum-in' : 'sum-out'}">${o.kind === 'income' ? '+' : '−'}${fmtSAR(o.amount)}</b></td>
        <td class="note-cell">${o.createdBy === me ? t('by_you') : (() => {
          const m = members.find(x => x.user_id === o.createdBy);
          if (!m) return t('by_staff');
          const roleLabel = m.role === 'owner' ? t('role_owner') : t('role_manager');
          return m.name ? `${roleLabel} ${m.name}` : roleLabel;
        })()}</td>
        <td><div class="row-actions">
          <button class="btn-icon" data-fin-edit="${o.id}" title="${t('edit_t')}"><span data-icon="pencil"></span></button>
          <button class="btn-icon" data-fin-del="${o.id}" title="${t('del_t')}"><span data-icon="trash"></span></button>
        </div></td></tr>`).join('')}</tbody></table></div>`
      : `<p class="empty-note">${t('fin_no_ops')}</p>`}
  </div>`;

  v.innerHTML = `
    <div class="an-month-nav">
      <button class="btn-icon" id="finPrev" title="${t('prev_month')}">‹</button>
      <h2>${tMonths()[m]} ${y}</h2>
      <button class="btn-icon" id="finNext" title="${t('next_month')}">›</button>
      <span class="an-note">${t('fin_note')}</span>
    </div>
    ${kpis}${cats}${opsTable}`;
  hydrateIcons(v);
}

function fillFinCats(kind, selected){
  $('#finCat').innerHTML = FIN_CATS[kind]
    .map(k => `<option value="${k}" ${k === selected ? 'selected' : ''}>${esc(catName(kind, k))}</option>`).join('');
}
function openFinModal(op){
  finEditingId = op ? op.id : null;
  finOldUpdatedAt = op?.updatedAt || null;
  $('#finModalTitle').textContent = op ? t('fin_edit_op') : t('fin_new_op');
  const kind = op?.kind || 'expense';
  $('#finKind').value = kind;
  fillFinCats(kind, op?.category);
  $('#finDate').value = op?.date || todayStr();
  $('#finAmount').value = op?.amount ?? '';
  $('#finNote').value = op?.note || '';
  $('#finError').hidden = true;
  openModal('finModal');
  $('#finAmount').focus();
}
async function saveFinFromForm(e){
  e.preventDefault();
  const err = $('#finError');
  const data = {
    kind: $('#finKind').value,
    category: $('#finCat').value,
    amount: Number($('#finAmount').value) || 0,
    date: $('#finDate').value,
    note: $('#finNote').value.trim(),
  };
  if (!data.date || data.amount <= 0) {
    err.textContent = t('fin_err_amount');
    err.hidden = false; return;
  }
  const btn = $('#finSubmit');
  btn.disabled = true; btn.textContent = t('saving');
  saving++; // блокируем автообновление во время записи
  try {
    if (finEditingId) {
      const { data: updatedRows, error } = await sb.from('finance')
        .update(finToRow(data))
        .eq('id', finEditingId)
        .eq('updated_at', finOldUpdatedAt)
        .select();
      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(t('fin_optimistic_conflict'));
      }
      const updatedRow = updatedRows[0];
      const existing = finance.find(f => f.id === finEditingId);
      if (existing) Object.assign(existing, finRow(updatedRow));
    } else {
      const { data: row, error } = await sb.from('finance').insert(finToRow(data)).select().single();
      if (error) throw error;
      finance.push(finRow(row));
    }
  } catch(e2) {
    const msg = (e2.message === t('fin_optimistic_conflict'))
      ? t('fin_optimistic_conflict')
      : t('fin_err_save') + (e2.message || e2);
    err.textContent = msg;
    showToast(msg, 'error');
    err.hidden = false;
    btn.disabled = false; btn.textContent = t('save');
    saving--; // снимаем блокировку при ошибке
    return;
  }
  saving--; // снимаем блокировку после успешного сохранения
  btn.disabled = false; btn.textContent = t('save');
  closeModal('finModal');
  renderFinance();
}
async function deleteFin(id){
  const f = finance.find(x => x.id === id);
  if (!f) return;
  const ok = await showConfirm(t('fin_del_confirm', {cat: catName(f.kind, f.category), sum: fmtSAR(f.amount)}), {
    title: t('del_t'),
    okText: t('del_t'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  saving++; // блокируем автообновление во время удаления
  try {
    const { error } = await sb.from('finance').delete().eq('id', id);
    if (error) { showToast(t('fin_del_fail') + error.message, 'error'); return; }
    finance = finance.filter(x => x.id !== id);
    renderFinance();
  } finally {
    saving--;
  }
}
/* перенести регулярные расходы прошлого месяца (аренда, зарплата, интернет…) */
async function copyPrevMonth(){
  const { y, m } = finYM;
  const prev = new Date(y, m - 1, 1);
  const pr = monthRange(prev.getFullYear(), prev.getMonth());
  const cur = monthRange(y, m);
  const src = finance.filter(f => f.kind === 'expense' && f.date >= pr.from && f.date < pr.to);
  if (!src.length) { showToast(t('fin_copy_none'), 'error'); return; }
  const already = finance.some(f => f.date >= cur.from && f.date < cur.to && f.kind === 'expense');
  const ok = await showConfirm(`Скопировать ${src.length} расход(ов) прошлого месяца в ${tMonths()[m].toLowerCase()}?` +
      (already ? '\n\nВнимание: в этом месяце расходы уже есть — появятся дубли.' : ''), {
    title: t('fin_copy_prev'),
    okText: t('fin_copy_prev'),
    cancelText: t('cancel')
  });
  if (!ok) return;
  const rows = src.map(f => {
    const d = new Date(f.date);
    const day = Math.min(d.getDate(), cur.days);
    return { owner: hostel.id, kind: 'expense', category: f.category, amount: f.amount, note: f.note,
      date: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
  });
  saving++; // блокируем автообновление во время копирования
  try {
    const { data, error } = await sb.from('finance').insert(rows).select();
    if (error) { showToast(t('fin_copy_fail') + error.message, 'error'); return; }
    finance.push(...(data || []).map(finRow));
    renderFinance();
  } finally {
    saving--;
  }
}