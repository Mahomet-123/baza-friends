// Supabase Edge Function: public-structure
// Публичный (по общему секрету сайта x-site-key) доступ к планировке CRM
// (структуре объектов) и PII-безопасной занятости коек. Сайт (otdyh.vercel.app)
// строит по этим данным каталог, сгенерированный из CRM, и помечает «занято»
// те номера, у которых на выбранные даты заняты все койки.
//
// ДОСТУП: Verify JWT — OFF (доступ только по заголовку x-site-key).
//
// Деплой:
//   supabase functions deploy public-structure --project-ref juahnruwcfbvrrlruojv
// Секреты (те же, что у create-booking):
//   SITE_BOOKING_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / HOSTEL_OWNER_ID

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-site-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function svc() {
  return {
    url: Deno.env.get('SUPABASE_URL') || '',
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    owner: Deno.env.get('HOSTEL_OWNER_ID') || '',
  };
}

// эффективная цена: явная цена койки → комнаты → апартамента → 7000 ₽ по умолчанию
function resolvePrice(apt: any, room: any, bed: any): number {
  const p = (bed && Number(bed.price) > 0) ? bed.price
          : (room && Number(room.price) > 0) ? room.price
          : (apt && Number(apt.price) > 0) ? apt.price
          : 7000;
  return Number(p) || 7000;
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

// занятость коек владельца БЕЗ ПЕРСОНАЛЬНЫХ ДАННЫХ (только bed_id + даты + статус)
async function loadOccupancy(): Promise<any[]> {
  const { url, key, owner } = svc();
  const res = await fetch(
    `${url}/rest/v1/bookings?owner=eq.${owner}&select=bed_id,checkin,checkout,status`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`bookings ${res.status}`);
  return await res.json();
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  // 1) проверка общего секрета сайта
  const key = req.headers.get('x-site-key') || '';
  const secret = Deno.env.get('SITE_BOOKING_KEY') || '';
  if (!secret || key !== secret) return json({ error: 'forbidden' }, 403);

  try {
    const struct = await loadStructure();
    if (!struct || !struct.apartments) {
      return json({ ok: true, categories: [], units: [], buildings: [], occupancy: [] });
    }
    const occ = await loadOccupancy();
    const occupancy = (occ || []).map(r => ({
      bedId: r.bed_id,
      checkin: r.checkin,
      checkout: r.checkout,
      status: r.status,
    }));

    // категории сайта = апартаменты CRM
    const categories = (struct.apartments || []).map((apt: any) => ({
      id: String(apt.id),
      name: apt.name || '',
      number: apt.number || '',
      floor: apt.floor || 1,
      price: Number(apt.price) || 0,
      resolvedPrice: resolvePrice(apt, null, null),
      roomCount: (apt.rooms || []).length,
    }));

    // юниты сайта = комнаты CRM (каждая комната = 1 номер с 1 спальней)
    const units: any[] = [];
    for (const apt of (struct.apartments || [])) {
      for (const room of (apt.rooms || [])) {
        units.push({
          id: String(room.id),
          categoryId: String(apt.id),
          name: room.name || '',
          type: room.type || 'room',
          price: resolvePrice(apt, room, null),
          beds: (room.beds || []).length,
          bedsDetail: (room.beds || []).map((b: any) => ({
            id: b.id,
            num: b.num,
            name: b.name || '',
            price: Number(b.price) || 0,
            resolvedPrice: resolvePrice(apt, room, b),
          })),
        });
      }
    }

    return json({ ok: true, categories, units, buildings: struct.buildings || [], occupancy });
  } catch (e) {
    console.error('public-structure failed', e);
    return json({ error: 'failed', detail: String(e) }, 500);
  }
}),
};
