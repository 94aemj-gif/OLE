#!/usr/bin/env node
// Smoke-test the /api/* handlers against the live Neon DB without vercel dev.
// Each handler is a (req, res) function with the Vercel signature.

import http from 'node:http';
import { readFileSync } from 'node:fs';

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const { default: configHandler } = await import('../api/config.js');
const { default: capturesHandler } = await import('../api/captures.js');
const { default: auditHandler } = await import('../api/audit.js');
const { default: tabletHealthHandler } = await import('../api/tablet-health.js');

function fakeRes() {
  let status = 200;
  let body = '';
  const headers = {};
  return {
    status(s) { status = s; return this; },
    setHeader(k, v) { headers[k] = v; },
    end(b) { body = b ?? ''; },
    get statusCode() { return status; },
    get body() { return body; },
    get headers() { return headers; }
  };
}

function fakeReq({ method, url, body, query }) {
  const req = new http.IncomingMessage(null);
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost' };
  req.query = query ?? {};
  if (body !== undefined) req.body = body;
  return req;
}

async function run(name, handler, req) {
  const res = fakeRes();
  await handler(req, res);
  const parsed = res.body ? JSON.parse(res.body) : null;
  console.log(`${res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204 ? '✓' : '✗'} ${name} → ${res.statusCode}`);
  if (process.env.VERBOSE) console.log('  body:', JSON.stringify(parsed)?.slice(0, 200));
  return { status: res.statusCode, body: parsed };
}

console.log('Smoke testing /api/* against Neon...\n');

await run('GET  /api/config', configHandler,
  fakeReq({ method: 'GET', url: '/api/config' }));

await run('GET  /api/captures', capturesHandler,
  fakeReq({ method: 'GET', url: '/api/captures?limit=10' }));

await run('POST /api/audit', auditHandler,
  fakeReq({ method: 'POST', url: '/api/audit', body: {
    actor_type: 'system',
    actor_id: 'smoke',
    actor_name: 'smoke-test',
    action: 'ping'
  }}));

await run('POST /api/captures', capturesHandler,
  fakeReq({ method: 'POST', url: '/api/captures', body: {
    line_id: 'L1',
    operator_number: '12345',
    client_timestamp: new Date().toISOString(),
    shift_id: 'SHIFT-A',
    hour_bucket: new Date().toISOString(),
    units_produced: 5,
    scrap_rows: [],
    downtime_rows: [],
    payload_hash: 'smoke-' + Date.now(),
    client_id: 'smoke-client'
  }}));

await run('POST /api/tablet-health', tabletHealthHandler,
  fakeReq({ method: 'POST', url: '/api/tablet-health', body: {
    tablet_id: 'smoke-tablet',
    last_heartbeat: new Date().toISOString(),
    app_version: '1.0.0'
  }}));

await run('GET  /api/tablet-health', tabletHealthHandler,
  fakeReq({ method: 'GET', url: '/api/tablet-health' }));

console.log('\nDone.');
