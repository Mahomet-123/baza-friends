// Supabase Edge Function: create-booking
// Принимает заявку с сайта (otdyh.vercel.app) и пишет в таблицу bookings
// через service_role. Защита строится на общем секрете SITE_BOOKING_KEY:
// его знает только наш сайт и эта функция. RLS не ослабляется — анонимный
// гость в таблицу не допускается, писать может только эта функция.
//
// ДОСТУП: Verify JWT — OFF (доступ только по заголовку x-site-key).
//
// Деплой:
//   supabase functions deploy create-booking --project-ref juahnruwcfbvrrlruojv
// Секреты (Supabase Dashboard → Edge Functions → Secrets или CLI):
//   supabase secrets set SITE_BOOKING_KEY="<длинный случайный ключ>"
//   supabase secrets set SUPABASE_URL="https://juahnruwcfbvrrlruojv.supabase.co"
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role ключ>"
//   supabase secrets set HOSTEL_OWNER_ID="<uuid владельца хостела>"
//     (получить: select id from auth.users where email='fransdelaser+hostel@gmail.com';)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-site-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function num(v: unknown, def = 0): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

// валидация даты в формате YYYY-MM-DD
function validDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return v;
}

function svc() {
  return {
    url: Deno.env.get('SUPABASE_URL') || '',
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    owner: Deno.env.get('HOSTEL_OWNER_ID') || '',
  };
}

// запись в таблицу через REST API под service_role (обходит RLS)
async function insertRow(table: string, body: object): Promise<any> {
  const { url, key } = svc();
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text}`);
  try { return JSON.parse(text)[0]; } catch { return null; }
}

// планировка владельца (одна JSON-запись в таблице structure, ключ — owner)
async function loadStructure(): Promise<any> {
  const { url, key, owner } = svc();
  const res = await fetch(
    `${url}/rest/v1/structure?owner=eq.${owner}&select=data&limit=1`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`structure ${res.status}`);
  const rows: any[] = await res.json();
  if (!rows.length) return null;
  return rows[0].data;
}

// занятость коек владельца (только то, что нужно для подбора свободной койки)
async function loadOccupancy(): Promise<any[]> {
  const { url, key, owner } = svc();
  const res = await fetch(
    `${url}/rest/v1/bookings?owner=eq.${owner}&select=bed_id,checkin,checkout,status`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`bookings ${res.status}`);
  return await res.json();
}

// найти комнату по id в структуре
function findRoom(struct: any, roomId: number): any {
  for (const apt of (struct?.apartments || []))
    for (const room of (apt.rooms || []))
      if (Number(room.id) === roomId) return room;
  return null;
}

// первая свободная койка комнаты на диапазон [ci, co); null — если все заняты
function firstFreeBed(room: any, occ: any[], ci: string, co: string): number | null {
  for (const bed of (room.beds || [])) {
    const taken = (occ || []).some(o =>
      o.bed_id === bed.id &&
      o.status !== 'rejected' &&
      o.checkin < co && o.checkout > ci
    );
    if (!taken) return bed.id;
  }
  return null;
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // 1) проверка общего секрета сайта
  const key = req.headers.get('x-site-key') || '';
  const secret = Deno.env.get('SITE_BOOKING_KEY') || '';
  if (!secret || key !== secret) {
    return json({ error: 'forbidden' }, 403);
  }

  // 2) разбор и проверка тела заявки
  let p: any;
  try { p = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const guest = String(p.guest || '').trim();
  if (!guest) return json({ error: 'guest_required' }, 400);

  const checkin = validDate(p.checkin);
  const checkout = validDate(p.checkout);
  if (!checkin || !checkout) return json({ error: 'bad_dates' }, 400);
  if (checkout <= checkin) return json({ error: 'checkout_must_be_after_checkin' }, 400);

  const owner = svc().owner;
  if (!owner) return json({ error: 'server_misconfigured' }, 500);

  // 3) если указан объект (комната/коттедж/дом) — подбираем свободную койку
  let bedId: number | null = null;
  const unitId = p.unitId != null ? Number(p.unitId) : null;
  if (unitId != null && !Number.isNaN(unitId)) {
    let struct: any = null, occ: any[] = [];
    try {
      struct = await loadStructure();
      occ = await loadOccupancy();
    } catch (e) {
      console.error('structure load failed', e);
      return json({ error: 'structure_unavailable' }, 503);
    }
    const room = findRoom(struct, unitId);
    if (!room) return json({ error: 'unit_not_found' }, 404);
    bedId = firstFreeBed(room, occ, checkin, checkout);
    if (bedId == null) return json({ error: 'no_free_bed' }, 409);
  }

  const row = {
    bed_id: bedId,                 // число — реальная койка, либо null (если unitId не передан)
    owner,
    created_by: owner,
    guest: guest.slice(0, 200),
    checkin,
    checkout,
    price: num(p.price),
    paid: false,
    note: String(p.comment || p.note || '').slice(0, 500),
    source: 'site',
    unit_name: String(p.unitName || p.unit_name || '').slice(0, 200),
    status: 'new',
    prepaid: num(p.prepaid),
    adults: num(p.adults),
    kids: num(p.kids),
  };

  // 4) сама запись (+ телефон в отдельную таблицу, виден только автору брони)
  try {
    const bk = await insertRow('bookings', row);
    const phone = String(p.phone || '').trim();
    if (phone && bk && bk.id) {
      await insertRow('booking_phones', {
        booking_id: bk.id,
        phone: phone.slice(0, 64),
        created_by: owner,
      });
    }
    return json({ ok: true, id: bk ? bk.id : null, bed_id: bedId }, 201);
  } catch (e) {
    // нарушение no_overlap (койка уже занята конкурентным запросом) — сообщаем занято
    const detail = String(e);
    if (/exclusion|no_overlap|23514/i.test(detail)) {
      return json({ error: 'no_free_bed' }, 409);
    }
    console.error('create-booking failed', e);
    return json({ error: 'insert_failed', detail }, 500);
  }
}),
};
