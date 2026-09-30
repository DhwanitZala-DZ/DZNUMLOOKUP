/**
 * DZ OSINT — Phone Number Lookup
 * MADE BY DZ HACKER
 *
 * Usage:  https://dz-osint.vercel.app/num?9997774567
 *         https://dz-osint.vercel.app/num?q=9997774567
 *         https://dz-osint.vercel.app/num/9997774567
 *         https://dz-osint.vercel.app/num?9997774567&key=dz-hacker
 */

// ────────────────────────────────────────────────────────────────
// CONFIG — everything hardcoded here
// ────────────────────────────────────────────────────────────────

const UPSTREAM    = 'https://aegisosint.lovable.app';
const SERVER_FN   = '3537b4c4c6768e84fe0c0558f5fef63d61e1e2ef20ce24538d3ca5962aa49ff8';
const TYPE        = 'num';

const JWT         = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI5OTVlNDJkLThkMTgtNDE0MS04Yjc0LWVhM2ExZmI3ODhlZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2Ztd2trZHRjY3RpaW1weXJhbHFwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzOTc1NzY2Zi0wODIwLTQzMjEtYjNmZS1mNTI5ODdmNTIzMDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwNzcwMTY1LCJpYXQiOjE3OTA3NjY1NjUsImVtYWlsIjoibWVoYXRhcmFqdUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWVoYXRhcmFqdUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiIzOTc1NzY2Zi0wODIwLTQzMjEtYjNmZS1mNTI5ODdmNTIzMDYiLCJ1c2VybmFtZSI6Im1laGF0YXJhanUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc5MDc2NjU2NX1dLCJzZXNzaW9uX2lkIjoiMDZmNTU3MzYtMjAxZC00YzJlLWEzY2UtZDQwOGUzMTI1MDkyIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.KY0uWxP39gMQ6PJfCa5xWo9uA6utQRVGfNSkIrkGM4Yy2Q5DV7nDMAhM9yYi5rMxEO6K1wxiwTLe-1_mtp_20g';

// Set to null to leave the endpoint open. Set to a string to require ?key=THAT
const DZ_API_KEY  = null;

// ────────────────────────────────────────────────────────────────
// Seroval framed-response decoder
// ────────────────────────────────────────────────────────────────
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
      const k = node.p?.k || [];
      const v = node.p?.v || [];
      for (let i = 0; i < k.length; i++) out.set(decode(k[i]), decode(v[i]));
      return out;
    }
    case 9: return (node.a || []).map(decode);
    case 10:
    case 11: {
      const out = {};
      const k = node.p?.k || [];
      const v = node.p?.v || [];
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
    case 18: return node.s ?? null;
    case 19: return node.s ?? null;
    case 20: return node.s ?? null;
    case 21: return node.s ?? null;
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
    case 28: case 30: return (node.a || []).map(decode);
    case 31: return (node.a || []).map(decode);
    case 35: return (node.a || []).map(decode);
    default:
      if (node.p && (node.p.k || node.p.v)) return decode({ t: 10, p: node.p });
      if (node.a) return (node.a || []).map(decode);
      if (node.s !== undefined) return node.s;
      return null;
  }
}

// ────────────────────────────────────────────────────────────────
// Extract query
// ────────────────────────────────────────────────────────────────
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

  const path = req.url || '';
  const m = path.match(/\/num\/([^/?#]+)/);
  if (m) return decodeURIComponent(m[1]).trim();

  return null;
}

// ────────────────────────────────────────────────────────────────
// Upstream call
// ────────────────────────────────────────────────────────────────
async function callUpstream(query) {
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
      'authorization': `Bearer ${JWT}`,
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

  try {
    return { parsed: JSON.parse(payload), status: res.status };
  } catch {
    return { raw: text, status: res.status, parse_error: true };
  }
}

// ────────────────────────────────────────────────────────────────
// Deduplicate records by their JSON signature
// ────────────────────────────────────────────────────────────────
function dedupe(records) {
  const seen = new Set();
  const out = [];
  for (const r of records) {
    if (!r || typeof r !== 'object') { out.push(r); continue; }
    // stable key from sorted entries so field order doesn't matter
    const key = Object.keys(r).sort().map(k => `${k}=${JSON.stringify(r[k])}`).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// Output shaper — everything passthrough + dedup
// ────────────────────────────────────────────────────────────────
function shape(decoded, query) {
  const result = decoded?.result || {};
  const inner  = result?.result || {};

  // pull records
  const rawRecords = Array.isArray(inner.result) ? inner.result : [];

  // dedupe — broker sends each row multiple times
  const records = dedupe(rawRecords);

  // every non-record field from `inner` — nothing whitelisted
  const brokerInfo = {};
  for (const [k, v] of Object.entries(inner)) {
    if (k === 'result') continue;   // records already pulled out
    brokerInfo[k] = v;
  }

  return {
    ok: result.ok === true,
    query,
    type: TYPE,

    // top-level from outer result
    credits_left: result.creditsLeft ?? null,
    search_id: result.searchId ?? null,

    // broker metadata — developer, success, status, cached,
    // req_left, req_total, expiry, response_time, and anything new
    broker: brokerInfo,

    // convenience aliases (kept so nothing breaks)
    status: inner.status ?? null,
    cached: inner.cached ?? null,
    response_time: inner.response_time ?? null,
    developer: inner.developer ?? null,
    broker_quota: {
      requests_left:  inner.req_left  ?? null,
      requests_total: inner.req_total ?? null,
      expiry:         inner.expiry    ?? null,
    },

    // records — deduped, but complete
    records,
    record_count: records.length,
    raw_record_count: rawRecords.length,
    duplicates_removed: rawRecords.length - records.length,

    // untouched raw decoded upstream — every field, including
    // context, error flags, nested result tree
    raw_upstream: decoded ?? null,

    // error — surfaced from all known locations
    error: decoded?.error?.message
        ?? (decoded?.error && decoded.error !== false ? decoded.error : null)
        ?? null,

    made_by: 'DZ HACKER',
  };
}

// ────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dz-key');
  res.setHeader('X-Powered-By', 'DZ HACKER');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (DZ_API_KEY) {
    const provided = req.headers['x-dz-key'] || req.query?.key;
    if (provided !== DZ_API_KEY) {
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

  try {
    const { parsed, raw, status, parse_error } = await callUpstream(query);

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
