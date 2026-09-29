// Vehicle Info API
// Leak by Abhigyan — If you remove credit your mother will be fuck
// Made by DZ HACKER

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);

  // ---------- API ON / OFF TOGGLE ----------
  // 1) Query override:  /veh?api=off   OR  /veh?api=on
  // 2) Env variable:    API_STATUS=off  (set in Vercel dashboard)
  // 3) Default:         on
  const apiToggle = (url.searchParams.get('api') || '').toLowerCase();
  const apiStatus = apiToggle || (process.env.API_STATUS || 'on').toLowerCase();

  if (apiStatus === 'off') {
    return res.status(503).json({
      success: false,
      made_by: "DZ HACKER",
      status: "MAINTENANCE",
      message: "🛠️ API is under maintenance. Please try again later.",
      credit: "Leak by Abhigyan"
    });
  }

  // ---------- EXTRACT VEHICLE NUMBER ----------
  let regNo =
    url.searchParams.get('reg') ||
    url.searchParams.get('regno') ||
    url.searchParams.get('regn_no') ||
    url.searchParams.get('vehicle');

  // Support /veh?UP-70-EC-6873  (value-less query key)
  if (!regNo) {
    const keys = [...url.searchParams.keys()].filter(k => k !== 'api' && k !== 'mobile');
    if (keys.length > 0) regNo = keys[0];
  }

  // Support /veh/UP-70-EC-6873 (path style)
  if (!regNo) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 1 && parts[0] === 'veh') regNo = parts[1];
  }

  if (!regNo) {
    return res.status(400).json({
      success: false,
      made_by: "DZ HACKER",
      error: "Missing vehicle number.",
      usage: "/veh?UP-70-EC-6873  or  /veh?reg=UP-70-EC-6873"
    });
  }

  regNo = decodeURIComponent(regNo).toUpperCase().trim().replace(/\s+/g, '');

  // Basic validation: Indian format e.g. UP70EC6873 / UP-70-EC-6873
  if (!/^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{0,3}[-\s]?\d{1,4}$/.test(regNo)) {
    return res.status(400).json({
      success: false,
      made_by: "DZ HACKER",
      error: "Invalid vehicle number format.",
      received: regNo,
      example: "UP-70-EC-6873"
    });
  }

  const mobile = url.searchParams.get('mobile') || '9838230002';

  // ---------- BUILD UPSTREAM REQUEST ----------
  const upstream = 'https://www.renewbuy.com/api/v1/vaahan/registration_number/';
  const params = new URLSearchParams({
    regn_no: regNo,
    partner_code: '',
    mobile_no: mobile,
    source: 'apex',
    originData: 'false'
  });

  const headers = {
    'Host': 'apex.renewbuyinsurance.com',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'sec-ch-ua-platform': '"Android"',
    'authorization': 'null',
    'sec-ch-ua': '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
    'sec-ch-ua-mobile': '?1',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': `https://apex.renewbuyinsurance.com/motor/?reg_no=${regNo}&mobile_no=${mobile}&vehicle=fourWheeler`,
    'accept-language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6',
    'priority': 'u=1, i',
    'Cookie': '_gcl_au=1.1.1671316615.1790679227; _ga=GA1.1.1355146237.1790679228; _clck=xt3bne%5E2%5Eg9v%5E0%5E2463; _clsk=1jxtq4g%5E1790679230884%5E1%5E1%5Ep.clarity.ms%2Fcollect; location=block; _ga_CTWKWSPJQ1=GS2.1.s1790679228$o1$g1$t1790679262$j26$l0$h0'
  };

  try {
    const apiRes = await fetch(`${upstream}?${params.toString()}`, {
      method: 'GET',
      headers
    });

    const text = await apiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // If upstream returned HTML (blocked / error page), flag it
    if (typeof text === 'string' && text.trimStart().startsWith('<')) {
      return res.status(502).json({
        success: false,
        made_by: "DZ HACKER",
        reg_no: regNo,
        error: "Upstream returned a non-JSON response (likely blocked or rate-limited).",
        upstream_status: apiRes.status,
        result: data,
        credit: "Leak by DZ"
      });
    }

    return res.status(200).json({
      success: true,
      made_by: "DZ HACKER",
      reg_no: regNo,
      result: data,
      credit: "Leak by DZ"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      made_by: "DZ HACKER",
      reg_no: regNo,
      error: err.message,
      credit: "Leak by DZ"
    });
  }
}
