/**
 * Response JSON Schemas for structured output (Gemini responseJsonSchema / xAI json_schema).
 * Kept permissive on purpose (nullable strings, few required keys): the schema guarantees
 * parseable JSON of the right shape; the per-function parsers still clean every value.
 * Pure (no Deno / npm imports) so node tests can import it.
 */

const str = { type: ['string', 'null'] } as const;
const num = { type: ['number', 'null'] } as const;
const strList = { type: 'array', items: { type: 'string' } } as const;

export const CLASSIFY_CAPTURE_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'homework',
        'syllabus',
        'portrait',
        'parent_card',
        'student_card',
        'metadata',
        'roster',
        'answer_key',
        'vehicle',
        'lesson_plan',
        'lesson_materials',
        'feed_photo',
        'unsure',
      ],
    },
    confidence: { type: 'number' },
    studentGuessId: str,
    studentGuessName: str,
    parentGuessName: str,
    draftScore: num,
    gaps: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' } }, required: ['label'] } },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, value: { type: 'string' } },
        required: ['label', 'value'],
      },
    },
    names: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, confidence: { type: 'number' } },
        required: ['name'],
      },
    },
    note: str,
    other_plates_seen: strList,
    reject_reason: str,
  },
  required: ['intent', 'confidence'],
} as const;

export const RIDE_LPR_SCHEMA = {
  type: 'object',
  properties: {
    document_kind: {
      type: 'string',
      enum: ['vehicle_photo', 'hang_tag', 'check_in_sheet', 'authorized_pickup', 'rejected', 'unknown'],
    },
    plate: str,
    plateFront: str,
    plateBack: str,
    make: str,
    model: str,
    side: { type: 'string', enum: ['front', 'back', 'unknown'] },
    tag_number: str,
    riders: strList,
    authorized_pickups: strList,
    confidence: { type: 'number' },
    unreadable: { type: 'boolean' },
    reject_reason: str,
    other_plates_seen: strList,
  },
  required: ['document_kind', 'plate', 'unreadable', 'confidence'],
} as const;
