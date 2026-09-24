/** LPR fields from ride-lpr (may omit make/model). */
export type WalkAttachLpr = {
  plate: string | null;
  make: string | null;
  model: string | null;
};

/** Matched registry vehicle keys from dismissal_staff_walk_photo when plate hits. */
export type WalkAttachRegistry = {
  parent_id?: unknown;
  make?: unknown;
  model?: unknown;
  plate_norm?: unknown;
};

export type WalkAttachFields = {
  parentId: string;
  plate: string;
  make: string;
  model: string;
};

/**
 * Apply walk-photo LPR + optional registry hit onto attach-form fields.
 * Always writes plate/make/model ('' when null) so a prior car never sticks.
 * Registry wins for make/model/parent_id; plate prefers LPR then plate_norm.
 */
export function applyWalkAttachForm(
  lpr: WalkAttachLpr,
  registry?: WalkAttachRegistry | null,
): WalkAttachFields {
  let plate = lpr.plate ?? '';
  let make = lpr.make ?? '';
  let model = lpr.model ?? '';
  let parentId = '';

  const regParent = typeof registry?.parent_id === 'string' ? registry.parent_id : '';
  const regPlate = typeof registry?.plate_norm === 'string' ? registry.plate_norm : '';
  const hit = Boolean(regParent || regPlate);

  if (hit) {
    if (regParent) parentId = regParent;
    if (!plate && regPlate) plate = regPlate;
    // Registry make/model win even when null → clear stale LPR / prior form
    make = typeof registry?.make === 'string' ? registry.make : '';
    model = typeof registry?.model === 'string' ? registry.model : '';
  }

  return { parentId, plate, make, model };
}
