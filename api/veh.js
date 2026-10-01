// api/vaahan.js
// Vercel serverless proxy for RenewBuy Vaahan lookup
// Made by DZ HACKER

const TARGET = 'https://apex.renewbuyinsurance.com/api/v1/vaahan/registration_number/';

// generate a fake 10-digit number that does NOT start with 6-9
// so it starts with 0-5, and is 10 digits total
function fakeMobile() {
  const first = Math.floor(Math.random() * 6); // 0..5
  let rest = '';
  for (let i = 0; i < 9; i++) {
    rest += Math.floor(Math.random() * 10);
  }
  return `${first}${rest}`;
}

export default async function handler(req, res) {
  // CORS so you can call it from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const regn = req.query.regn_no || req.query.regn || 'GJ-01-KP-8982';

  // fresh mobile per request
  const mobile = fakeMobile();

  // split plate so it works whether you pass GJ-01-KP-8982 or GJ01KP8982
  const clean = String(regn).replace(/-/g, '').toUpperCase();

  const url =
    `${TARGET}?regn_no=${encodeURIComponent(clean)}` +
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
          `https://apex.renewbuyinsurance.com/motor/?reg_no=${encodeURIComponent(clean)}` +
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
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // stamp it
    const stamped = {
      _made_by: 'DZ HACKER',
      _requested_regn: clean,
      _mobile_used: mobile,
      _upstream_status: upstream.status,
      _timestamp: new Date().toISOString(),
      data,
    };

    res.status(upstream.status).json(stamped);
  } catch (err) {
    res.status(502).json({
      _made_by: 'DZ HACKER',
      _requested_regn: clean,
      _mobile_used: mobile,
      _error: err.message || 'upstream failed',
    });
  }
}
