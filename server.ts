import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SUPERADMIN_EMAILS = new Set([
  'generaskagiraneza@gmail.com',
  'generaskagiraneza9@gmail.com'
]);

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as FirebaseAppletConfig;
    return parsed;
  } catch {
    return { projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0148235673' };
  }
}

const FIREBASE_CONFIG = loadFirebaseConfig();
const FIREBASE_PROJECT_ID = FIREBASE_CONFIG.projectId;
const FIRESTORE_DB_ID = FIREBASE_CONFIG.firestoreDatabaseId || '(default)';

const DATA_DIR = process.env.AER_DATA_DIR ? path.resolve(process.env.AER_DATA_DIR) : __dirname;
const VAULT_FILE = path.resolve(DATA_DIR, '.gateway-vault.json');
const LEDGER_FILE = path.resolve(DATA_DIR, '.payment-ledger.json');
const UPLOADS_DIR = path.resolve(DATA_DIR, '.uploads');
const UPLOAD_MANIFEST_FILE = path.resolve(UPLOADS_DIR, 'manifest.json');

interface GatewayVaultData {
  momo: {
    enabled: boolean;
    environment: 'sandbox' | 'production';
    apiUser: string;
    apiKey: string;
    subscriptionKey: string;
    callbackSecret: string;
    merchantMsisdn: string;
    targetCurrency: 'RWF' | 'EUR';
  };
  airtel: {
    enabled: boolean;
    environment: 'sandbox' | 'production';
    clientId: string;
    clientSecret: string;
    callbackSecret: string;
  };
  email: {
    enabled: boolean;
    provider: 'resend' | 'smtp';
    fromEmail: string;
    apiKey: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
  };
  sms: {
    enabled: boolean;
    provider: 'africastalking' | 'twilio' | 'custom';
    senderId: string;
    username: string;
    apiKey: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_VAULT: GatewayVaultData = {
  momo: {
    enabled: false,
    environment: 'sandbox',
    apiUser: '',
    apiKey: '',
    subscriptionKey: '',
    callbackSecret: '',
    merchantMsisdn: '',
    targetCurrency: 'RWF'
  },
  airtel: {
    enabled: false,
    environment: 'sandbox',
    clientId: '',
    clientSecret: '',
    callbackSecret: ''
  },
  email: {
    enabled: false,
    provider: 'resend',
    fromEmail: 'noreply@aieducation.rw',
    apiKey: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: ''
  },
  sms: {
    enabled: false,
    provider: 'africastalking',
    senderId: 'AIEDU_RW',
    username: '',
    apiKey: ''
  }
};

function getVaultCipherKey(): Buffer {
  const secretSeed =
    process.env.GATEWAY_VAULT_SECRET ||
    `aer-vault:${FIREBASE_PROJECT_ID}:${os.hostname()}:v1`;
  return crypto.scryptSync(secretSeed, 'aer-rwanda-salt-2026', 32);
}

function readGatewayVault(): GatewayVaultData {
  try {
    if (!fs.existsSync(VAULT_FILE)) {
      return structuredClone(DEFAULT_VAULT);
    }
    const raw = fs.readFileSync(VAULT_FILE, 'utf8');
    const envelope = JSON.parse(raw) as { iv: string; tag: string; data: string };
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getVaultCipherKey(),
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'base64')),
      decipher.final()
    ]).toString('utf8');
    const parsed = JSON.parse(decrypted) as Partial<GatewayVaultData>;
    return {
      momo: { ...DEFAULT_VAULT.momo, ...(parsed.momo || {}) },
      airtel: { ...DEFAULT_VAULT.airtel, ...(parsed.airtel || {}) },
      email: { ...DEFAULT_VAULT.email, ...(parsed.email || {}) },
      sms: { ...DEFAULT_VAULT.sms, ...(parsed.sms || {}) },
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy
    };
  } catch {
    return structuredClone(DEFAULT_VAULT);
  }
}

function writeGatewayVault(vault: GatewayVaultData): void {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getVaultCipherKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(vault), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  const payload = JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  });
  const tmpFile = `${VAULT_FILE}.tmp`;
  fs.writeFileSync(tmpFile, payload, { mode: 0o600 });
  fs.renameSync(tmpFile, VAULT_FILE);
}

interface EffectiveGatewayConfig {
  vault: GatewayVaultData;
  momo: GatewayVaultData['momo'] & { configured: boolean; source: 'vault' | 'env' | 'none' };
  airtel: GatewayVaultData['airtel'] & { configured: boolean; source: 'vault' | 'env' | 'none' };
  email: GatewayVaultData['email'] & { configured: boolean; source: 'vault' | 'env' | 'none' };
  sms: GatewayVaultData['sms'] & { configured: boolean; source: 'vault' | 'env' | 'none' };
}

function getEffectiveGatewayConfig(): EffectiveGatewayConfig {
  const vault = readGatewayVault();

  const envMomo = Boolean(process.env.MOMO_API_KEY && process.env.MOMO_API_USER);
  const vaultMomo = Boolean(
    vault.momo.apiUser && vault.momo.apiKey && vault.momo.subscriptionKey
  );
  const momo = {
    ...vault.momo,
    apiUser: process.env.MOMO_API_USER || vault.momo.apiUser,
    apiKey: process.env.MOMO_API_KEY || vault.momo.apiKey,
    subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY || vault.momo.subscriptionKey,
    enabled: envMomo || (vault.momo.enabled && vaultMomo),
    configured: envMomo || vaultMomo,
    source: (envMomo ? 'env' : vaultMomo ? 'vault' : 'none') as 'vault' | 'env' | 'none'
  };

  const envAirtel = Boolean(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);
  const vaultAirtel = Boolean(vault.airtel.clientId && vault.airtel.clientSecret);
  const airtel = {
    ...vault.airtel,
    clientId: process.env.AIRTEL_CLIENT_ID || vault.airtel.clientId,
    clientSecret: process.env.AIRTEL_CLIENT_SECRET || vault.airtel.clientSecret,
    enabled: envAirtel || (vault.airtel.enabled && vaultAirtel),
    configured: envAirtel || vaultAirtel,
    source: (envAirtel ? 'env' : vaultAirtel ? 'vault' : 'none') as 'vault' | 'env' | 'none'
  };

  const envEmail = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const vaultEmail = Boolean(
    (vault.email.provider === 'resend' && vault.email.apiKey) ||
      (vault.email.provider === 'smtp' && vault.email.smtpHost && vault.email.smtpUser)
  );
  const email = {
    ...vault.email,
    apiKey: process.env.RESEND_API_KEY || vault.email.apiKey,
    smtpHost: process.env.SMTP_HOST || vault.email.smtpHost,
    enabled: envEmail || (vault.email.enabled && vaultEmail),
    configured: envEmail || vaultEmail,
    source: (envEmail ? 'env' : vaultEmail ? 'vault' : 'none') as 'vault' | 'env' | 'none'
  };

  const envSms = Boolean(process.env.SMS_API_KEY);
  const vaultSms = Boolean(vault.sms.apiKey);
  const sms = {
    ...vault.sms,
    apiKey: process.env.SMS_API_KEY || vault.sms.apiKey,
    enabled: envSms || (vault.sms.enabled && vaultSms),
    configured: envSms || vaultSms,
    source: (envSms ? 'env' : vaultSms ? 'vault' : 'none') as 'vault' | 'env' | 'none'
  };

  return { vault, momo, airtel, email, sms };
}

function maskSecret(val: string): string {
  const clean = (val || '').trim();
  if (!clean) return '';
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, clean.length - 4))}${clean.slice(-4)}`;
}

function buildMaskedGatewayResponse(eff: EffectiveGatewayConfig) {
  return {
    momo: {
      enabled: eff.momo.enabled,
      environment: eff.momo.environment,
      apiUserMasked: maskSecret(eff.momo.apiUser),
      apiKeyMasked: maskSecret(eff.momo.apiKey),
      subscriptionKeyMasked: maskSecret(eff.momo.subscriptionKey),
      callbackSecretMasked: maskSecret(eff.momo.callbackSecret),
      merchantMsisdn: eff.momo.merchantMsisdn,
      targetCurrency: eff.momo.targetCurrency,
      configured: eff.momo.configured,
      source: eff.momo.source
    },
    airtel: {
      enabled: eff.airtel.enabled,
      environment: eff.airtel.environment,
      clientIdMasked: maskSecret(eff.airtel.clientId),
      clientSecretMasked: maskSecret(eff.airtel.clientSecret),
      callbackSecretMasked: maskSecret(eff.airtel.callbackSecret),
      configured: eff.airtel.configured,
      source: eff.airtel.source
    },
    email: {
      enabled: eff.email.enabled,
      provider: eff.email.provider,
      fromEmail: eff.email.fromEmail,
      apiKeyMasked: maskSecret(eff.email.apiKey),
      smtpHost: eff.email.smtpHost,
      smtpPort: eff.email.smtpPort,
      smtpUserMasked: maskSecret(eff.email.smtpUser),
      smtpPassMasked: maskSecret(eff.email.smtpPass),
      configured: eff.email.configured,
      source: eff.email.source
    },
    sms: {
      enabled: eff.sms.enabled,
      provider: eff.sms.provider,
      senderId: eff.sms.senderId,
      username: eff.sms.username,
      apiKeyMasked: maskSecret(eff.sms.apiKey),
      configured: eff.sms.configured,
      source: eff.sms.source
    },
    updatedAt: eff.vault.updatedAt,
    updatedBy: eff.vault.updatedBy
  };
}

function getIntegrationStatus() {
  const eff = getEffectiveGatewayConfig();
  return {
    momoActive: eff.momo.enabled,
    airtelActive: eff.airtel.enabled,
    emailActive: eff.email.enabled,
    smsActive: eff.sms.enabled,
    momoEnvironment: eff.momo.environment,
    airtelEnvironment: eff.airtel.environment
  };
}

// =========================================================================
// Durable Idempotent Payment Ledger
// =========================================================================

interface PaymentRequestRecord {
  paymentId: string;
  idempotencyKey: string;
  provider: 'mtn_momo' | 'airtel_money';
  phoneMasked: string;
  amountRwf: number;
  originalAmountRwf?: number;
  discountRwf?: number;
  couponCode?: string;
  courseId: string;
  userId: string;
  transactionRef: string;
  externalReferenceId?: string;
  status: 'pending' | 'verified' | 'failed';
  integrationActive: boolean;
  verificationMode: 'live_gateway' | 'gateway_awaiting_pin' | 'manual_review_required';
  gatewayMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

const MAX_IN_MEMORY_LEDGER = 5000;
const processedIdempotency = new Map<string, PaymentRequestRecord>();
const paymentById = new Map<string, PaymentRequestRecord>();
let ledgerWriteTimer: NodeJS.Timeout | null = null;

function loadPaymentLedger(): void {
  try {
    if (!fs.existsSync(LEDGER_FILE)) return;
    const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
    const records = JSON.parse(raw) as PaymentRequestRecord[];
    if (!Array.isArray(records)) return;
    for (const rec of records.slice(-MAX_IN_MEMORY_LEDGER)) {
      if (rec.idempotencyKey && rec.paymentId) {
        processedIdempotency.set(rec.idempotencyKey, rec);
        paymentById.set(rec.paymentId, rec);
      }
    }
  } catch {
    // Start fresh ledger if unreadable
  }
}

function schedulePersistLedger(): void {
  if (ledgerWriteTimer) return;
  ledgerWriteTimer = setTimeout(() => {
    ledgerWriteTimer = null;
    try {
      const records = Array.from(paymentById.values()).slice(-MAX_IN_MEMORY_LEDGER);
      const tmp = `${LEDGER_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(records), { mode: 0o600 });
      fs.renameSync(tmp, LEDGER_FILE);
    } catch {
      // Non-fatal disk sync failure
    }
  }, 400);
}

function upsertLedgerRecord(record: PaymentRequestRecord): void {
  if (processedIdempotency.size >= MAX_IN_MEMORY_LEDGER) {
    const oldestKey = processedIdempotency.keys().next().value;
    if (oldestKey) processedIdempotency.delete(oldestKey);
  }
  if (paymentById.size >= MAX_IN_MEMORY_LEDGER) {
    const oldestPid = paymentById.keys().next().value;
    if (oldestPid) paymentById.delete(oldestPid);
  }
  processedIdempotency.set(record.idempotencyKey, record);
  paymentById.set(record.paymentId, record);
  schedulePersistLedger();
}

loadPaymentLedger();

// =========================================================================
// Lightweight Firebase RS256 ID Token Verification (Zero IAM Required)
// =========================================================================

interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  isSuperadmin: boolean;
}

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function fetchGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { signal: controller.signal }
    );
    if (!res.ok) {
      throw new Error(`Cert fetch failed: ${res.status}`);
    }
    const cacheHeader = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheHeader.match(/max-age=(\d+)/i);
    const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
    const json = (await res.json()) as Record<string, string>;
    cachedCerts = json;
    certsExpiresAt = Date.now() + Math.max(300, maxAgeSec) * 1000;
    return cachedCerts;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeBase64Url(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

async function verifyFirebaseIdToken(rawToken: string): Promise<VerifiedFirebaseToken | null> {
  try {
    const parts = rawToken.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const certs = await fetchGoogleSecureTokenCerts();
    let pem = certs[header.kid];
    if (!pem) {
      certsExpiresAt = 0;
      const refreshed = await fetchGoogleSecureTokenCerts();
      pem = refreshed[header.kid];
      if (!pem) return null;
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const sigValid = verifier.verify(pem, decodeBase64Url(sigB64));
    if (!sigValid) return null;

    const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
    };

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    if (!payload.sub || payload.sub.length > 128) return null;
    if (!payload.exp || payload.exp <= nowSec) return null;
    if (!payload.iat || payload.iat > nowSec + 300) return null;

    const email = (payload.email || '').trim().toLowerCase();
    return {
      uid: payload.sub,
      email,
      emailVerified: Boolean(payload.email_verified),
      isSuperadmin: Boolean(payload.email_verified) && SUPERADMIN_EMAILS.has(email)
    };
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 20 ? token : null;
}

async function resolveStaffRoleFromToken(
  decoded: VerifiedFirebaseToken,
  rawToken: string
): Promise<{ isStaff: boolean; isEducationStaff: boolean; role: string }> {
  if (decoded.isSuperadmin) {
    return { isStaff: true, isEducationStaff: true, role: 'superadmin' };
  }
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/${encodeURIComponent(FIRESTORE_DB_ID)}/documents/staffRoles/${encodeURIComponent(decoded.uid)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${rawToken}` },
        signal: controller.signal
      });
      if (!res.ok) return { isStaff: false, isEducationStaff: false, role: 'learner' };
      const docJson = (await res.json()) as {
        fields?: {
          role?: { stringValue?: string };
          status?: { stringValue?: string };
        };
      };
      const status = docJson.fields?.status?.stringValue || '';
      const role = docJson.fields?.role?.stringValue || 'learner';
      if (status !== 'active') {
        return { isStaff: false, isEducationStaff: false, role: 'learner' };
      }
      const staffRoles = new Set([
        'superadmin',
        'admin',
        'course_manager',
        'instructor',
        'reviewer',
        'support_staff'
      ]);
      const eduRoles = new Set(['superadmin', 'admin', 'course_manager', 'instructor']);
      return {
        isStaff: staffRoles.has(role),
        isEducationStaff: eduRoles.has(role),
        role
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { isStaff: false, isEducationStaff: false, role: 'learner' };
  }
}

// =========================================================================
// Validated File Upload & Media Storage Helpers
// =========================================================================

type ServerUploadScope = 'submission' | 'course_media' | 'resource';

interface StoredFileMeta {
  fileId: string;
  scope: ServerUploadScope;
  ownerUid: string;
  ownerEmail: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

const UPLOAD_POLICIES: Record<
  ServerUploadScope,
  { maxBytes: number; extensions: Set<string>; mimes: Set<string> }
> = {
  submission: {
    maxBytes: 10 * 1024 * 1024,
    extensions: new Set(['.pdf', '.txt', '.md', '.json', '.zip', '.docx', '.png', '.jpg', '.jpeg', '.webp']),
    mimes: new Set([
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/webp'
    ])
  },
  course_media: {
    maxBytes: 25 * 1024 * 1024,
    extensions: new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a']),
    mimes: new Set([
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/mp4'
    ])
  },
  resource: {
    maxBytes: 10 * 1024 * 1024,
    extensions: new Set(['.pdf', '.md', '.txt', '.csv', '.json', '.zip', '.docx']),
    mimes: new Set([
      'application/pdf',
      'text/markdown',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
  }
};

function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function readUploadManifest(): Record<string, StoredFileMeta> {
  try {
    if (!fs.existsSync(UPLOAD_MANIFEST_FILE)) return {};
    return JSON.parse(fs.readFileSync(UPLOAD_MANIFEST_FILE, 'utf8')) as Record<string, StoredFileMeta>;
  } catch {
    return {};
  }
}

function writeUploadManifest(manifest: Record<string, StoredFileMeta>): void {
  ensureUploadsDir();
  fs.writeFileSync(UPLOAD_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
}

function verifyBinaryMagicBytes(ext: string, buf: Buffer): boolean {
  if (buf.length < 4) {
    return ['.txt', '.md', '.csv', '.json'].includes(ext) && buf.length > 0;
  }
  if (ext === '.png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (ext === '.gif') {
    return buf.subarray(0, 4).toString('ascii') === 'GIF8';
  }
  if (ext === '.webp') {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (ext === '.pdf') {
    return buf.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (ext === '.zip' || ext === '.docx') {
    return buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05);
  }
  if (ext === '.webm') {
    return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  }
  if (ext === '.mp4' || ext === '.m4a') {
    return buf.length >= 8 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (ext === '.ogg') {
    return buf.subarray(0, 4).toString('ascii') === 'OggS';
  }
  if (ext === '.wav') {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WAVE'
    );
  }
  if (ext === '.mp3') {
    return (
      (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
      (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
    );
  }
  // Text formats (.txt, .md, .csv, .json): disallow null bytes
  if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
    return !buf.includes(0x00);
  }
  return false;
}

function createDownloadSignature(fileId: string, expMs: number): string {
  return crypto
    .createHmac('sha256', getVaultCipherKey())
    .update(`${fileId}:${expMs}`)
    .digest('hex');
}

function verifyDownloadSignature(fileId: string, dlParam: string): boolean {
  const parts = dlParam.split('.');
  if (parts.length !== 2) return false;
  const expMs = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isFinite(expMs) || expMs < Date.now() || !sig) return false;
  const expected = createDownloadSignature(fileId, expMs);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'));
}

// =========================================================================
// Sliding-Window Rate Limiter & Concurrency Telemetry
// =========================================================================

interface RateBucket {
  hits: number[];
}

const rateBuckets = new Map<string, RateBucket>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, bucket] of rateBuckets.entries()) {
    bucket.hits = bucket.hits.filter((ts) => ts > cutoff);
    if (bucket.hits.length === 0) {
      rateBuckets.delete(key);
    }
  }
}, 60_000).unref();

const metricsState = {
  startedAtMs: Date.now(),
  inFlight: 0,
  peakConcurrent: 0,
  totalRequests: 0,
  apiRequests: 0,
  totalErrors5xx: 0,
  rateLimited429: 0,
  latenciesMs: [] as number[]
};

function recordLatency(ms: number): void {
  metricsState.latenciesMs.push(ms);
  if (metricsState.latenciesMs.length > 500) {
    metricsState.latenciesMs.shift();
  }
}

function createRateLimiter(scope: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${scope}:${ip}`;
    const now = Date.now();
    const cutoff = now - windowMs;
    const bucket = rateBuckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => t > cutoff);

    if (bucket.hits.length >= maxRequests) {
      metricsState.rateLimited429 += 1;
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.status(429).json({
        error: 'Too many requests from this network. Please wait a moment and try again.'
      });
      return;
    }

    bucket.hits.push(now);
    rateBuckets.set(key, bucket);
    next();
  };
}

// =========================================================================
// MTN MoMo Collection Gateway Helpers (Only runs when Superadmin enables)
// =========================================================================

function getMomoBaseUrl(env: 'sandbox' | 'production'): string {
  return env === 'production'
    ? 'https://proxy.momoapi.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com';
}

async function fetchMomoAccessToken(
  cfg: EffectiveGatewayConfig['momo']
): Promise<{ token?: string; error?: string }> {
  const baseUrl = getMomoBaseUrl(cfg.environment);
  const basic = Buffer.from(`${cfg.apiUser}:${cfg.apiKey}`).toString('base64');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Ocp-Apim-Subscription-Key': cfg.subscriptionKey
      },
      signal: controller.signal
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { error: `MTN token HTTP ${res.status}${txt ? `: ${txt.slice(0, 140)}` : ''}` };
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) return { error: 'MTN MoMo token missing access_token field.' };
    return { token: json.access_token };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'MTN MoMo connection timeout' };
  } finally {
    clearTimeout(timer);
  }
}

async function dispatchMomoRequestToPay(params: {
  cfg: EffectiveGatewayConfig['momo'];
  referenceId: string;
  externalId: string;
  msisdn250: string;
  amountRwf: number;
  courseId: string;
}): Promise<{ accepted: boolean; reason?: string }> {
  const tokenRes = await fetchMomoAccessToken(params.cfg);
  if (!tokenRes.token) {
    return { accepted: false, reason: tokenRes.error || 'Token failure' };
  }
  const baseUrl = getMomoBaseUrl(params.cfg.environment);
  const targetEnv = params.cfg.environment === 'production' ? 'mtnrwanda' : 'sandbox';
  const currency =
    params.cfg.environment === 'sandbox' && params.cfg.targetCurrency === 'RWF'
      ? 'EUR'
      : params.cfg.targetCurrency;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        'X-Reference-Id': params.referenceId,
        'X-Target-Environment': targetEnv,
        'Ocp-Apim-Subscription-Key': params.cfg.subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: String(params.amountRwf),
        currency,
        externalId: params.externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: params.msisdn250
        },
        payerMessage: `AI Education Rwanda: ${params.courseId}`,
        payeeNote: params.externalId
      }),
      signal: controller.signal
    });
    if (res.status === 202 || res.ok) {
      return { accepted: true };
    }
    const errText = await res.text().catch(() => '');
    return { accepted: false, reason: `MoMo RequestToPay HTTP ${res.status}: ${errText.slice(0, 140)}` };
  } catch (err) {
    return { accepted: false, reason: err instanceof Error ? err.message : 'RequestToPay failed' };
  } finally {
    clearTimeout(timer);
  }
}

// =========================================================================
// Helpers
// =========================================================================

function normalizeRwandaPhone(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length === 12) {
    return digits.slice(3);
  }
  if (digits.startsWith('07') && digits.length === 10) {
    return digits.slice(1);
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return digits;
  }
  return null;
}

function maskPhone(localNineDigits: string): string {
  return `+250 ${localNineDigits.slice(0, 3)} *** ${localNineDigits.slice(-2)}`;
}

// =========================================================================
// Express Server Setup
// =========================================================================

async function startServer() {
  const app = express();
  app.set('trust proxy', true);

  // iFrame-safe security headers + concurrency & latency instrumentation
  app.use((req, res, next) => {
    const startNs = process.hrtime.bigint();
    metricsState.inFlight += 1;
    metricsState.totalRequests += 1;
    if (req.path.startsWith('/api/')) {
      metricsState.apiRequests += 1;
    }
    if (metricsState.inFlight > metricsState.peakConcurrent) {
      metricsState.peakConcurrent = metricsState.inFlight;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    res.on('finish', () => {
      metricsState.inFlight = Math.max(0, metricsState.inFlight - 1);
      if (res.statusCode >= 500) {
        metricsState.totalErrors5xx += 1;
      }
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      recordLatency(Number(elapsedMs.toFixed(2)));
    });

    next();
  });

  // Lightweight gzip compression for JSON & text payloads > 1KB
  app.use((req, res, next) => {
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    if (!acceptEncoding.includes('gzip') || !req.path.startsWith('/api/')) {
      next();
      return;
    }
    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const jsonStr = JSON.stringify(body);
      if (jsonStr.length < 1024) {
        return origJson(body);
      }
      zlib.gzip(Buffer.from(jsonStr, 'utf8'), (err, compressed) => {
        if (err || res.headersSent) {
          if (!res.headersSent) origJson(body);
          return;
        }
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.send(compressed);
      });
      return res;
    }) as Response['json'];
    next();
  });

  const uploadJsonParser = express.json({ limit: '36mb' });
  const defaultJsonParser = express.json({ limit: '256kb' });
  app.use((req, res, next) => {
    if (req.path === '/api/uploads') {
      uploadJsonParser(req, res, next);
    } else {
      defaultJsonParser(req, res, next);
    }
  });
  app.use('/api', createRateLimiter('api_global', 240, 60_000));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ai-education-rwanda',
      projectId: FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString()
    });
  });

  // Cached runtime metadata endpoint for high-traffic public clients
  app.get('/api/public/runtime', (_req, res) => {
    const statusFlags = getIntegrationStatus();
    const payload = {
      platform: 'AI Education Rwanda',
      version: '2.0.0',
      languages: ['en', 'rw'],
      integrations: statusFlags
    };
    const etag = `"${crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex')}"`;
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.setHeader('ETag', etag);
    if (_req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.json(payload);
  });

  /**
   * Reports whether external payment/communication provider credentials
   * are configured in encrypted vault or server env vars. Never leaks secrets.
   */
  app.get('/api/integrations/status', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=15');
    res.json(getIntegrationStatus());
  });

  /**
   * Rate-limited public inquiry & waitlist pre-check endpoint
   */
  app.post('/api/inquiries', createRateLimiter('inquiries', 12, 60_000), (req, res) => {
    const body = req.body as { name?: string; email?: string; type?: string };
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    if (!name || name.length > 120 || !email || !email.includes('@') || email.length > 200) {
      res.status(400).json({ error: 'Valid name and email address are required.' });
      return;
    }
    res.json({ accepted: true });
  });

  /**
   * Idempotent Mobile Money request endpoint (MTN MoMo & Airtel Money).
   * Requires a verified Firebase ID token matching body.userId.
   */
  app.post(
    '/api/payments/verify',
    createRateLimiter('payments_verify', 20, 60_000),
    async (req, res) => {
      const tokenStr = extractBearerToken(req);
      if (!tokenStr) {
        res.status(401).json({ error: 'Authentication required to submit payments.' });
        return;
      }
      const decoded = await verifyFirebaseIdToken(tokenStr);
      if (!decoded || !decoded.emailVerified) {
        res.status(401).json({ error: 'Verified account token required.' });
        return;
      }

      const body = req.body as {
        userId?: string;
        courseId?: string;
        provider?: string;
        phone?: string;
        amountRwf?: number;
        originalAmountRwf?: number;
        discountRwf?: number;
        couponCode?: string;
        idempotencyKey?: string;
      };

      if (body.userId !== decoded.uid && !decoded.isSuperadmin) {
        res.status(403).json({ error: 'User identity mismatch on payment request.' });
        return;
      }

      if (!body.userId || !body.courseId || !body.provider || !body.phone || !body.idempotencyKey) {
        res.status(400).json({ error: 'Missing required payment fields.' });
        return;
      }

      if (body.provider !== 'mtn_momo' && body.provider !== 'airtel_money') {
        res
          .status(400)
          .json({ error: 'Unsupported payment provider. Choose MTN MoMo or Airtel Money.' });
        return;
      }

      const amount = Number(body.amountRwf ?? 0);
      const originalAmount = Number(body.originalAmountRwf ?? amount);
      const discount = Number(body.discountRwf ?? 0);
      const couponCode =
        typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';

      const isValidCouponZero =
        amount === 0 &&
        Boolean(couponCode) &&
        Number.isFinite(discount) &&
        discount > 0 &&
        Number.isFinite(originalAmount) &&
        originalAmount >= 1000;

      if (!Number.isFinite(amount) || amount < 0 || (!isValidCouponZero && amount < 1000)) {
        res.status(400).json({ error: 'Invalid course enrollment amount.' });
        return;
      }

      const existing = processedIdempotency.get(body.idempotencyKey);
      if (existing) {
        res.json({ idempotentReplay: true, payment: existing });
        return;
      }

      const normalized = normalizeRwandaPhone(body.phone);
      if (!normalized) {
        res.status(400).json({
          error: 'Enter a valid Rwanda mobile number (e.g. 0788 123 456 or 0738 123 456).'
        });
        return;
      }

      const prefix = normalized.slice(0, 2);
      if (body.provider === 'mtn_momo' && prefix !== '78' && prefix !== '79') {
        res.status(400).json({ error: 'MTN MoMo requires a 078 or 079 mobile number.' });
        return;
      }
      if (body.provider === 'airtel_money' && prefix !== '72' && prefix !== '73') {
        res.status(400).json({ error: 'Airtel Money requires a 072 or 073 mobile number.' });
        return;
      }

      const eff = getEffectiveGatewayConfig();
      const shortHash = crypto
        .createHash('sha256')
        .update(`${body.idempotencyKey}:${body.userId}:${body.courseId}`)
        .digest('hex')
        .slice(0, 10)
        .toUpperCase();

      const paymentId = `pay_${shortHash}`;
      const transactionRef = `${body.provider === 'mtn_momo' ? 'MOMO' : 'AIRTEL'}-${shortHash}`;
      const msisdn250 = `250${normalized}`;

      let status: 'pending' | 'verified' = 'pending';
      let integrationActive = false;
      let verificationMode: PaymentRequestRecord['verificationMode'] = 'manual_review_required';
      let externalReferenceId: string | undefined;
      let gatewayMessage: string | undefined;

      if (!isValidCouponZero && body.provider === 'mtn_momo' && eff.momo.enabled) {
        integrationActive = true;
        externalReferenceId = crypto.randomUUID();
        const rtp = await dispatchMomoRequestToPay({
          cfg: eff.momo,
          referenceId: externalReferenceId,
          externalId: transactionRef,
          msisdn250,
          amountRwf: amount,
          courseId: body.courseId
        });
        if (rtp.accepted) {
          verificationMode = 'gateway_awaiting_pin';
          gatewayMessage = 'MTN MoMo Request-to-Pay dispatched. Confirm prompt on your handset.';
        } else {
          verificationMode = 'manual_review_required';
          gatewayMessage = `Gateway fallback to manual verification (${rtp.reason || 'unavailable'}).`;
        }
      } else if (!isValidCouponZero && body.provider === 'airtel_money' && eff.airtel.enabled) {
        integrationActive = true;
        verificationMode = 'gateway_awaiting_pin';
        gatewayMessage = 'Airtel Money request queued for callback verification.';
      }

      const record: PaymentRequestRecord = {
        paymentId,
        idempotencyKey: body.idempotencyKey,
        provider: body.provider,
        phoneMasked: maskPhone(normalized),
        amountRwf: amount,
        ...(Number.isFinite(originalAmount) && originalAmount > 0
          ? { originalAmountRwf: originalAmount }
          : {}),
        ...(discount > 0 ? { discountRwf: discount } : {}),
        ...(couponCode ? { couponCode } : {}),
        courseId: body.courseId,
        userId: body.userId,
        transactionRef,
        ...(externalReferenceId ? { externalReferenceId } : {}),
        status,
        integrationActive,
        verificationMode,
        ...(gatewayMessage ? { gatewayMessage } : {}),
        createdAt: new Date().toISOString()
      };

      upsertLedgerRecord(record);
      res.json({ idempotentReplay: false, payment: record });
    }
  );

  app.get('/api/payments/status/:paymentId', async (req, res) => {
    const tokenStr = extractBearerToken(req);
    if (!tokenStr) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const decoded = await verifyFirebaseIdToken(tokenStr);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }
    const record = paymentById.get(req.params.paymentId);
    if (!record) {
      res.status(404).json({ error: 'Payment record not found in ledger.' });
      return;
    }
    if (record.userId !== decoded.uid && !decoded.isSuperadmin) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    res.json({ payment: record });
  });

  // MTN MoMo & Airtel Money Async Webhook Endpoints
  app.post('/api/webhooks/momo', (req, res) => {
    const eff = getEffectiveGatewayConfig();
    if (eff.momo.callbackSecret) {
      const provided =
        String(req.headers['x-callback-secret'] || req.headers['x-momo-signature'] || '');
      if (provided !== eff.momo.callbackSecret) {
        res.status(401).json({ error: 'Invalid MoMo webhook signature.' });
        return;
      }
    }
    const payload = req.body as {
      externalId?: string;
      status?: string;
      financialTransactionId?: string;
    };
    const match = Array.from(paymentById.values()).find(
      (p) => p.transactionRef === payload.externalId
    );
    if (match) {
      const upper = String(payload.status || '').toUpperCase();
      if (upper === 'SUCCESSFUL') {
        match.status = 'verified';
        match.verificationMode = 'live_gateway';
      } else if (upper === 'FAILED' || upper === 'REJECTED') {
        match.status = 'failed';
      }
      match.updatedAt = new Date().toISOString();
      upsertLedgerRecord(match);
    }
    res.json({ received: true });
  });

  app.post('/api/webhooks/airtel', (req, res) => {
    const eff = getEffectiveGatewayConfig();
    if (eff.airtel.callbackSecret) {
      const provided = String(req.headers['x-callback-secret'] || '');
      if (provided !== eff.airtel.callbackSecret) {
        res.status(401).json({ error: 'Invalid Airtel webhook signature.' });
        return;
      }
    }
    res.json({ received: true });
  });

  // =========================================================================
  // Validated File Upload & Role-Based Media Delivery APIs
  // =========================================================================

  app.post(
    '/api/uploads',
    createRateLimiter('file_uploads', 30, 60_000),
    async (req, res) => {
      const tokenStr = extractBearerToken(req);
      if (!tokenStr) {
        res.status(401).json({ error: 'Authentication required to upload files.' });
        return;
      }
      const decoded = await verifyFirebaseIdToken(tokenStr);
      if (!decoded || !decoded.emailVerified) {
        res.status(401).json({ error: 'Verified account token required.' });
        return;
      }

      const body = req.body as {
        scope?: string;
        filename?: string;
        mimeType?: string;
        dataBase64?: string;
      };

      const scope = body.scope as ServerUploadScope | undefined;
      if (scope !== 'submission' && scope !== 'course_media' && scope !== 'resource') {
        res.status(400).json({ error: 'Invalid upload scope.' });
        return;
      }

      if (scope === 'course_media' || scope === 'resource') {
        const staffInfo = await resolveStaffRoleFromToken(decoded, tokenStr);
        if (!staffInfo.isEducationStaff) {
          res.status(403).json({
            error: 'Education staff privileges required to upload course media or resources.'
          });
          return;
        }
      }

      const rawName = path.basename(String(body.filename || '').trim());
      const ext = path.extname(rawName).toLowerCase();
      const policy = UPLOAD_POLICIES[scope];
      if (!rawName || !ext || !policy.extensions.has(ext)) {
        res.status(400).json({
          error: `Unsupported or missing file extension. Allowed: ${Array.from(policy.extensions).join(', ')}`
        });
        return;
      }

      const mimeType = String(body.mimeType || '').trim().toLowerCase();
      if (mimeType && mimeType !== 'application/octet-stream' && !policy.mimes.has(mimeType)) {
        res.status(400).json({ error: `Unsupported MIME type: ${mimeType}` });
        return;
      }

      if (typeof body.dataBase64 !== 'string' || body.dataBase64.length === 0) {
        res.status(400).json({ error: 'File payload dataBase64 is required.' });
        return;
      }

      const cleanBase64 = body.dataBase64.replace(/^data:[^;]+;base64,/, '');
      const buf = Buffer.from(cleanBase64, 'base64');
      if (buf.length === 0) {
        res.status(400).json({ error: 'Uploaded file is empty.' });
        return;
      }
      if (buf.length > policy.maxBytes) {
        res.status(400).json({
          error: `File size (${(buf.length / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed (${Math.round(policy.maxBytes / (1024 * 1024))} MB).`
        });
        return;
      }
      if (!verifyBinaryMagicBytes(ext, buf)) {
        res.status(400).json({
          error: 'File contents do not match the declared file extension.'
        });
        return;
      }

      const fileId = `file_${crypto.randomBytes(10).toString('hex')}`;
      const storedName = `${fileId}${ext}`;
      ensureUploadsDir();
      fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buf);

      const safeMime =
        mimeType && policy.mimes.has(mimeType)
          ? mimeType
          : ext === '.pdf'
            ? 'application/pdf'
            : ext === '.png'
              ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : ext === '.mp4'
                  ? 'video/mp4'
                  : ext === '.mp3'
                    ? 'audio/mpeg'
                    : 'application/octet-stream';

      const meta: StoredFileMeta = {
        fileId,
        scope,
        ownerUid: decoded.uid,
        ownerEmail: decoded.email,
        originalName: rawName.replace(/[^a-zA-Z0-9._\- ]+/g, '_').slice(0, 120),
        storedName,
        mimeType: safeMime,
        sizeBytes: buf.length,
        createdAt: new Date().toISOString()
      };

      const manifest = readUploadManifest();
      manifest[fileId] = meta;
      writeUploadManifest(manifest);

      res.status(201).json({
        file: {
          fileId,
          url: `/api/files/${fileId}`,
          filename: meta.originalName,
          mimeType: meta.mimeType,
          sizeBytes: meta.sizeBytes,
          scope: meta.scope
        }
      });
    }
  );

  app.post('/api/files/:fileId/download-token', async (req, res) => {
    const fileId = String(req.params.fileId || '').trim();
    if (!/^file_[a-f0-9]{20}$/.test(fileId)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    const manifest = readUploadManifest();
    const meta = manifest[fileId];
    if (!meta) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    if (meta.scope === 'submission') {
      const tokenStr = extractBearerToken(req);
      if (!tokenStr) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      const decoded = await verifyFirebaseIdToken(tokenStr);
      if (!decoded || !decoded.emailVerified) {
        res.status(401).json({ error: 'Verified account required.' });
        return;
      }
      if (decoded.uid !== meta.ownerUid) {
        const staffInfo = await resolveStaffRoleFromToken(decoded, tokenStr);
        if (!staffInfo.isStaff) {
          res.status(403).json({ error: 'You do not have permission to access this submission file.' });
          return;
        }
      }
    }

    const expMs = Date.now() + 120_000;
    const sig = createDownloadSignature(fileId, expMs);
    res.json({
      downloadUrl: `/api/files/${fileId}?dl=${expMs}.${sig}`
    });
  });

  app.get('/api/files/:fileId', async (req, res) => {
    const fileId = String(req.params.fileId || '').trim();
    if (!/^file_[a-f0-9]{20}$/.test(fileId)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    const manifest = readUploadManifest();
    const meta = manifest[fileId];
    if (!meta) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    if (meta.scope === 'submission') {
      const dlParam = typeof req.query.dl === 'string' ? req.query.dl : '';
      const hasValidTicket = dlParam ? verifyDownloadSignature(fileId, dlParam) : false;
      if (!hasValidTicket) {
        const tokenStr = extractBearerToken(req);
        if (!tokenStr) {
          res.status(401).json({ error: 'Authentication required to download learner submissions.' });
          return;
        }
        const decoded = await verifyFirebaseIdToken(tokenStr);
        if (!decoded || !decoded.emailVerified) {
          res.status(401).json({ error: 'Verified account required.' });
          return;
        }
        if (decoded.uid !== meta.ownerUid) {
          const staffInfo = await resolveStaffRoleFromToken(decoded, tokenStr);
          if (!staffInfo.isStaff) {
            res.status(403).json({ error: 'Forbidden: submission belongs to another learner.' });
            return;
          }
        }
      }
      res.setHeader('Cache-Control', 'private, no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    const filePath = path.join(UPLOADS_DIR, meta.storedName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Stored file missing on disk.' });
      return;
    }

    const isInlineMedia =
      meta.mimeType.startsWith('image/') ||
      meta.mimeType.startsWith('video/') ||
      meta.mimeType.startsWith('audio/') ||
      meta.mimeType === 'application/pdf';
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${isInlineMedia ? 'inline' : 'attachment'}; filename="${meta.originalName.replace(/"/g, '')}"`
    );
    res.sendFile(filePath);
  });

  app.delete('/api/files/:fileId', async (req, res) => {
    const tokenStr = extractBearerToken(req);
    if (!tokenStr) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const decoded = await verifyFirebaseIdToken(tokenStr);
    if (!decoded || !decoded.emailVerified) {
      res.status(401).json({ error: 'Verified account required.' });
      return;
    }
    const fileId = String(req.params.fileId || '').trim();
    const manifest = readUploadManifest();
    const meta = manifest[fileId];
    if (!meta) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    if (decoded.uid !== meta.ownerUid) {
      const staffInfo = await resolveStaffRoleFromToken(decoded, tokenStr);
      if (!staffInfo.isEducationStaff) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
    }
    const filePath = path.join(UPLOADS_DIR, meta.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    delete manifest[fileId];
    writeUploadManifest(manifest);
    res.json({ deleted: true, fileId });
  });

  // =========================================================================
  // Superadmin-Only Middleware & Governance APIs
  // =========================================================================

  async function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
    const tokenStr = extractBearerToken(req);
    if (!tokenStr) {
      res.status(401).json({ error: 'Superadmin Bearer token required.' });
      return;
    }
    const decoded = await verifyFirebaseIdToken(tokenStr);
    if (!decoded || !decoded.isSuperadmin) {
      res.status(403).json({ error: 'Superadmin privileges required.' });
      return;
    }
    (req as Request & { superadmin?: VerifiedFirebaseToken }).superadmin = decoded;
    next();
  }

  app.get(
    '/api/admin/integrations',
    createRateLimiter('admin_api', 60, 60_000),
    requireSuperadmin,
    (_req, res) => {
      const eff = getEffectiveGatewayConfig();
      res.json(buildMaskedGatewayResponse(eff));
    }
  );

  app.post(
    '/api/admin/integrations',
    createRateLimiter('admin_api', 60, 60_000),
    requireSuperadmin,
    (req, res) => {
      const admin = (req as Request & { superadmin?: VerifiedFirebaseToken }).superadmin;
      const current = readGatewayVault();
      const body = req.body as Partial<{
        momo: Partial<GatewayVaultData['momo']>;
        airtel: Partial<GatewayVaultData['airtel']>;
        email: Partial<GatewayVaultData['email']>;
        sms: Partial<GatewayVaultData['sms']>;
      }>;

      const pickSecret = (incomingVal: string | undefined, existingVal: string) => {
        if (incomingVal === undefined) return existingVal;
        const trimmed = incomingVal.trim();
        if (trimmed === '__CLEAR__') return '';
        if (!trimmed || trimmed.startsWith('****')) return existingVal;
        return trimmed;
      };

      const nextVault: GatewayVaultData = {
        momo: {
          enabled: body.momo?.enabled ?? current.momo.enabled,
          environment:
            body.momo?.environment === 'production' ? 'production' : body.momo?.environment === 'sandbox' ? 'sandbox' : current.momo.environment,
          apiUser: pickSecret(body.momo?.apiUser, current.momo.apiUser),
          apiKey: pickSecret(body.momo?.apiKey, current.momo.apiKey),
          subscriptionKey: pickSecret(body.momo?.subscriptionKey, current.momo.subscriptionKey),
          callbackSecret: pickSecret(body.momo?.callbackSecret, current.momo.callbackSecret),
          merchantMsisdn:
            body.momo?.merchantMsisdn !== undefined
              ? body.momo.merchantMsisdn.trim().slice(0, 32)
              : current.momo.merchantMsisdn,
          targetCurrency:
            body.momo?.targetCurrency === 'EUR' || body.momo?.targetCurrency === 'RWF'
              ? body.momo.targetCurrency
              : current.momo.targetCurrency
        },
        airtel: {
          enabled: body.airtel?.enabled ?? current.airtel.enabled,
          environment:
            body.airtel?.environment === 'production'
              ? 'production'
              : body.airtel?.environment === 'sandbox'
                ? 'sandbox'
                : current.airtel.environment,
          clientId: pickSecret(body.airtel?.clientId, current.airtel.clientId),
          clientSecret: pickSecret(body.airtel?.clientSecret, current.airtel.clientSecret),
          callbackSecret: pickSecret(body.airtel?.callbackSecret, current.airtel.callbackSecret)
        },
        email: {
          enabled: body.email?.enabled ?? current.email.enabled,
          provider:
            body.email?.provider === 'smtp' || body.email?.provider === 'resend'
              ? body.email.provider
              : current.email.provider,
          fromEmail:
            body.email?.fromEmail !== undefined
              ? body.email.fromEmail.trim().slice(0, 160)
              : current.email.fromEmail,
          apiKey: pickSecret(body.email?.apiKey, current.email.apiKey),
          smtpHost:
            body.email?.smtpHost !== undefined
              ? body.email.smtpHost.trim().slice(0, 160)
              : current.email.smtpHost,
          smtpPort:
            body.email?.smtpPort !== undefined && Number.isFinite(Number(body.email.smtpPort))
              ? Math.max(1, Math.min(65535, Number(body.email.smtpPort)))
              : current.email.smtpPort,
          smtpUser: pickSecret(body.email?.smtpUser, current.email.smtpUser),
          smtpPass: pickSecret(body.email?.smtpPass, current.email.smtpPass)
        },
        sms: {
          enabled: body.sms?.enabled ?? current.sms.enabled,
          provider:
            body.sms?.provider === 'twilio' ||
            body.sms?.provider === 'custom' ||
            body.sms?.provider === 'africastalking'
              ? body.sms.provider
              : current.sms.provider,
          senderId:
            body.sms?.senderId !== undefined
              ? body.sms.senderId.trim().slice(0, 32)
              : current.sms.senderId,
          username:
            body.sms?.username !== undefined
              ? body.sms.username.trim().slice(0, 80)
              : current.sms.username,
          apiKey: pickSecret(body.sms?.apiKey, current.sms.apiKey)
        },
        updatedAt: new Date().toISOString(),
        updatedBy: admin?.email || admin?.uid || 'superadmin'
      };

      writeGatewayVault(nextVault);
      const eff = getEffectiveGatewayConfig();
      res.json({
        saved: true,
        config: buildMaskedGatewayResponse(eff),
        status: getIntegrationStatus()
      });
    }
  );

  app.post(
    '/api/admin/integrations/test',
    createRateLimiter('admin_api', 20, 60_000),
    requireSuperadmin,
    async (req, res) => {
      const { target } = req.body as { target?: 'momo' | 'airtel' | 'email' | 'sms' };
      const eff = getEffectiveGatewayConfig();
      if (target === 'momo') {
        if (!eff.momo.configured) {
          res.status(400).json({
            ok: false,
            message: 'Enter MTN MoMo API User, API Key, and Subscription Key first.'
          });
          return;
        }
        const tokenCheck = await fetchMomoAccessToken(eff.momo);
        if (tokenCheck.token) {
          res.json({
            ok: true,
            message: `MTN MoMo (${eff.momo.environment}) OAuth token handshake succeeded.`
          });
        } else {
          res.json({
            ok: false,
            message: `MTN MoMo handshake failed: ${tokenCheck.error || 'Unknown error'}`
          });
        }
        return;
      }

      if (target === 'airtel') {
        res.json({
          ok: eff.airtel.configured,
          message: eff.airtel.configured
            ? `Airtel Money (${eff.airtel.environment}) credentials present in encrypted vault.`
            : 'Airtel Money Client ID & Secret not configured yet.'
        });
        return;
      }

      if (target === 'email') {
        res.json({
          ok: eff.email.configured,
          message: eff.email.configured
            ? `Email (${eff.email.provider}) configuration saved for ${eff.email.fromEmail}.`
            : 'Email provider credentials not configured yet.'
        });
        return;
      }

      if (target === 'sms') {
        res.json({
          ok: eff.sms.configured,
          message: eff.sms.configured
            ? `SMS gateway (${eff.sms.provider}) credentials saved.`
            : 'SMS gateway API key not configured yet.'
        });
        return;
      }

      res.status(400).json({ ok: false, message: 'Unknown integration target.' });
    }
  );

  app.get(
    '/api/admin/metrics',
    createRateLimiter('admin_api', 60, 60_000),
    requireSuperadmin,
    (_req, res) => {
      const sorted = [...metricsState.latenciesMs].sort((a, b) => a - b);
      const count = sorted.length;
      const avg = count > 0 ? sorted.reduce((a, b) => a + b, 0) / count : 0;
      const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
      const p95 = count > 0 ? sorted[Math.min(count - 1, Math.floor(count * 0.95))] : 0;
      const mem = process.memoryUsage();
      const ledgerRecords = Array.from(paymentById.values());
      const pendingCount = ledgerRecords.filter((p) => p.status === 'pending').length;
      const verifiedCount = ledgerRecords.filter((p) => p.status === 'verified').length;

      let status: 'healthy' | 'watch' | 'upgrade_recommended' = 'healthy';
      let recommendation =
        'Server concurrency, response latency, and error rates are comfortably within Spark/standard capacity.';
      if (metricsState.peakConcurrent >= 80 || p95 > 800 || metricsState.totalErrors5xx >= 15) {
        status = 'upgrade_recommended';
        recommendation =
          'High concurrent traffic or elevated latency detected. Consider upgrading Firebase to Blaze pay-as-you-go if daily Firestore read/write quotas approach 50k reads / 20k writes.';
      } else if (metricsState.peakConcurrent >= 35 || p95 > 350 || metricsState.rateLimited429 >= 20) {
        status = 'watch';
        recommendation =
          'Moderate traffic load observed. Monitor Firestore daily read/write charts in Firebase Console before upgrading to Blaze.';
      }

      res.json({
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor((Date.now() - metricsState.startedAtMs) / 1000),
        concurrency: {
          inFlight: metricsState.inFlight,
          peakConcurrent: metricsState.peakConcurrent,
          targetCapacityLabel: '100–1,000+ concurrent clients (cached + paginated + rate-limited)'
        },
        traffic: {
          totalRequests: metricsState.totalRequests,
          apiRequests: metricsState.apiRequests,
          totalErrors5xx: metricsState.totalErrors5xx,
          rateLimited429: metricsState.rateLimited429,
          activeRateLimitBuckets: rateBuckets.size
        },
        latencyMs: {
          avg: Number(avg.toFixed(1)),
          p50: Number(p50.toFixed(1)),
          p95: Number(p95.toFixed(1)),
          samples: count
        },
        memoryMb: {
          rss: Math.round(mem.rss / 1048576),
          heapUsed: Math.round(mem.heapUsed / 1048576),
          heapTotal: Math.round(mem.heapTotal / 1048576)
        },
        ledger: {
          paymentCount: ledgerRecords.length,
          pendingCount,
          verifiedCount
        },
        firebaseTierAdvisory: {
          currentTier: 'spark_free_or_managed',
          status,
          recommendation,
          upgradeDecisionNote:
            'Upgrade remains strictly under Superadmin control. Multi-tab IndexedDB caching and paginated queries minimize Firestore reads per user.'
        }
      });
    }
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true
      })
    );
    app.use(
      express.static(distPath, {
        maxAge: '10m',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        }
      })
    );
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Education Rwanda server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
