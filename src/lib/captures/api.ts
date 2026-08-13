import { signedUrlForAsset } from '@/lib/media/upload';
import { requireSupabase } from '@/lib/supabase/client';
import type { CaptureRow } from '@/lib/supabase/types';

export type InboxItem = CaptureRow & {
  photoUrl: string | null;
};

export async function createUnassignedHomework(input: {
  classId: string;
  photoAssetId: string;
  audioAssetId?: string;
}): Promise<CaptureRow> {
  const { data, error } = await requireSupabase()
    .from('captures')
    .insert({
      class_id: input.classId,
      kind: 'homework',
      input_source: 'camera',
      status: 'unassigned',
      student_id: null,
      photo_asset_id: input.photoAssetId,
      audio_asset_id: input.audioAssetId ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listUnassigned(classId: string): Promise<InboxItem[]> {
  const supabase = requireSupabase();
  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .eq('class_id', classId)
    .eq('status', 'unassigned')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!captures?.length) return [];

  const photoIds = captures
    .map((row) => row.photo_asset_id)
    .filter((id): id is string => Boolean(id));

  const { data: assets, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .in('id', photoIds.length ? photoIds : ['00000000-0000-0000-0000-000000000000']);
  if (assetError) throw assetError;

  const pathById = new Map((assets ?? []).map((asset) => [asset.id, asset.storage_path]));

  return Promise.all(
    captures.map(async (capture) => {
      const path = capture.photo_asset_id ? pathById.get(capture.photo_asset_id) : undefined;
      const photoUrl = path ? await signedUrlForAsset('photo', path) : null;
      return { ...capture, photoUrl };
    }),
  );
}
