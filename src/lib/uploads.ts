import type { User } from 'firebase/auth';

export type UploadScope = 'submission' | 'course_media' | 'resource';

export interface UploadRule {
  maxBytes: number;
  maxLabel: string;
  allowedExtensions: string[];
  allowedMimePrefixesOrExact: string[];
  acceptAttr: string;
}

export const UPLOAD_RULES: Record<UploadScope, UploadRule> = {
  submission: {
    maxBytes: 10 * 1024 * 1024,
    maxLabel: '10 MB',
    allowedExtensions: ['.pdf', '.txt', '.md', '.json', '.zip', '.docx', '.png', '.jpg', '.jpeg', '.webp'],
    allowedMimePrefixesOrExact: [
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
    ],
    acceptAttr: '.pdf,.txt,.md,.json,.zip,.docx,.png,.jpg,.jpeg,.webp'
  },
  course_media: {
    maxBytes: 25 * 1024 * 1024,
    maxLabel: '25 MB',
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a'],
    allowedMimePrefixesOrExact: [
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
    ],
    acceptAttr: 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.mp4,.webm,.m4a'
  },
  resource: {
    maxBytes: 10 * 1024 * 1024,
    maxLabel: '10 MB',
    allowedExtensions: ['.pdf', '.md', '.txt', '.csv', '.json', '.zip', '.docx'],
    allowedMimePrefixesOrExact: [
      'application/pdf',
      'text/markdown',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    acceptAttr: '.pdf,.md,.txt,.csv,.json,.zip,.docx'
  }
};

export function validateFileClient(file: File, scope: UploadScope): string | null {
  const rule = UPLOAD_RULES[scope];
  if (!file || file.size <= 0) {
    return 'Selected file is empty.';
  }
  if (file.size > rule.maxBytes) {
    return `File exceeds the ${rule.maxLabel} limit for this upload type.`;
  }
  const lowerName = file.name.toLowerCase();
  const hasValidExt = rule.allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return `Unsupported file extension. Allowed: ${rule.allowedExtensions.join(', ')}`;
  }
  if (file.type) {
    const normalizedMime = file.type.toLowerCase();
    const okMime = rule.allowedMimePrefixesOrExact.includes(normalizedMime);
    // Allow generic octet-stream for .md/.docx/.zip if extension matched
    if (!okMime && normalizedMime !== 'application/octet-stream') {
      return `Unsupported file type (${file.type}).`;
    }
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

export interface UploadedFileResult {
  fileId: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scope: UploadScope;
}

export async function uploadPlatformFile(
  file: File,
  scope: UploadScope,
  user: User | null
): Promise<UploadedFileResult> {
  if (!user) {
    throw new Error('Sign in required to upload files.');
  }
  const validationErr = validateFileClient(file, scope);
  if (validationErr) {
    throw new Error(validationErr);
  }

  const token = await user.getIdToken();
  const buffer = await file.arrayBuffer();
  const dataBase64 = arrayBufferToBase64(buffer);

  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      scope,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataBase64
    })
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    file?: UploadedFileResult;
  };
  if (!res.ok || !data.file) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data.file;
}

export function isProtectedUploadUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('/api/files/');
}

export async function openProtectedFile(url: string, user: User | null): Promise<void> {
  if (!url.startsWith('/api/files/')) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const fileId = url.replace('/api/files/', '').split('?')[0];
  if (!user) {
    throw new Error('Sign in required to download protected submission files.');
  }
  const token = await user.getIdToken();
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}/download-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    downloadUrl?: string;
  };
  if (!res.ok || !json.downloadUrl) {
    throw new Error(json.error || 'Could not authorize file download.');
  }

  const link = document.createElement('a');
  link.href = json.downloadUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
