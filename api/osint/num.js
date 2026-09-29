export default async function handler(req, res) {
  // Get the number from query (e.g., /osint/num?9999999999)
  const url = new URL(req.url, `https://${req.headers.host}`);
  const number = url.searchParams.get('num') || url.pathname.split('/').pop().split('?')[0];

  // Try to extract number from query string key (e.g., ?9999999999)
  let queryNumber = number;
  if (!queryNumber || queryNumber === 'num') {
    const keys = [...url.searchParams.keys()];
    if (keys.length > 0) queryNumber = keys[0];
  }

  if (!queryNumber || !/^\d{10}$/.test(queryNumber)) {
    return res.status(400).json({
      success: false,
      made_by: "DZ HACKER",
      error: "Invalid or missing number. Use /osint/num?9988776665"
    });
  }

  const payload = {
    t: {
      t: 10,
      i: 0,
      p: {
        k: ["data"],
        v: [
          {
            t: 10,
            i: 1,
            p: {
              k: ["type", "query"],
              v: [
                { t: 1, s: "num" },
                { t: 1, s: queryNumber }
              ]
            },
            o: 0
          }
        ]
      },
      o: 0
    },
    f: 63,
    m: []
  };

  try {
    const apiRes = await fetch(
      'https://aegisosint.lovable.app/_serverFn/3537b4c4c6768e84fe0c0558f5fef63d61e1e2ef20ce24538d3ca5962aa49ff8',
      {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://aegisosint.lovable.app/search?type=num',
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await apiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(200).json({
      success: true,
      made_by: "DZ HACKER",
      number: queryNumber,
      result: data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      made_by: "DZ HACKER",
      error: err.message
    });
  }
}
