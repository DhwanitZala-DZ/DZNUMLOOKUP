/**
 * DZ OSINT — Phone Number Lookup
 * MADE BY DZ HACKER
 */

const UPSTREAM      = 'https://aegisosint.lovable.app';
const SERVER_FN     = '3537b4c4c6768e84fe0c0558f5fef63d61e1e2ef20ce24538d3ca5962aa49ff8';
const TYPE          = 'num';
const TOKEN_SERVER  = 'https://token-donation.site.je/refresh.php';

const DZ_KEY           = null;
const TOKEN_SERVER_KEY = null;

// ─── Seroval decoder ─────────────────────────────────────────────
function decode(node) {
  if (node === null || node === undefined) return null;
  if (typeof node !== 'object') return node;
  switch (node.t) {
    case 0: return Number(node.s);
    case 1: return String(node.s);
    case 2: {
      const m = { 0: null, 1: false, 2: true, 3: false, 4: -0, 5: Infinity, 6: -Infinity, 7: NaN };
      return m[node.s] ?? null;
    }
    case 3: return node.s !== undefined ? BigInt(node.s) : null;
    case 4: return undefined;
    case 5: return node.s !== undefined ? new Date(Number(node.s)) : null;
    case 6: return node.s ?? null;
    case 7: return new Set((node.a || []).map(decode));
    case 8: {
      const out = new Map();
      const k = node.p?.k || [], v = node.p?.v || [];
      for (let i = 0; i < k.length; i++) out.set(decode(k[i]), decode(v[i]));
      return out;
    }
    case 9: return (node.a || []).map(decode);
    case 10:
    case 11: {
      const out = {};
      const k = node.p?.k || [], v = node.p?.v || [];
      for (let i = 0; i < k.length; i++) {
        const key = typeof k[i] === 'string' ? k[i] : decode(k[i]);
        out[key] = decode(v[i]);
      }
      return out;
    }
    case 12: return decode(node.f ?? node.s ?? null);
    case 13: case 14: {
      const out = { name: 'Error', message: '' };
      if (node.p) Object.assign(out, decode({ t: 10, p: node.p }));
      if (node.s) out.message = node.s;
      if (node.m) out.message = node.m;
      return out;
    }
    case 15: case 16: return node.f ?? node.s ?? null;
    case 17: return null;
    case 18: case 19: case 20: case 21: return node.s ?? null;
    case 22: case 23: case 24: return null;
    case 25: {
      const inner = node.s;
      if (inner && typeof inner === 'object') {
        const obj = decode(inner);
        if (obj && typeof obj === 'object' && 'message' in obj) return { error: obj.message };
        return obj;
      }
      return inner ?? null;
    }
    case 28: case 30: case 31: case 35: return (node.a || []).map(decode);
    default:
      if (node.p && (node.p.k || node.p.v)) return decode({ t: 10, p: node.p });
      if (node.a) return (node.a || []).map(decode);
      if (node.s !== undefined) return node.s;
      return null;
  }
}

// ─── Extract query ───────────────────────────────────────────────
function extractQuery(req) {
  if (req.body && typeof req.body === 'object' && req.body.query) {
    return String(req.body.query).trim();
  }
  const q = req.query || {};
  if (q.q) return String(q.q).trim();
  if (q.query) return String(q.query).trim();
  if (q.number) return String(q.number).trim();
  for (const k of Object.keys(q)) {
    if (k === 'key' || k === 'type') continue;
    if (/^[0-9]{6,}$/.test(k)) return k;
    const val = q[k];
    if (typeof val === 'string' && val.length >= 6) return val.trim();
  }
  const m = (req.url || '').match(/\/num\/([^/?#]+)/);
  if (m) return decodeURIComponent(m[1]).trim();
  return null;
}

// ─── ROBUST JSON PARSER ──────────────────────────────────────────
// Strips InfinityFree ad injections, PHP warnings, BOMs, and
// extracts the first {...} block that parses as JSON.
function parseLooseJson(text) {
  if (!text) return null;

  // Strip UTF-8 BOM
  text = text.replace(/^\uFEFF/, '');

  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Try to find first '{' and matching '}'
  const first = text.indexOf('{');
  if (first === -1) return null;

  // Walk to matching close brace
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = first; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = false; continue; }
    } else {
      if (c === '"') { inStr = true; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
  }

  if (end === -1) return null;

  const slice = text.slice(first, end);
  try { return JSON.parse(slice); } catch { return null; }
}

// ─── Fetch JWT from PHP with 503 retry ───────────────────────────
async function getToken(retries = 3) {
  let lastDiagnostic = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const url = TOKEN_SERVER_KEY
      ? `${TOKEN_SERVER}?key=${encodeURIComponent(TOKEN_SERVER_KEY)}`
      : TOKEN_SERVER;

    let res, rawText = '';
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'user-agent': 'DZ-OSINT/1.0',
        },
      });
      rawText = await res.text();
    } catch (err) {
      lastDiagnostic = 'network error: ' + err.message;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw new Error(lastDiagnostic);
    }

    // Debug: log the first chunk of whatever PHP said
    console.log('[DZ] PHP status:', res.status, 'body start:', rawText.slice(0, 300));

    const data = parseLooseJson(rawText);

    if (!data) {
      lastDiagnostic = `PHP returned ${res.status} with non-JSON body: ${rawText.slice(0, 120)}`;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      throw new Error(lastDiagnostic);
    }

    // 503 → PHP is refreshing
    if (res.status === 503) {
      const wait = Math.min(Number(data.retry_after) || 5, 15);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }
      throw new Error('token refresh timed out');
    }

    if (data.ok === true && data.access_token) {
      return data.access_token;
    }

    // PHP returned valid JSON but ok:false
    lastDiagnostic = data.error || `PHP returned ok:false with no message`;
    throw new Error(lastDiagnostic);
  }

  throw new Error(lastDiagnostic || 'token unavailable after retries');
}

// ─── Call upstream ───────────────────────────────────────────────
async function callUpstream(query, token) {
  const body = {
    t: {
      t: 10, i: 0,
      p: {
        k: ['data'],
        v: [{
          t: 10, i: 1,
          p: {
            k: ['type', 'query'],
            v: [{ t: 1, s: TYPE }, { t: 1, s: query }],
          },
          o: 0,
        }],
      },
      o: 0,
    },
    f: 63, m: [],
  };

  const res = await fetch(`${UPSTREAM}/_serverFn/${SERVER_FN}`, {
    method: 'POST',
    headers: {
      'accept': 'application/x-tss-framed, application/x-ndjson, application/json',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'x-tsr-serverfn': 'true',
      'origin': UPSTREAM,
      'referer': `${UPSTREAM}/search?type=${TYPE}`,
      'user-agent': 'DZ-OSINT/1.0',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const lines = text.split('\n').filter(Boolean);
  let payload = text;
  if (lines.length > 1) {
    payload = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
  }
  try { return { parsed: JSON.parse(payload), status: res.status }; }
  catch { return { raw: text, status: res.status, parse_error: true }; }
}

// ─── Helpers ─────────────────────────────────────────────────────
function dedupe(records) {
  const seen = new Set(); const out = [];
  for (const r of records) {
    if (!r || typeof r !== 'object') { out.push(r); continue; }
    const key = Object.keys(r).sort().map(k => `${k}=${JSON.stringify(r[k])}`).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function scrub(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/^developer$/i.test(k)) continue;
    out[k] = scrub(v);
  }
  return out;
}

// ─── Shape output ────────────────────────────────────────────────
function shape(decoded, query) {
  const result = decoded?.result || {};
  const inner  = result?.result || {};
  const rawRecords = Array.isArray(inner.result) ? inner.result : [];
  const records = dedupe(rawRecords);

  const brokerInfo = {};
  for (const [k, v] of Object.entries(inner)) {
    if (k === 'result') continue;
    if (/^developer$/i.test(k)) continue;
    brokerInfo[k] = v;
  }

  return {
    ok: result.ok === true,
    query,
    type: TYPE,
    credits_left: result.creditsLeft ?? null,
    search_id: result.searchId ?? null,
    broker: brokerInfo,
    status: inner.status ?? null,
    cached: inner.cached ?? null,
    response_time: inner.response_time ?? null,
    broker_quota: {
      requests_left:  inner.req_left  ?? null,
      requests_total: inner.req_total ?? null,
      expiry:         inner.expiry    ?? null,
    },
    records,
    record_count: records.length,
    raw_record_count: rawRecords.length,
    duplicates_removed: rawRecords.length - records.length,
    raw_upstream: scrub(decoded) ?? null,
    error: decoded?.error?.message
        ?? (decoded?.error && decoded.error !== false ? decoded.error : null)
        ?? null,
    developer: 'DZ HACKER',
    made_by: 'DZ HACKER',
  };
}

// ─── Handler ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dz-key');
  res.setHeader('X-Powered-By', 'DZ HACKER');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (DZ_KEY) {
    const provided = req.headers['x-dz-key'] || req.query?.key;
    if (provided !== DZ_KEY) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', made_by: 'DZ HACKER' });
    }
  }

  const query = extractQuery(req);
  if (!query) {
    return res.status(400).json({
      ok: false,
      error: 'Missing query',
      usage: '/num?9997774567',
      made_by: 'DZ HACKER',
    });
  }

  let token;
  try {
    token = await getToken();
  } catch (err) {
    return res.status(503).json({
      ok: false,
      error: 'token unavailable: ' + err.message,
      retry_after: 5,
      made_by: 'DZ HACKER',
    });
  }

  try {
    const { parsed, raw, status, parse_error } = await callUpstream(query, token);
    if (parse_error) {
      return res.status(502).json({
        ok: false,
        error: 'Upstream returned unparseable payload',
        upstream_status: status,
        raw_preview: (raw || '').slice(0, 500),
        made_by: 'DZ HACKER',
      });
    }
    const out = shape(decode(parsed), query);
    return res.status(out.ok ? 200 : 402).json(out);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Upstream call failed',
      made_by: 'DZ HACKER',
    });
  }
}
