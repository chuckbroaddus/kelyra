/**
 * Closest-vehicle rule for car-rider plate reads (ride-lpr + classify-capture vehicle path).
 *
 * Car-line photos often show the target car plus other cars (or a reflection of one) with
 * readable plates. The model is told to read ONLY the closest vehicle and to list every other
 * plate it saw in `other_plates_seen`; `applyClosestVehicleGuard` then refuses the read when it
 * looks like the wrong car was picked. Pure (no Deno / npm imports) so node tests can import it.
 */

export const MULTIPLE_VEHICLES = 'multiple vehicles';

/** Prompt rules shared by ride-lpr and classify-capture (keep the wording identical in both). */
export const CLOSEST_VEHICLE_RULES = `- The photo may show more than one vehicle. Read ONLY the closest vehicle: the one whose plate is largest and lowest in the frame (the car directly in front of the camera). Ignore every other car, even if its plate is sharper or easier to read.
- Ignore plates seen in reflections (windows, bumpers, mirrors, glass) and any mirrored or backwards text.
- If two vehicles are about equally close and you cannot tell which one is the target, set plate, plateFront, plateBack, make and model null, unreadable true, and reject_reason "${MULTIPLE_VEHICLES}".
- make / model must come from the same vehicle as the plate; never mix badges from different cars.
- other_plates_seen: every OTHER plate you can read in the photo (other cars, reflections), uppercase letters+digits only; [] when there is only one vehicle or the image is a document.`;

export function cleanPlateText(raw: unknown): string {
  return typeof raw === 'string' ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

export function cleanOtherPlates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const plate = cleanPlateText(item);
    if (plate.length >= 2 && !out.includes(plate)) out.push(plate);
  }
  return out;
}

export function isMultipleVehiclesReason(raw: unknown): boolean {
  return typeof raw === 'string' && /multiple\s+vehicles?|more than one (car|vehicle)|several (cars|vehicles)/i.test(raw);
}

export type ClosestVehicleInput = {
  plates: Array<string | null | undefined>;
  other_plates_seen: string[];
  confidence: number | null | undefined;
};

export type ClosestVehicleVerdict =
  | { ok: true }
  | { ok: false; reason: 'plate_in_other_plates' | 'other_vehicles_low_confidence' };

/** Below this confidence a read with other vehicles in frame is not trusted. */
export const MULTI_VEHICLE_MIN_CONFIDENCE = 0.8;

/**
 * Server-side check: unreadable when a returned plate is also listed as another vehicle's plate,
 * or when other vehicles were seen and confidence is below 0.8 (missing confidence counts as 0).
 */
export function applyClosestVehicleGuard(input: ClosestVehicleInput): ClosestVehicleVerdict {
  const others = cleanOtherPlates(input.other_plates_seen);
  if (!others.length) return { ok: true };
  const returned = input.plates.map(cleanPlateText).filter(Boolean);
  if (returned.some((plate) => others.includes(plate))) return { ok: false, reason: 'plate_in_other_plates' };
  const confidence = typeof input.confidence === 'number' && Number.isFinite(input.confidence) ? input.confidence : 0;
  if (confidence < MULTI_VEHICLE_MIN_CONFIDENCE) return { ok: false, reason: 'other_vehicles_low_confidence' };
  return { ok: true };
}

type LabeledField = { label: string; value: string };

const VEHICLE_FIELD = /\b(plate|license|tag|make|model|vehicle)\b/i;
const PLATE_FIELD = /\b(plate|license)\b/i;

/**
 * classify-capture vehicle path: same check over the extracted label/value pairs. When the read
 * fails, plate / make / model fields are dropped (never shown as if they belonged to this car).
 */
export function guardVehicleFields(
  fields: LabeledField[],
  otherPlatesSeen: unknown,
  confidence: number | null | undefined,
  rejectReason?: unknown,
): { fields: LabeledField[]; other_plates_seen: string[]; vehicle_reject_reason: string | null } {
  const other_plates_seen = cleanOtherPlates(otherPlatesSeen);
  const plates = fields.filter((f) => PLATE_FIELD.test(f.label)).map((f) => f.value);
  const ok = !isMultipleVehiclesReason(rejectReason) && applyClosestVehicleGuard({ plates, other_plates_seen, confidence }).ok;
  if (ok) return { fields, other_plates_seen, vehicle_reject_reason: null };
  return {
    fields: fields.filter((f) => !VEHICLE_FIELD.test(f.label)),
    other_plates_seen,
    vehicle_reject_reason: MULTIPLE_VEHICLES,
  };
}
