'use strict';

const tests = [];
const resultsDiv = document.getElementById('results');
const summaryDiv = document.getElementById('summary');

function test(name, fn) {
  try {
    fn();
    tests.push({ name, pass: true, message: '' });
  } catch (e) {
    tests.push({ name, pass: false, message: e.message });
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) throw new Error(message || 'expected true');
}

function renderResults() {
  let passed = 0;
  tests.forEach(t => {
    if (t.pass) passed++;
    const div = document.createElement('div');
    div.className = `test-result ${t.pass ? 'pass' : 'fail'}`;
    div.textContent = `${t.pass ? '✅' : '❌'} ${t.name}${t.message ? ' — ' + t.message : ''}`;
    resultsDiv.appendChild(div);
  });
  summaryDiv.textContent = `Пройдено: ${passed} из ${tests.length}`;
}

// Здесь будут тесты
// ===== Подготовка тестового состояния =====
LANG = 'ru';
hostel = { id: 'test-hostel', role: 'owner' }; // мокаем хостел для тестов
state = {
  apartments: [
    {
      id: 1,
      name: '1',
      floor: 1,
      rooms: [
        { id: 101, name: 'A', type: 'room', beds: [ { id: 1001, num: 1 }, { id: 1002, num: 2 } ] },
        { id: 102, name: 'Капсулы', type: 'capsule', beds: [ { id: 1003, num: 1 } ] }
      ]
    }
  ],
  buildings: [{ id: 1, name: 'Здание 1' }],
  nextId: 1004,
  bookings: [
    {
      id: 'b1', bedId: 1001, guest: 'Иван', phone: '+79991234567',
      checkin: '2026-08-23', checkout: '2026-08-25', price: 1000,
      paid: false, note: '', createdAt: '', createdBy: 'u1', updatedAt: ''
    },
    {
      id: 'b2', bedId: 1002, guest: 'Мария', phone: '+79997654321',
      checkin: '2026-08-20', checkout: '2026-08-24', price: 1200,
      paid: true, note: '', createdAt: '', createdBy: 'u2', updatedAt: ''
    }
  ]
};

// ===== Тесты: хелперы (02-helpers.js) =====

// esc
test('esc: экранирует HTML-символы', () => {
  assertEqual(esc('<div>'), '&lt;div&gt;');
  assertEqual(esc("a'b"), 'a&#39;b');
  assertEqual(esc('"'), '&quot;');
  assertEqual(esc('&'), '&amp;');
});

// fmtDate
test('fmtDate: форматирует дату DD.MM.YYYY', () => {
  assertEqual(fmtDate('2026-08-23'), '23.08.2026');
  assertEqual(fmtDate(''), '—');
  assertEqual(fmtDate(null), '—');
});

// nightsOf
test('nightsOf: считает количество ночей', () => {
  assertEqual(nightsOf({ checkin: '2026-08-23', checkout: '2026-08-25' }), 2);
  assertEqual(nightsOf({ checkin: '2026-08-25', checkout: '2026-08-23' }), 0);
});

// fmtMoney
test('fmtMoney: возвращает строку и не NaN', () => {
  const formatted = fmtMoney(1000);
  assertTrue(typeof formatted === 'string' && !formatted.includes('NaN'));
});

// bkStatus
test('bkStatus: корректно определяет статус', () => {
  const today = todayStr();
  const tomorrow = (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); })();
  const yesterday = (() => { const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().slice(0,10); })();
  assertEqual(bkStatus({ checkin: today, checkout: tomorrow }), 'active');
  assertEqual(bkStatus({ checkin: tomorrow, checkout: (() => { const d = new Date(tomorrow); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); })() }), 'future');
  assertEqual(bkStatus({ checkin: yesterday, checkout: today }), 'past');
});

// findBed / bedLabel / placeLabel / allBeds
test('findBed: находит койку по id', () => {
  const f = findBed(1001);
  assertTrue(f !== null);
  assertEqual(f.apt.name, '1');
  assertEqual(f.room.name, 'A');
  assertEqual(f.bed.num, 1);
  assertTrue(findBed(9999) === null);
});

test('bedLabel: обычная комната и капсула', () => {
  const roomA = state.apartments[0].rooms[0];
  const bed1 = roomA.beds[0];
  assertEqual(bedLabel(roomA, bed1), 'A-1');
  const capsuleRoom = state.apartments[0].rooms[1];
  const capsuleBed = capsuleRoom.beds[0];
  assertEqual(bedLabel(capsuleRoom, capsuleBed), 'Бокс 1');
});

test('placeLabel: полное описание места', () => {
  const label = placeLabel(1003);
  assertTrue(label.includes('Квартира 1'));
  assertTrue(label.includes('Бокс 1'));
});

test('allBeds: возвращает все койки', () => {
  const beds = allBeds();
  assertEqual(beds.length, 3);
});

// ===== Тесты: аналитика (08-analytics.js) =====

// fmtSAR
test('fmtSAR: форматирует деньги с символом ₽', () => {
  const s = fmtSAR(1234.56);
  assertTrue(typeof s === 'string');
  assertTrue(s.includes('₽'));
});

// guestKey
test('guestKey: ключ по телефону или имени', () => {
  assertEqual(guestKey({ phone: '+79991234567', guest: 'Иван' }), 't79991234567');
  assertEqual(guestKey({ phone: '', guest: 'Иван' }), 'nиван');
  assertEqual(guestKey({ phone: '123', guest: 'Петр' }), 'nпетр');
});

// nightsInRange
test('nightsInRange: пересечение ночей с интервалом', () => {
  const b = { checkin: '2026-08-20', checkout: '2026-08-25' };
  assertEqual(nightsInRange(b, '2026-08-22', '2026-08-24'), 2);
  assertEqual(nightsInRange(b, '2026-08-18', '2026-08-21'), 1);
  assertEqual(nightsInRange(b, '2026-08-10', '2026-08-15'), 0);
});

// monthRange
test('monthRange: границы месяца', () => {
  const aug = monthRange(2026, 7); // август (месяцы 0-11)
  assertEqual(aug.from, '2026-08-01');
  assertEqual(aug.to, '2026-09-01');
  assertEqual(aug.days, 31);
  const dec = monthRange(2026, 11); // декабрь
  assertEqual(dec.from, '2026-12-01');
  assertEqual(dec.to, '2027-01-01');
  assertEqual(dec.days, 31);
});

// monthAccrued
test('monthAccrued: начислено за месяц', () => {
  // Брони:
  // b1: 2026-08-23 -> 2026-08-25, цена 1000, 2 ночи
  // b2: 2026-08-20 -> 2026-08-24, цена 1200, 4 ночи
  // Ожидаем: 2*1000 + 4*1200 = 2000 + 4800 = 6800
  assertEqual(monthAccrued(2026, 7), 6800);
});

// ===== Тесты: финансы (09-finance.js) =====

// catName
test('catName: возвращает локализованное имя категории', () => {
  assertEqual(catName('expense', 'rent'), 'Аренда помещения'); // ru
  assertEqual(catName('income', 'shop'), 'Продажа (вода, снеки)');
});

// finRow / finToRow
test('finRow: преобразует строку БД в объект операции', () => {
  const row = { id: 'f1', kind: 'expense', category: 'rent', amount: '1500', date: '2026-08-23', note: 'Тест', created_by: 'u1', updated_at: 'now' };
  const f = finRow(row);
  assertEqual(f.id, 'f1');
  assertEqual(f.kind, 'expense');
  assertEqual(f.category, 'rent');
  assertEqual(f.amount, 1500);
  assertEqual(f.date, '2026-08-23');
  assertEqual(f.note, 'Тест');
  assertEqual(f.createdBy, 'u1');
  assertEqual(f.updatedAt, 'now');
});

test('finToRow: преобразует объект операции в поля для БД', () => {
  const f = { kind: 'expense', category: 'rent', amount: 1500, date: '2026-08-23', note: 'Тест' };
  const row = finToRow(f);
  assertTrue(row.owner !== undefined);
  assertEqual(row.kind, 'expense');
  assertEqual(row.category, 'rent');
  assertEqual(row.amount, 1500);
  assertEqual(row.date, '2026-08-23');
  assertEqual(row.note, 'Тест');
});
// ...

renderResults();