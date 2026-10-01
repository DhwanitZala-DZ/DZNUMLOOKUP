// api/veh.js
// Vaahan lookup — routed through Cloudflare Worker relay
// Made by DZ HACKER

// Cloudflare Worker relay (yours, from api.php _dzr())
const WORKER_BASE = 'https://token.rajveeguest.workers.dev';

// Upstream target — RenewBuy Vaahan API
const TARGET = 'https://apex.renewbuyinsurance.com/api/v1/vaahan/registration_number/';

const COOKIES =
  '_gcl_au=1.1.773689847.1790870474; ' +
  '_ga_CTWKWSPJQ1=GS2.1.s1790870474$o1$g1$t1790870564$j33$l0$h0; ' +
  '_ga=GA1.1.431162022.1790870475; ' +
  'location=block';

const RTO_STATES = ['GJ','MH','DL','KA','TN','UP','RJ','MP','WB','AP','TS','KL','HR','PB','BR','OR','AS','JH','CG','UK'];
const LETTERS    = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/* ---------- helpers ---------- */

// fake 10-digit number, never starts with 6-9
function fakeMobile() {
  const first = Math.floor(Math.random() * 6); // 0..5
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return `${first}${rest}`;
}

// random plate that is never equal to the one being queried
function fakePlate(avoid) {
  for (let i = 0; i < 20; i++) {
    const st   = RTO_STATES[Math.floor(Math.random() * RTO_STATES.length)];
    const dist = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    const a    = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const b    = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const num  = String(Math.floor(Math.random() * 9000) + 1000);
    const plate = `${st}${dist}${a}${b}${num}`;
    if (plate !== avoid) return plate;
  }
  return 'GJ27AF8582';
}

function cleanPlate(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

const PLATE_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

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

// route the target through the worker.
// When headersOverride is provided, headers are ALSO encoded as h_* query
// params so the worker can re-attach them even if its forwarder strips them.
function viaWorker(targetUrl, headersOverride) {
  const base = WORKER_BASE.replace(/\/+$/, '');
  let url = `${base}/?url=${encodeURIComponent(targetUrl)}`;

  if (headersOverride && typeof headersOverride === 'object') {
    for (const [k, v] of Object.entries(headersOverride)) {
      if (v === undefined || v === null || v === '') continue;
      url += `&h_${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
    }
  }
  return url;
}

// retry on 403/429
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

  const mobile       = fakeMobile();
  const refererPlate = fakePlate(plate);

  const target =
    `${TARGET}?regn_no=${encodeURIComponent(plate)}` +
    `&partner_code=&mobile_no=${mobile}` +
    `&source=apex&originData=false`;

  // headers that must land on RenewBuy exactly as-is
  const forwardedHeaders = {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    Authorization: 'null',
    Connection: 'keep-alive',
    Referer:
      `https://apex.renewbuyinsurance.com/motor/?reg_no=${refererPlate}` +
      `&mobile_no=9999999999&vehicle=fourWheeler`,
    Cookie: COOKIES,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    TE: 'trailers',
  };

  const relayUrl = viaWorker(target, forwardedHeaders);

  const opts = {
    method: 'GET',
    headers: {
      // headers passed on the relay call itself — the worker reads these
      // too, so both paths (real headers + h_* query params) work.
      'User-Agent': forwardedHeaders['User-Agent'],
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': forwardedHeaders['Accept-Language'],
      'Accept-Encoding': forwardedHeaders['Accept-Encoding'],
      Authorization: forwardedHeaders.Authorization,
      Referer: forwardedHeaders.Referer,
      Cookie: forwardedHeaders.Cookie,
      TE: forwardedHeaders.TE,
      Pragma: forwardedHeaders.Pragma,
      'Cache-Control': forwardedHeaders['Cache-Control'],
    },
  };

  try {
    const upstream = await fetchWithRetry(relayUrl, opts);
    const text = await upstream.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.status).json({
      _made_by:        'DZ HACKER',
      _requested_regn: plate,
      _referer_regn:   refererPlate,
      _mobile_used:    mobile,
      _relay:          WORKER_BASE,
      _upstream_status: upstream.status,
      _timestamp:      new Date().toISOString(),
      data,
    });
  } catch (err) {
    return res.status(502).json({
      _made_by:        'DZ HACKER',
      _requested_regn: plate,
      _referer_regn:   refererPlate,
      _mobile_used:    mobile,
      _relay:          WORKER_BASE,
      _error:          err.message || 'upstream failed',
    });
  }
}
