import { signedProfileUrlForAssetId } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';

export type SchoolIdentity = {
  id: string;
  name: string;
  logoAssetId: string | null;
  logoUrl: string | null;
};

export async function getSchoolIdentity(): Promise<SchoolIdentity | null> {
  const { data, error } = await requireSupabase()
    .from('schools')
    .select('id, name, logo_asset_id')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not load the school');
  if (!data) return null;
  const logoAssetId = data.logo_asset_id ?? null;
  return {
    id: data.id,
    name: (data.name ?? 'School').trim() || 'School',
    logoAssetId,
    logoUrl: await signedProfileUrlForAssetId(logoAssetId),
  };
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
