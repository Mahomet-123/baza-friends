/* ===== Хостел · локальный бэкенд (вместо Supabase) =====
   Все данные хранятся в localStorage. Никакого сервера и сети.
   Имитирует минимальный API Supabase (sb.from / sb.auth / sb.rpc),
   чтобы остальной код приложения не пришлось переписывать. */
'use strict';
(function () {
  const LS_KEY = 'hostel_crm_v1';

  function readDB() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; }
  }
  function writeDB(db) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) { /* квота переполнена — игнорируем */ }
  }
  function db() {
    let d = readDB();
    if (!d) {
      d = {
        _seq: 0, accounts: [], session: null,
        hostel_members: [], invites: [],
        structure: null, bookings: [], booking_phones: [], finance: [],
        hostel_settings: null
      };
      writeDB(d);
    }
    return d;
  }
  function nextId(d) { d._seq = (d._seq || 0) + 1; return d._seq; }
  function now() { return new Date().toISOString(); }

  function findAccount(email) {
    const d = db();
    return d.accounts.find(a => a.email.toLowerCase() === String(email).toLowerCase()) || null;
  }
  function getSessionUser() {
    const d = db();
    if (!d.session) return null;
    return d.accounts.find(a => a.id === d.session.userId) || null;
  }

  /* ---------- Query-построитель, имитирующий sb.from(table) ---------- */
  function Query(table) {
    this.table = table;
    this.op = 'select';
    this.payload = null;
    this.upsertOpts = null;
    this.filters = [];
    this.orderCol = null;
    this.terminal = null; // 'single' | 'maybeSingle' | null
  }
  Query.prototype.eq = function (col, val) { this.filters.push({ col, val }); return this; };
  Query.prototype.in = function (col, arr) { this.filters.push({ col, val: arr, in: true }); return this; };
  Query.prototype.order = function (col) { this.orderCol = col; return this; };
  /* select() в Supabase не меняет операцию записи, а лишь помечает «вернуть строки».
     Поэтому НЕ перезаписываем this.op — иначе .insert(x).select().single() превращается
     в обычный SELECT и данные не создаются. */
  Query.prototype.select = function () { return this; };
  Query.prototype.insert = function (obj) { this.op = 'insert'; this.payload = obj; return this; };
  Query.prototype.update = function (obj) { this.op = 'update'; this.payload = obj; return this; };
  Query.prototype.delete = function () { this.op = 'delete'; return this; };
  Query.prototype.upsert = function (obj, opts) { this.op = 'upsert'; this.payload = obj; this.upsertOpts = opts || {}; return this; };
  Query.prototype.single = function () { this.terminal = 'single'; return this; };
  Query.prototype.maybeSingle = function () { this.terminal = 'maybeSingle'; return this; };

  Query.prototype._match = function (rows) {
    return rows.filter(r => this.filters.every(f =>
      f.in ? (Array.isArray(f.val) && f.val.includes(r[f.col])) : r[f.col] === f.val));
  };
  Query.prototype._assign = function (d, p) {
    const row = Object.assign({}, p);
    if (row.id == null) row.id = nextId(d);
    const t = now();
    if (row.created_at == null) row.created_at = t;
    if (row.updated_at == null) row.updated_at = t;
    if (row.created_by == null && typeof me !== 'undefined' && me != null) row.created_by = me;
    if (row.owner == null && typeof hostel !== 'undefined' && hostel && hostel.id != null) row.owner = hostel.id;
    return row;
  };

  /* then делает Query «thenable»: await q выполняет операцию и возвращает {data, error} */
  Query.prototype.then = function (resolve) { resolve(this._exec()); };

  Query.prototype._exec = function () {
    const d = db();
    const rows = d[this.table] || (d[this.table] = []);

    if (this.op === 'select') {
      let out = this._match(rows);
      if (this.orderCol) out = out.slice().sort((a, b) =>
        (a[this.orderCol] < b[this.orderCol] ? -1 : a[this.orderCol] > b[this.orderCol] ? 1 : 0));
      if (this.terminal) return { data: out[0] || null, error: null };
      return { data: out, error: null };
    }

    let result;
    if (this.op === 'insert') {
      const arr = Array.isArray(this.payload) ? this.payload : [this.payload];
      const created = arr.map(p => this._assign(d, p));
      d[this.table] = rows.concat(created);
      writeDB(d);
      result = created;
    } else if (this.op === 'update') {
      const matched = this._match(rows);
      matched.forEach(r => Object.assign(r, this.payload, { updated_at: now() }));
      writeDB(d);
      result = matched;
    } else if (this.op === 'delete') {
      const matched = this._match(rows);
      d[this.table] = rows.filter(r => !matched.includes(r));
      writeDB(d);
      result = matched;
    } else if (this.op === 'upsert') {
      const conf = (this.upsertOpts.onConflict || '').split(',').map(s => s.trim()).filter(Boolean);
      const existing = conf.length
        ? d[this.table].find(r => conf.every(c => r[c] === this.payload[c]))
        : null;
      if (existing) {
        Object.assign(existing, this.payload, { updated_at: now() });
        writeDB(d);
        result = [existing];
      } else {
        const created = this._assign(d, this.payload);
        d[this.table].push(created);
        writeDB(d);
        result = [created];
      }
    } else {
      result = [];
    }

    /* возврат данных: .single()/.maybeSingle() -> одна строка, иначе массив */
    if (this.terminal) return { data: (result && result[0]) || null, error: null };
    return { data: result, error: null };
  };

  /* ---------- auth, имитирующий sb.auth ---------- */
  const auth = {
    getUser() {
      const u = getSessionUser();
      if (!u) return Promise.resolve({ data: { user: null }, error: null });
      return Promise.resolve({
        data: { user: { id: u.id, email: u.email, user_metadata: { name: u.name } } },
        error: null
      });
    },
    getSession() {
      const u = getSessionUser();
      return Promise.resolve({ data: { session: u ? { user: { id: u.id } } : null }, error: null });
    },
    signInWithPassword({ email, password }) {
      const d = db();
      let acct = findAccount(email);
      if (!acct) { acct = { id: 'u_' + nextId(d), email, password: password || '', name: '' }; d.accounts.push(acct); }
      d.session = { userId: acct.id };
      writeDB(d);
      return Promise.resolve({ data: {}, error: null });
    },
    signUp({ email, password, options }) {
      const d = db();
      let acct = findAccount(email);
      if (!acct) {
        acct = { id: 'u_' + nextId(d), email, password: password || '', name: (options && options.data && options.data.name) || '' };
        d.accounts.push(acct);
      }
      d.session = { userId: acct.id };
      writeDB(d);
      return Promise.resolve({ data: { session: { user: { id: acct.id } } }, error: null });
    },
    signOut() {
      const d = db();
      d.session = null;
      writeDB(d);
      return Promise.resolve({ error: null });
    },
    resetPasswordForEmail() { return Promise.resolve({ error: null }); },
    updateUser({ password }) {
      const u = getSessionUser();
      if (u) { const d = db(); const a = d.accounts.find(x => x.id === u.id); if (a) a.password = password || ''; writeDB(d); }
      return Promise.resolve({ error: null });
    },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() { } } } }; }
  };

  function rpc() { return Promise.resolve({ data: true, error: null }); }

  window.supabase = {
    createClient() { return { from: (t) => new Query(t), auth, rpc }; }
  };
})();
