// api/veh.js
// Vaahan lookup proxy — /veh?GJ01KP8982
// Made by DZ HACKER

const TARGET = 'https://apex.renewbuyinsurance.com/api/v1/vaahan/registration_number/';

const COOKIES =
  '_gcl_au=1.1.773689847.1790870474; ' +
  '_ga_CTWKWSPJQ1=GS2.1.s1790870474$o1$g1$t1790870564$j33$l0$h0; ' +
  '_ga=GA1.1.431162022.1790870475; ' +
  'location=block';

const RTO_STATES = [
  'GJ','MH','DL','KA','TN','UP','RJ','MP','WB','AP','TS','KL','HR','PB','BR','OR','AS','JH','CG','UK'
];
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function fakeMobile() {
  const first = Math.floor(Math.random() * 6); // 0..5
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return `${first}${rest}`;
}

// random valid-looking Indian plate, guaranteed different from `avoid`
function fakePlate(avoid) {
  for (let i = 0; i < 20; i++) {
    const st = RTO_STATES[Math.floor(Math.random() * RTO_STATES.length)];
    const dist = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    const a = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const b = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const num = String(Math.floor(Math.random() * 9000) + 1000);
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

function extractPlate(query) {
  if (!query || typeof query !== 'object') return '';
  if (query.regn_no) return query.regn_no;
  if (query.regn) return query.regn;

  const keys = Object.keys(query);
  const values = Object.values(query);

  for (const k of keys) {
    const cleaned = cleanPlate(k);
    if (PLATE_RE.test(cleaned)) return cleaned;
  }
  for (const v of values) {
    const cleaned = cleanPlate(v);
    if (PLATE_RE.test(cleaned)) return cleaned;
  }
  for (const k of keys) {
    const cleaned = cleanPlate(k);
    if (cleaned.length >= 6) return cleaned;
  }
  for (const v of values) {
    const cleaned = cleanPlate(v);
    if (cleaned.length >= 6) return cleaned;
  }
  return '';
}

async function fetchWithRetry(url, opts, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, opts);
    last = r;
    if (r.status !== 403 && r.status !== 429) return r;
    await new Promise(res => setTimeout(res, 700 + Math.random() * 1200));
  }
  return last;
}

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

  const mobile = fakeMobile();
  // referer plate must NOT equal the queried plate
  const refererPlate = fakePlate(plate);

  const url =
    `${TARGET}?regn_no=${encodeURIComponent(plate)}` +
    `&partner_code=&mobile_no=${mobile}` +
    `&source=apex&originData=false`;

  const opts = {
    method: 'GET',
    headers: {
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
      'TE': 'trailers',
    },
  };

  try {
    const upstream = await fetchWithRetry(url, opts);
    const text = await upstream.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.status).json({
      _made_by: 'DZ HACKER',
      _requested_regn: plate,
      _referer_regn: refererPlate,
      _mobile_used: mobile,
      _upstream_status: upstream.status,
      _timestamp: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return res.status(502).json({
      _made_by: 'DZ HACKER',
      _requested_regn: plate,
      _referer_regn: refererPlate,
      _mobile_used: mobile,
      _error: err.message || 'upstream failed',
    });
  }
}
