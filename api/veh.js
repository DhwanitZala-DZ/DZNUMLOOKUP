// api/veh.js
// Vaahan lookup — proxies through the DZ VEH worker
// Made by DZ HACKER

// the new standalone worker (does the RenewBuy call itself)
const WORKER_BASE = 'https://dz-osint.rajveeguest.workers.dev';

const PLATE_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

/* ---------- helpers ---------- */

function cleanPlate(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

// handle /veh?GJ01KP8982, /veh?regn_no=..., /veh?regn=..., etc.
function extractPlate(query) {
  if (!query || typeof query !== 'object') return '';

  if (query.regn_no) return query.regn_no;
  if (query.regn)    return query.regn;

  const keys   = Object.keys(query);
  const values = Object.values(query);

  for (const k of keys) {
    const c = cleanPlate(k);
    if (PLATE_RE.test(c)) return c;
  }
  for (const v of values) {
    const c = cleanPlate(v);
    if (PLATE_RE.test(c)) return c;
  }
  for (const k of keys) {
    const c = cleanPlate(k);
    if (c.length >= 6) return c;
  }
  for (const v of values) {
    const c = cleanPlate(v);
    if (c.length >= 6) return c;
  }
  return '';
}

async function fetchWithRetry(url, opts, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = await fetch(url, opts);
    if (last.status !== 403 && last.status !== 429) return last;
    await new Promise(r => setTimeout(r, 700 + Math.random() * 1200));
  }
  return last;
}

/* ---------- handler ---------- */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dz-key');
  res.setHeader('X-Powered-By', 'DZ HACKER');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const plate = cleanPlate(extractPlate(req.query));

  if (!plate || plate.length < 6) {
    return res.status(400).json({
      _made_by: 'DZ HACKER',
      _error: 'missing or invalid registration number',
      _hint: 'usage: /veh?GJ01KP8982',
      _received_query: req.query,
    });
  }

  // hit the worker directly — no relay, no header juggling
  const workerUrl = WORKER_BASE.replace(/\/+$/, '') + '/veh?' + encodeURIComponent(plate);

  const opts = {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
      Accept: 'application/json, text/plain, */*',
    },
  };

  try {
    const upstream = await fetchWithRetry(workerUrl, opts);
    const text = await upstream.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({
      _made_by: 'DZ HACKER',
      _requested_regn: plate,
      _error: err.message || 'upstream failed',
    });
  }
}
