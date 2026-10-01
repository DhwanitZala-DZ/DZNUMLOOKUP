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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dz-key');
  res.setHeader('X-Powered-By', 'DZ HACKER');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // grab the first query value, whatever its key is
  // supports: /veh?GJ01KP8982, /veh?regn_no=GJ01KP8982, /veh?regn=GJ01KP8982
  const rawQuery =
    req.query.regn_no ||
    req.query.regn ||
    req.query.regn_no === '' ? req.query.regn_no :
    Object.keys(req.query)[0];

  const plateCandidate =
    req.query.regn_no ||
    req.query.regn ||
    Object.values(req.query)[0] ||
    '';

  const plate = cleanPlate(plateCandidate);

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
