import { Platform } from 'react-native';

import { requireSupabase } from '@/lib/supabase/client';
import type { AssetKind, AssetRow } from '@/lib/supabase/types';

function extensionFor(mimeType: string, fallback: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('m4a') || mimeType.includes('mp4a')) return 'm4a';
  return fallback;
}

export async function readUriAsBytes(uri: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(uri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) return buffer;
    }
  } catch {
    // Native file:// URIs often fail fetch. Fall through to the file API.
  }

  if (Platform.OS !== 'web') {
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  }

  throw new Error('Could not read the selected file.');
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function uploadTeacherAsset(input: {
  teacherId: string;
  kind: AssetKind;
  uri: string;
  mimeType: string;
}): Promise<AssetRow> {
  const bytes = new Uint8Array(await readUriAsBytes(input.uri));
  if (!bytes.byteLength) throw new Error('That file was empty.');
  const bucket = input.kind === 'photo' ? 'photos' : 'audio';
  const ext = extensionFor(input.mimeType, input.kind === 'photo' ? 'jpg' : 'm4a');
  const storagePath = `${input.teacherId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabase = requireSupabase();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: input.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('assets')
    .insert({
      teacher_id: input.teacherId,
      kind: input.kind,
      storage_path: storagePath,
      mime_type: input.mimeType,
      byte_size: bytes.byteLength,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function signedUrlForAsset(kind: AssetKind, storagePath: string): Promise<string | null> {
  const bucket = kind === 'photo' ? 'photos' : 'audio';
  const { data, error } = await requireSupabase().storage.from(bucket).createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}
