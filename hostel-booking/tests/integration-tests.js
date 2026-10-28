'use strict';

/* ===== Мок Supabase ===== */
window.supabase = {
  createClient: function() {
    const queryBuilder = function() {
      return {
        select: function(){ return this; },
        eq: function(){ return this; },
        order: function(){ return this; },
        maybeSingle: async function(){ return { data: null, error: null }; },
        single: async function(){ return { data: null, error: null }; },
        insert: async function(){ return { data: null, error: null }; },
        update: async function(){ return { data: null, error: null }; },
        delete: async function(){ return { data: null, error: null }; },
        upsert: async function(){ return { data: null, error: null }; },
        in: function(){ return this; },
        selectWith: function(){ return this; }
      };
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: { id: 'test-user', email: 'test@example.com' } } }),
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => {},
        onAuthStateChange: () => {},
        updateUser: async () => ({}),
        resetPasswordForEmail: async () => ({}),
        signUp: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { session: null }, error: null })
      },
      from: function() {
        return queryBuilder();
      },
      rpc: async () => ({ data: true, error: null })
    };
  }
};

/* ===== Подготовка тестового состояния ===== */
sb = window.supabase.createClient('test', 'test');
me = 'test-user';
myEmail = 'test@example.com';
hostel = { id: 'test-hostel', role: 'owner' };
members = [];
invites = [];
settings = { privatePhones: false };
finance = [];
state = {
  apartments: [
    {
      id: 1,
      buildingId: 1,
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
  bookings: []
};

/* ===== Тесты ===== */
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

function assertTrue(condition, message = '') {
  if (!condition) throw new Error(message || 'expected true');
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) throw new Error(`${message} expected ${expected}, got ${actual}`);
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

/* ===== Тесты существования элементов ===== */
test('Наличие основных секций приложения', () => {
  assertTrue(document.getElementById('loginScreen') !== null);
  assertTrue(document.getElementById('app') !== null);
  assertTrue(document.getElementById('viewMap') !== null);
  assertTrue(document.getElementById('viewBookings') !== null);
  assertTrue(document.getElementById('viewStructure') !== null);
  assertTrue(document.getElementById('viewAnalytics') !== null);
  assertTrue(document.getElementById('viewTeam') !== null);
  assertTrue(document.getElementById('viewCalendar') !== null);
  assertTrue(document.getElementById('viewFinance') !== null);
});

test('Наличие кнопок в шапке', () => {
  assertTrue(document.getElementById('btnExport') !== null);
  assertTrue(document.getElementById('btnImport') !== null);
  assertTrue(document.getElementById('btnLogout') !== null);
});

test('Наличие вкладок', () => {
  assertTrue(document.querySelectorAll('.tab').length === 7);
});

test('Наличие модалок', () => {
  assertTrue(document.getElementById('finModal') !== null);
  assertTrue(document.getElementById('bedModal') !== null);
  assertTrue(document.getElementById('bookingModal') !== null);
  assertTrue(document.getElementById('uiModal') !== null);
});

/* ===== Тесты переключения вкладок ===== */
function testSwitchView(viewName) {
  switchView(viewName);
  document.querySelectorAll('.tab').forEach(tab => {
    const isActive = tab.classList.contains('active');
    const expected = tab.dataset.view === viewName;
    assertTrue(isActive === expected, `Вкладка ${tab.dataset.view} active state wrong`);
  });
  const mainId = 'view' + viewName.charAt(0).toUpperCase() + viewName.slice(1);
  const main = document.getElementById(mainId);
  assertTrue(main !== null, `Main element for ${viewName} not found`);
  if (main) assertTrue(!main.hidden, `Main for ${viewName} should be visible`);
}

['map', 'calendar', 'bookings', 'finance', 'analytics', 'structure', 'team'].forEach(view => {
  test(`Переключение на вкладку ${view}`, () => {
    testSwitchView(view);
  });
});

/* ===== Тесты открытия модалок ===== */
test('Открытие модалки новой брони', () => {
  currentBedId = null;
  openBookingModal(null, null);
  assertTrue(!document.getElementById('bookingModal').hidden);
  closeModal('bookingModal');
});

test('Открытие модалки койки', () => {
  openBedModal(1001);
  assertTrue(!document.getElementById('bedModal').hidden);
  closeModal('bedModal');
});

test('Открытие модалки финансовой операции', () => {
  openFinModal(null);
  assertTrue(!document.getElementById('finModal').hidden);
  closeModal('finModal');
});

/* ===== Тесты функций рендеринга ===== */
test('renderStats заполняет статистику', () => {
  renderStats();
  assertTrue(document.getElementById('statsBar').innerHTML.length > 0);
});

test('renderMap заполняет карту', () => {
  renderMap();
  assertTrue(document.getElementById('viewMap').innerHTML.length > 0);
});

test('renderBookings заполняет таблицу броней', () => {
  renderBookings();
  assertTrue(document.getElementById('bookingsBody').innerHTML.length > 0 || document.getElementById('bookingsEmpty').hidden === false);
});

test('renderStructure заполняет структуру', () => {
  renderStructure();
  assertTrue(document.getElementById('structureList').innerHTML.length > 0);
});

test('renderAnalytics заполняет аналитику', () => {
  renderAnalytics();
  assertTrue(document.getElementById('viewAnalytics').innerHTML.length > 0);
});

test('renderFinance заполняет бухгалтерию', () => {
  renderFinance();
  assertTrue(document.getElementById('viewFinance').innerHTML.length > 0);
});

test('renderCalendar заполняет календарь', () => {
  renderCalendar();
  assertTrue(document.getElementById('viewCalendar').innerHTML.length > 0);
});

test('renderTeam заполняет команду (владелец)', () => {
  renderTeam();
  assertTrue(document.getElementById('viewTeam').innerHTML.length > 0);
});

/* ===== Запуск вывода результатов ===== */
renderResults();