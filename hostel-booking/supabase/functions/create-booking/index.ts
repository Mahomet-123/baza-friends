// Supabase Edge Function: create-booking
// Принимает заявку с сайта (otdyh.vercel.app) и пишет в таблицу bookings
// через service_role. Защита строится на общем секрете SITE_BOOKING_KEY:
// его знает только наш сайт и эта функция. RLS не ослабляется — анонимный
// гость в таблицу не допускается, писать может только эта функция.
//
// Деплой:
//   supabase functions deploy create-booking --project-ref juahnruwcfbvrrlruojv
// Секреты (Supabase Dashboard → Edge Functions → Secrets или CLI):
//   supabase secrets set SITE_BOOKING_KEY="<длинный случайный ключ>"
//   supabase secrets set SUPABASE_URL="https://juahnruwcfbvrrlruojv.supabase.co"
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role ключ>"
//   supabase secrets set HOSTEL_OWNER_ID="<uuid владельца хостела>"
//     (получить: select id from auth.users where email='fransdelaser+hostel@gmail.com';)

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

// запись в таблицу через REST API под service_role (обходит RLS)
async function insertRow(table: string, body: object): Promise<any> {
  const url = `${Deno.env.get('SUPABASE_URL')}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text}`);
  try { return JSON.parse(text)[0]; } catch { return null; }
}

Deno.serve(async (req: Request) => {
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

  const owner = Deno.env.get('HOSTEL_OWNER_ID') || '';
  if (!owner) return json({ error: 'server_misconfigured' }, 500);

  const row = {
    bed_id: null,
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

  // 3) сама запись
  try {
    const bk = await insertRow('bookings', row);
    // 4) телефон в отдельную таблицу (виден только автору брони)
    const phone = String(p.phone || '').trim();
    if (phone && bk && bk.id) {
      await insertRow('booking_phones', {
        booking_id: bk.id,
        phone: phone.slice(0, 64),
        created_by: owner,
      });
    }
    return json({ ok: true, id: bk ? bk.id : null }, 201);
  } catch (e) {
    console.error('create-booking failed', e);
    return json({ error: 'insert_failed', detail: String(e) }, 500);
  }
});
