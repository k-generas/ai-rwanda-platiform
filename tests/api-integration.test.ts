import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'os';
import path from 'path';

let BASE_URL = '';
let tmpDataDir = '';
let serverProc: ChildProcess | null = null;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Could not determine free port')));
      }
    });
  });
}

async function waitForHealth(url: string, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Test server did not become healthy at ${url} within ${timeoutMs}ms`);
}

before(async () => {
  const port = await getFreePort();
  BASE_URL = `http://127.0.0.1:${port}`;
  tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aer-test-server-'));
  const tsxBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');
  serverProc = spawn(tsxBin, ['server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      AER_DATA_DIR: tmpDataDir
    },
    stdio: 'ignore'
  });
  await waitForHealth(BASE_URL);
});

after(() => {
  if (serverProc && serverProc.exitCode === null) {
    serverProc.kill('SIGKILL');
  }
  if (tmpDataDir && fs.existsSync(tmpDataDir)) {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  }
});

test('GET /api/health, /api/public/runtime (with ETag 304), and /api/integrations/status leak zero secrets', async () => {
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
  const healthJson = (await healthRes.json()) as { status: string; service: string };
  assert.equal(healthJson.status, 'ok');
  assert.equal(healthJson.service, 'ai-education-rwanda');

  const runtimeRes = await fetch(`${BASE_URL}/api/public/runtime`);
  assert.equal(runtimeRes.status, 200);
  const etag = runtimeRes.headers.get('etag');
  assert.ok(etag);
  const runtimeJson = (await runtimeRes.json()) as {
    platform: string;
    languages: string[];
    integrations: Record<string, unknown>;
  };
  assert.equal(runtimeJson.platform, 'AI Education Rwanda');
  assert.deepEqual(runtimeJson.languages, ['en', 'rw']);
  assert.equal(runtimeJson.integrations.momoActive, false);
  assert.equal(runtimeJson.integrations.airtelActive, false);

  const cachedRes = await fetch(`${BASE_URL}/api/public/runtime`, {
    headers: { 'If-None-Match': etag }
  });
  assert.equal(cachedRes.status, 304);

  const statusRes = await fetch(`${BASE_URL}/api/integrations/status`);
  assert.equal(statusRes.status, 200);
  const statusText = await statusRes.text();
  assert.equal(statusText.includes('apiKey'), false);
  assert.equal(statusText.includes('subscriptionKey'), false);
});

test('GET/POST /api/admin/* endpoints strictly require Superadmin Bearer authentication', async () => {
  for (const [method, endpoint] of [
    ['GET', '/api/admin/integrations'],
    ['POST', '/api/admin/integrations'],
    ['POST', '/api/admin/integrations/test'],
    ['GET', '/api/admin/metrics']
  ] as const) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify({}) : undefined
    });
    assert.equal(res.status, 401, `${method} ${endpoint} without auth must return 401`);

    const fakeAuthRes = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: 'Bearer invalid.jwt.token.for.testing.only',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      body: method === 'POST' ? JSON.stringify({}) : undefined
    });
    assert.equal(fakeAuthRes.status, 403, `${method} ${endpoint} with forged token must return 403`);
  }
});

test('POST /api/payments/verify, /api/payments/status, and webhooks enforce auth and safe defaults', async () => {
  const unauthVerify = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'attacker',
      courseId: 'challenge-28',
      provider: 'mtn_momo',
      phone: '0788123456',
      amountRwf: 20000,
      idempotencyKey: 'idem_1'
    })
  });
  assert.equal(unauthVerify.status, 401);

  const badTokenVerify = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer fake.firebase.id.token.value.12345',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId: 'attacker' })
  });
  assert.equal(badTokenVerify.status, 401);

  const statusUnauth = await fetch(`${BASE_URL}/api/payments/status/pay_123456`);
  assert.equal(statusUnauth.status, 401);

  const momoWebhook = await fetch(`${BASE_URL}/api/webhooks/momo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ externalId: 'MOMO-NONEXISTENT', status: 'SUCCESSFUL' })
  });
  assert.equal(momoWebhook.status, 200);
  const webhookJson = (await momoWebhook.json()) as { received: boolean };
  assert.equal(webhookJson.received, true);
});

test('File upload & delivery endpoints reject unauthenticated requests and unknown/traversal IDs safely', async () => {
  const uploadUnauth = await fetch(`${BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'submission',
      filename: 'test.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('%PDF-1.4\n').toString('base64')
    })
  });
  assert.equal(uploadUnauth.status, 401);

  const encodedTraversalGet = await fetch(`${BASE_URL}/api/files/%2e%2e%2f%2e%2e%2fetc%2fpasswd`);
  assert.equal(encodedTraversalGet.status, 404);

  const unknownApiGet = await fetch(`${BASE_URL}/api/nonexistent-endpoint`);
  assert.equal(unknownApiGet.status, 404);

  const missingFileGet = await fetch(`${BASE_URL}/api/files/file_00000000000000000000`);
  assert.equal(missingFileGet.status, 404);

  const missingTokenReq = await fetch(`${BASE_URL}/api/files/file_00000000000000000000/download-token`, {
    method: 'POST'
  });
  assert.equal(missingTokenReq.status, 404);

  const delUnauth = await fetch(`${BASE_URL}/api/files/file_00000000000000000000`, {
    method: 'DELETE'
  });
  assert.equal(delUnauth.status, 401);
});

test('POST /api/inquiries validates inputs and enforces per-IP rate limiting (429)', async () => {
  const invalidRes = await fetch(`${BASE_URL}/api/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', email: 'bad-email' })
  });
  assert.equal(invalidRes.status, 400);

  let rateLimitedSeen = false;
  for (let i = 0; i < 15; i += 1) {
    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Learner ${i}`, email: `learner${i}@example.com`, type: 'contact' })
    });
    if (res.status === 429) {
      rateLimitedSeen = true;
      break;
    }
    assert.equal(res.status, 200);
  }
  assert.equal(rateLimitedSeen, true, 'Expected /api/inquiries to return 429 after burst limit');
});

test('Server codebase enforces payment idempotency, magic-byte validation, and zero Gemini API calls', () => {
  const serverCode = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
  assert.ok(serverCode.includes('processedIdempotency.get(body.idempotencyKey)'));
  assert.ok(serverCode.includes('verifyBinaryMagicBytes(ext, buf)'));
  assert.ok(serverCode.includes('isValidCouponZero'));

  // Enforce Cost Protection Rule: zero GoogleGenAI / Gemini runtime API calls in src/ or server.ts
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
    return out;
  };
  const codeFiles = [path.resolve(process.cwd(), 'server.ts'), ...walk(path.resolve(process.cwd(), 'src'))];
  for (const file of codeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(
      /GoogleGenAI|@google\/genai|generativelanguage\.googleapis\.com/i.test(content),
      false,
      `Forbidden Gemini/AI SDK usage found in ${file}`
    );
  }
});
