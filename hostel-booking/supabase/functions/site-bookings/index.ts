// Supabase Edge Function: site-bookings
// Две задачи для админки сайта (otdyh.vercel.app, раздел #/manager):
//   1) GET  — вернуть все заявки, пришедшие с сайта (source='site'),
//             вместе с телефоном из booking_phones;
//   2) POST — сменить статус заявки (подтвердить / отклонить).
// Защита — общий секрет SITE_BOOKING_KEY в заголовке x-site-key (как в
// create-booking). Запись идёт под service_role, поэтому RLS не ослабляется,
// а анонимный гость в таблицу не попадает.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-site-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const svc = () => ({
  key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  url: Deno.env.get('SUPABASE_URL') || '',
});

async function selectSiteBookings(): Promise<any[]> {
  const { url, key } = svc();
  const res = await fetch(
    `${url}/rest/v1/bookings?source=eq.site&order=created_at.desc`,
    {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!res.ok) throw new Error(`bookings ${res.status}`);
  const rows: any[] = await res.json();

  // подтягиваем телефоны отдельной таблицей
  const ids = rows.map(r => r.id);
  let phones: Record<string, string> = {};
  if (ids.length) {
    const phRes = await fetch(
      `${url}/rest/v1/booking_phones?booking_id=in.(${ids.join(',')})`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    );
    if (phRes.ok) {
      const ph: any[] = await phRes.json();
      ph.forEach(p => { phones[String(p.booking_id)] = p.phone; });
    }
  }

  return rows.map(r => ({
    id: r.id,
    guest: r.guest || '',
    phone: phones[String(r.id)] || '',
    checkin: r.checkin || '',
    checkout: r.checkout || '',
    adults: r.adults || 0,
    kids: r.kids || 0,
    guests: r.guests || 0,
    status: r.status || 'new',
    source: r.source || 'crm',
    unit_name: r.unit_name || '',
    note: r.note || '',
  }));
}

async function setStatus(id: string, status: string): Promise<void> {
  if (!['new', 'confirmed', 'rejected'].includes(status)) {
    throw new Error('bad_status');
  }
  const { url, key } = svc();
  const res = await fetch(`${url}/rest/v1/bookings?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`update ${res.status}`);
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 1) проверка общего секрета сайта
  const key = req.headers.get('x-site-key') || '';
  const secret = Deno.env.get('SITE_BOOKING_KEY') || '';
  if (!secret || key !== secret) {
    return json({ error: 'forbidden' }, 403);
  }

  try {
    if (req.method === 'GET') {
      const bookings = await selectSiteBookings();
      return json({ bookings });
    }
    if (req.method === 'POST') {
      let p: any;
      try { p = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
      const id = String(p.id || '');
      const status = String(p.status || '');
      if (!id) return json({ error: 'id_required' }, 400);
      await setStatus(id, status);
      return json({ ok: true, id, status });
    }
    return json({ error: 'method_not_allowed' }, 405);
  } catch (e) {
    console.error('site-bookings failed', e);
    return json({ error: 'failed', detail: String(e) }, 500);
  }
}),
};
