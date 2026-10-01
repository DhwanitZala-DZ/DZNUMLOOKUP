// api/veh.js
// Vaahan lookup proxy — /veh?GJ01KP8982
// Made by DZ HACKER

const TARGET = 'https://apex.renewbuyinsurance.com/api/v1/vaahan/registration_number/';

// fake 10-digit number, never starts with 6-9
function fakeMobile() {
  const first = Math.floor(Math.random() * 6); // 0..5
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return `${first}${rest}`;
}

// normalise plate: strip everything non-alnum, uppercase
function cleanPlate(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

// Indian plate shape: 2 letters + 1-2 digits + 0-3 letters + 4 digits
// matches: GJ01KP8982, GJ1KP8982, MH12AB1234, DL8CAF5030
const PLATE_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

// pull the plate out of whatever shape the query is in
function extractPlate(query) {
  if (!query || typeof query !== 'object') return '';

  // named params first
  if (query.regn_no) return query.regn_no;
  if (query.regn) return query.regn;

  // bare key case: /veh?GJ01KP8982  → { "GJ01KP8982": "" }
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

  // fallback: anything >=6 alnum so we don't hard-fail weird plates
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

  const url =
    `${TARGET}?regn_no=${encodeURIComponent(plate)}` +
    `&partner_code=&mobile_no=${mobile}` +
    `&source=apex&originData=false`;

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        Authorization: 'null',
        Connection: 'keep-alive',
        Referer:
          `https://apex.renewbuyinsurance.com/motor/?reg_no=${encodeURIComponent(plate)}` +
          `&mobile_no=${mobile}&vehicle=fourWheeler`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
      },
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.status).json({
      _made_by: 'DZ HACKER',
      _requested_regn: plate,
      _mobile_used: mobile,
      _upstream_status: upstream.status,
      _timestamp: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return res.status(502).json({
      _made_by: 'DZ HACKER',
      _requested_regn: plate,
      _mobile_used: mobile,
      _error: err.message || 'upstream failed',
    });
  }
}
