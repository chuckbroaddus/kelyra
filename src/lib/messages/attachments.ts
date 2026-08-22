import { Platform } from 'react-native';

import { pickNormalizedPhoto, pickRawPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { readUriAsBytes } from '@/lib/media/upload';
import { requireSupabase } from '@/lib/supabase/client';
import type { MessageFile, MessageLink, MessagePhoto } from '@/lib/supabase/types';

const MAX_BYTES = 10 * 1024 * 1024;
const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/i;

export type DraftAttach = MessagePhoto | MessageFile | MessageLink;

export function firstHttpUrl(text: string): string | null {
  const match = text.match(URL_IN_TEXT);
  if (match) return match[0].replace(/[),.;!?]+$/, '');
  const www = text.match(/\bwww\.[^\s<>"']+/i);
  if (!www) return null;
  return `https://${www[0].replace(/[),.;!?]+$/, '')}`;
}

export function stripUrl(text: string, url: string): string {
  return text.replace(url, '').replace(/\s{2,}/g, ' ').trim();
}

export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export async function signedMessageUrl(kind: 'photo' | 'file', storagePath: string): Promise<string | null> {
  const bucket = kind === 'photo' ? 'photos' : 'files';
  const { data, error } = await requireSupabase().storage.from(bucket).createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

function asLink(url: string, data: { url?: string; title?: string; description?: string | null; image_url?: string | null } | null): MessageLink | null {
  if (!data) return null;
  const title = data.title?.trim();
  const image = data.image_url?.trim();
  if (!title && !image) return null;
  return {
    type: 'link',
    url: data.url || url,
    title: title || linkHost(url),
    description: data.description ?? null,
    image_url: image || null,
  };
}

export async function unfurlLink(raw: string): Promise<MessageLink> {
  const url = raw.trim();
  const fallback: MessageLink = { type: 'link', url, title: linkHost(url) };
  const supabase = requireSupabase();
  try {
    const { data, error } = await supabase.rpc('unfurl_link', { p_url: url });
    const row = typeof data === 'string' ? (JSON.parse(data) as Parameters<typeof asLink>[1]) : data;
    const parsed = asLink(url, row);
    if (!error && parsed) return parsed;
  } catch {
    // Fall through — Edge function or hostname card.
  }
  try {
    const { data, error } = await supabase.functions.invoke('unfurl-link', { body: { url } });
    const parsed = asLink(url, data);
    if (!error && parsed) return parsed;
  } catch {
    // Hostname card still lets people tap the link.
  }
  return fallback;
}

function extFor(mimeType: string, name: string, fallback: string): string {
  const fromName = name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  return fallback;
}

export async function uploadMessageFile(input: {
  ownerId: string;
  uri: string;
  mimeType: string;
  name: string;
  kind: 'photo' | 'file';
}): Promise<DraftAttach> {
  const bytes = new Uint8Array(await readUriAsBytes(input.uri));
  if (!bytes.byteLength) throw new Error('That file was empty.');
  if (bytes.byteLength > MAX_BYTES) throw new Error('Keep attachments under 10 MB.');
  const bucket = input.kind === 'photo' ? 'photos' : 'files';
  const ext = extFor(input.mimeType, input.name, input.kind === 'photo' ? 'jpg' : 'bin');
  const storagePath = `${input.ownerId}/messages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await requireSupabase().storage.from(bucket).upload(storagePath, bytes, {
    contentType: input.mimeType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(error.message || 'Could not attach that file');
  if (input.kind === 'photo') {
    return { type: 'photo', storage_path: storagePath, mime_type: input.mimeType };
  }
  return { type: 'file', storage_path: storagePath, name: input.name || 'File', mime_type: input.mimeType };
}

function pickWebFile(accept: string): Promise<{ uri: string; mimeType: string; name: string } | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ uri: URL.createObjectURL(file), mimeType: file.type || 'application/octet-stream', name: file.name });
    };
    input.click();
  });
}

export async function pickMessagePhoto(fromCamera: boolean): Promise<{ uri: string; mimeType: string; name: string } | null> {
  if (fromCamera && webCameraNeeded(true)) {
    return pickWebFile('image/*');
  }
  await waitForModalDismiss();
  const photo = await pickNormalizedPhoto(fromCamera);
  if (!photo) return null;
  return { uri: photo.uri, mimeType: photo.mimeType, name: fromCamera ? 'Photo.jpg' : 'Photo.jpg' };
}

/** Group avatar: raw camera/library file. Does not run face crop or background cutout. */
export async function pickGroupPhoto(fromCamera: boolean): Promise<{ uri: string; mimeType: string; name: string } | null> {
  if (fromCamera && webCameraNeeded(true)) {
    return pickWebFile('image/*');
  }
  await waitForModalDismiss();
  const photo = await pickRawPhoto(fromCamera);
  if (!photo) return null;
  return { uri: photo.uri, mimeType: photo.mimeType, name: 'Group.jpg' };
}

export async function pickMessageDocument(): Promise<{ uri: string; mimeType: string; name: string } | null> {
  if (Platform.OS === 'web') return pickWebFile('*/*');
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || 'application/octet-stream',
    name: asset.name || 'File',
  };
}

export async function fileFromClipboardItem(file: File): Promise<{ uri: string; mimeType: string; name: string }> {
  return {
    uri: URL.createObjectURL(file),
    mimeType: file.type || 'application/octet-stream',
    name: file.name || (file.type.startsWith('image/') ? 'Photo.png' : 'File'),
  };
}
