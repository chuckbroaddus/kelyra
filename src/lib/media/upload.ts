import { Platform } from 'react-native';

import { makePhotoThumb, normalizePhoto } from '@/lib/media/photo';
import { thumbStoragePath } from '@/lib/media/paths';
import { signedThumbUrl, signedUrl } from '@/lib/media/signedUrl';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssetKind, AssetRow } from '@/lib/supabase/types';

const CACHE_CONTROL = '31536000';

function extensionFor(mimeType: string, fallback: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
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

async function uploadObject(
  bucket: 'photos' | 'audio' | 'files',
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const { error } = await requireSupabase()
    .storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType,
      cacheControl: CACHE_CONTROL,
      upsert: false,
    });
  if (error) throw error;
}

export async function uploadPhotoPair(input: {
  ownerId: string;
  uri: string;
  mimeType: string;
  prefix?: string;
  skipThumb?: boolean;
}): Promise<{
  storagePath: string;
  thumbStoragePath: string | null;
  mimeType: string;
  byteSize: number;
}> {
  const prepared = await normalizePhoto(input.uri, input.mimeType);
  const bytes = new Uint8Array(await readUriAsBytes(prepared.uri));
  if (!bytes.byteLength) throw new Error('That file was empty.');
  const ext = extensionFor(prepared.mimeType, 'jpg');
  const folder = input.prefix ? `${input.ownerId}/${input.prefix}` : input.ownerId;
  const stem = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${stem}.${ext}`;
  await uploadObject('photos', storagePath, bytes, prepared.mimeType);

  let thumbPath: string | null = null;
  if (!input.skipThumb) {
    try {
      const thumb = await makePhotoThumb(prepared.uri, 'image/jpeg');
      const thumbBytes = new Uint8Array(await readUriAsBytes(thumb.uri));
      if (thumbBytes.byteLength) {
        thumbPath = thumbStoragePath(storagePath);
        if (thumbPath !== storagePath) {
          await uploadObject('photos', thumbPath, thumbBytes, 'image/jpeg');
        } else {
          thumbPath = null;
        }
      }
    } catch {
      thumbPath = null;
    }
  }

  return {
    storagePath,
    thumbStoragePath: thumbPath,
    mimeType: prepared.mimeType,
    byteSize: bytes.byteLength,
  };
}

export async function uploadTeacherAsset(input: {
  teacherId: string;
  kind: AssetKind;
  uri: string;
  mimeType: string;
  skipThumb?: boolean;
}): Promise<AssetRow> {
  if (input.kind === 'photo') {
    const uploaded = await uploadPhotoPair({
      ownerId: input.teacherId,
      uri: input.uri,
      mimeType: input.mimeType,
      skipThumb: input.skipThumb,
    });
    return insertAssetRow({
      teacherId: input.teacherId,
      kind: 'photo',
      storagePath: uploaded.storagePath,
      thumbStoragePath: uploaded.thumbStoragePath,
      mimeType: uploaded.mimeType,
      byteSize: uploaded.byteSize,
    });
  }

  const bytes = new Uint8Array(await readUriAsBytes(input.uri));
  if (!bytes.byteLength) throw new Error('That file was empty.');
  const ext = extensionFor(input.mimeType, 'm4a');
  const storagePath = `${input.teacherId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await uploadObject('audio', storagePath, bytes, input.mimeType);
  return insertAssetRow({
    teacherId: input.teacherId,
    kind: 'audio',
    storagePath,
    thumbStoragePath: null,
    mimeType: input.mimeType,
    byteSize: bytes.byteLength,
  });
}

async function insertAssetRow(input: {
  teacherId: string;
  kind: AssetKind;
  storagePath: string;
  thumbStoragePath: string | null;
  mimeType: string;
  byteSize: number;
}): Promise<AssetRow> {
  const supabase = requireSupabase();
  const base = {
    teacher_id: input.teacherId,
    kind: input.kind,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
    byte_size: input.byteSize,
  };
  if (input.kind === 'photo' && input.thumbStoragePath) {
    const { data, error } = await supabase
      .from('assets')
      .insert({ ...base, thumb_storage_path: input.thumbStoragePath })
      .select('*')
      .single();
    if (!error && data) return data;
  }
  const { data, error } = await supabase.from('assets').insert(base).select('*').single();
  if (error) throw error;
  return data;
}

export type PhotoAssetPaths = {
  id: string;
  storage_path: string;
  thumb_storage_path: string | null;
};

export async function loadPhotoAssetPaths(ids: string[]): Promise<PhotoAssetPaths[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const supabase = requireSupabase();
  const full = await supabase.from('assets').select('id, storage_path, thumb_storage_path').in('id', unique);
  if (!full.error && full.data) {
    return full.data.map((row) => ({
      id: row.id,
      storage_path: row.storage_path,
      thumb_storage_path: row.thumb_storage_path ?? null,
    }));
  }
  const fallback = await supabase.from('assets').select('id, storage_path').in('id', unique);
  if (fallback.error || !fallback.data) return [];
  return fallback.data.map((row) => ({
    id: row.id,
    storage_path: row.storage_path,
    thumb_storage_path: null,
  }));
}

export async function signedUrlForAsset(kind: AssetKind, storagePath: string): Promise<string | null> {
  const bucket = kind === 'photo' ? 'photos' : 'audio';
  return signedUrl(bucket, storagePath);
}

export async function signedThumbUrlForAsset(
  storagePath: string,
  thumbStoragePath?: string | null,
): Promise<string | null> {
  return signedThumbUrl(storagePath, thumbStoragePath, { fallbackOriginal: false });
}
