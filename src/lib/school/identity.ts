import { DEFAULT_MONTHLY_CAP_USD } from '@/lib/ai/policy';
import { signedUrl } from '@/lib/media/signedUrl';
import { loadPhotoAssetPaths } from '@/lib/media/upload';
import { signedProfileUrlForAssetId } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';

export type SchoolIdentity = {
  id: string;
  name: string;
  logoAssetId: string | null;
  logoUrl: string | null;
  aiMonthlyCapUsd: number | null;
  aiSpendUsd: number;
};

export async function getSchoolIdentity(): Promise<SchoolIdentity | null> {
  const supabase = requireSupabase();
  let data: {
    id: string;
    name: string | null;
    logo_asset_id?: string | null;
    ai_monthly_cap_usd?: number | null;
  } | null = null;
  const first = await supabase.from('schools').select('id, name, logo_asset_id, ai_monthly_cap_usd').limit(1).maybeSingle();
  if (first.error) {
    const retry = await supabase.from('schools').select('id, name, logo_asset_id').limit(1).maybeSingle();
    if (retry.error) throw new Error(retry.error.message || 'Could not load the school');
    data = retry.data;
  } else {
    data = first.data;
  }
  if (!data) return null;
  const logoAssetId = data.logo_asset_id ?? null;
  let spendUsd = 0;
  try {
    const spendRes = await supabase.rpc('ai_spend_this_month');
    const row = Array.isArray(spendRes.data) ? spendRes.data[0] : spendRes.data;
    spendUsd = Number(row?.usd ?? 0);
  } catch {
    spendUsd = 0;
  }
  return {
    id: data.id,
    name: (data.name ?? 'School').trim() || 'School',
    logoAssetId,
    logoUrl: await loadSchoolLogoUrl(logoAssetId),
    aiMonthlyCapUsd:
      data.ai_monthly_cap_usd == null ? DEFAULT_MONTHLY_CAP_USD : Number(data.ai_monthly_cap_usd),
    aiSpendUsd: spendUsd,
  };
}

async function loadSchoolLogoUrl(assetId: string | null): Promise<string | null> {
  if (!assetId) return null;
  // Header logos are punched PNGs. Never prefer the JPEG thumb — that flatten
  // puts a white plate back around a circular mark.
  const { data } = await requireSupabase().rpc('school_logo_paths');
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.storage_path) {
    const url = await signedUrl('photos', row.storage_path);
    if (url) return url;
  }
  const assets = await loadPhotoAssetPaths([assetId]).catch(() => []);
  const path = assets[0]?.storage_path;
  if (path) {
    const url = await signedUrl('photos', path);
    if (url) return url;
  }
  return signedProfileUrlForAssetId(assetId).catch(() => null);
}

export async function setSchoolName(name: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('set_school_name', { p_name: name });
  if (error) throw new Error(error.message || 'Could not save the school name');
  return (typeof data === 'string' ? data : name).trim();
}

export async function setSchoolLogo(assetId: string | null): Promise<void> {
  const { error } = await requireSupabase().rpc('set_school_logo', { p_asset_id: assetId });
  if (error) throw new Error(error.message || 'Could not save the school logo');
}

export async function setSchoolAiCap(usd: number): Promise<number> {
  const { data, error } = await requireSupabase().rpc('set_school_ai_cap', { p_usd: usd });
  if (error) throw new Error(error.message || 'Could not save the AI budget');
  return typeof data === 'number' ? data : usd;
}
