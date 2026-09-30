/**
 * OSINT Hub — Phone / Vehicle / Aadhaar Lookup Proxy
 *
 * MADE BY DZ HACKER
 *
 * Proxies the upstream TanStack server function, decodes the
 * framed/seroval response, and returns clean JSON.
 */

const UPSTREAM = 'https://aegisosint.lovable.app';
const SERVER_FN = '3537b4c4c6768e84fe0c0558f5fef63d61e1e2ef20ce24538d3ca5962aa49ff8';

// Optional: lock this endpoint behind a shared secret so randoms don't burn your credits.
// Set DZ_API_KEY in Vercel env vars. If unset, the endpoint is open.
const DZ_API_KEY = process.env.DZ_API_KEY || null;

const JWT = process.env.OSINT_JWT || null;

// ────────────────────────────────────────────────────────────────
// Seroval framed-response decoder (TanStack Start)
// ────────────────────────────────────────────────────────────────

/**
 * The upstream returns a tree like:
 *   { t: <type>, i: <id>, p: { k: [...keys], v: [...values] }, s: <scalar>, a: [...] }
 *
 * Type codes we care about:
 *   0  = number      (s = value)
 *   1  = string      (s = value)
 *   2  = boolean     (s: 0=null, 1=false, 2=true, 3=false-ish, 4=-0)
 *   9  = array       (a = elements)
 *   10 = object      (p.k = keys, p.v = values)
 *   11 = Map         (like 10)
 *   25 = plugin obj  (c = tag, s = payload)
 */
function decode(node) {
  if (node === null || node === undefined) return null;

  switch (node.t) {
    case 0: return Number(node.s);
    case 1: return String(node.s);
    case 2: {
      // boolean / null tagged
      const map = { 0: null, 1: false, 2: true, 3: false, 4: -0, 5: Infinity, 6: -Infinity, 7: NaN };
      return map[node.s] ?? null;
    }
    case 4: return null; // undefined marker
    case 9: return (node.a || []).map(decode);
    case 10:
    case 11: {
      const out = {};
      const keys = node.p?.k || [];
      const vals = node.p?.v || [];
      for (let i = 0; i < keys.length; i++) {
        const k = typeof keys[i] === 'string' ? keys[i] : decode(keys[i]);
        out[k] = decode(vals[i]);
      }
      return out;
    }
    case 25: {
      // Plugin-wrapped value — grab .s and try to decode as object
      const inner = node.s;
      if (inner && typeof inner === 'object') {
        const obj = decode(inner);
        if (obj && typeof obj === 'object' && 'message' in obj) {
          return { error: obj.message };
        }
        return obj;
      }
      return inner ?? null;
    }
    default:
      // Unknown — try p/a/s as fallback
      if (node.p) return decode({ t: 10, p: node.p });
      if (node.s !== undefined) return node.s;
      return null;
  }
}

// ────────────────────────────────────────────────────────────────
// Upstream caller
// ────────────────────────────────────────────────────────────────

async function callUpstream(type, query, token) {
  const body = {
    t: {
      t: 10,
      i: 0,
      p: {
        k: ['data'],
        v: [
          {
            t: 10,
            i: 1,
            p: {
              k: ['type', 'query'],
              v: [
                { t: 1, s: type },
                { t: 1, s: query },
              ],
            },
            o: 0,
          },
        ],
      },
      o: 0,
    },
    f: 63,
    m: [],
  };

  const res = await fetch(`${UPSTREAM}/_serverFn/${SERVER_FN}`, {
    method: 'POST',
    headers: {
      'accept': 'application/x-tss-framed, application/x-ndjson, application/json',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'x-tsr-serverfn': 'true',
      'origin': UPSTREAM,
      'referer': `${UPSTREAM}/search?type=${type}`,
      'user-agent': 'DZ-HACKER-OSINT/1.0',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload = text;

  // Framed responses: first line is a JSON header frame, subsequent frames are payload.
  // The stream may have multiple \n-separated JSON objects.
  const lines = text.split('\n').filter(Boolean);
  if (lines.length > 1) {
    // Try each line — pick the largest one (usually the payload)
    let best = '';
    for (const line of lines) {
      if (line.length > best.length) best = line;
    }
    payload = best;
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { raw: text, parse_error: true };
  }

  return { parsed, raw_status: res.status };
}

// ────────────────────────────────────────────────────────────────
// Response shaper — extract just the useful bits
// ────────────────────────────────────────────────────────────────

function shapeResponse(decoded) {
  const result = decoded?.result || {};
  const inner = result?.result || {};

  const out = {
    ok: result.ok === true,
    credit_used: result.creditsLeft !== undefined ? 1 : 0,
    credits_left: result.creditsLeft ?? null,
    search_id: result.searchId ?? null,
    status: inner.status ?? null,
    cached: inner.cached ?? null,
    response_time: inner.response_time ?? null,
    // Upstream broker quota (the "38xx remaining" numbers)
    broker_quota: {
      requests_left: inner.req_left ?? null,
      requests_total: inner.req_total ?? null,
      expiry: inner.expiry ?? null,
    },
    // The actual records
    records: Array.isArray(inner.result) ? inner.result : [],
    record_count: Array.isArray(inner.result) ? inner.result.length : 0,
    // Error path
    error: decoded?.error?.message ?? decoded?.error ?? null,
    // Attribution
    made_by: 'DZ HACKER',
    source: UPSTREAM,
  };

  return out;
}

// ────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dz-key');
    return res.status(204).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Powered-By', 'DZ HACKER');
  res.setHeader('Cache-Control', 'no-store');

  // Optional shared-secret gate
  if (DZ_API_KEY) {
    const provided = req.headers['x-dz-key'] || req.query?.key;
    if (provided !== DZ_API_KEY) {
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized',
        made_by: 'DZ HACKER',
      });
    }
  }

  // Parse query / body
  const params = req.method === 'GET' ? req.query : { ...req.query, ...(req.body || {}) };
  const type = params.type || 'num';
  const query = params.query || params.q || params.number;

  if (!query) {
    return res.status(400).json({
      ok: false,
      error: 'Missing required param: query',
      usage: '/api/lookup?type=num&query=9997774567',
      supported_types: ['num', 'v_num', 'aadhar_info', 'aadhar_fam_v2', 'tg_num'],
      made_by: 'DZ HACKER',
    });
  }

  const token = params.token || JWT;
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'Server misconfigured: OSINT_JWT env var is not set',
      made_by: 'DZ HACKER',
    });
  }

  try {
    const { parsed, raw_status, parse_error, raw } = await callUpstream(type, query, token);

    if (parse_error) {
      return res.status(502).json({
        ok: false,
        error: 'Upstream returned unparseable payload',
        raw_status,
        raw_preview: (raw || '').slice(0, 500),
        made_by: 'DZ HACKER',
      });
    }

    const decoded = decode(parsed);
    const shaped = shapeResponse(decoded);

    return res.status(shaped.ok ? 200 : 402).json(shaped);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Upstream call failed',
      made_by: 'DZ HACKER',
    });
  }
}
