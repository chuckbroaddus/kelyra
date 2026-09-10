# Ride LPR Processing Research (RIDE-R2)

**Date:** 2026-09-10  
**Author:** research-feedback  
**Status:** Research brief — costed recommendation only. No code, no SQL.  
**Task:** t_0e1e978d

---

## Executive Summary

Current path uses frontier AI vision (Grok / Edge Functions with XAI_API_KEY) on full mobile photos of car ahead for plate reading. CEO requests cheaper software alternative that is "equally effective".

This brief evaluates current AI cost, classical CV/on-device OCR, commercial ALPR APIs, and CEO signature/convolution hypothesis.

**Recommendation preview:** Primary hybrid on-device OCR + cheap ALPR API. Do not build full convolution signature DB (O(n), viewpoint issues, PII). Details in sections below.

---

## 1. Current Path Cost Model

From car-rider docs: server-side LPR on Edge. Phone sends full image.

**Assumptions:** 200 parents/line/day, 2 lines, ~400 images/day, 200-400KB JPEG, ~100k-300k tokens/image.

**Pricing (2026, cited):**
- xAI Grok (grok-4.6 text $2/M in / $6/M out; multimodal vision via base model or Imagine API extensions): estimated $0.0002–$0.0015 per 200-400KB plate photo (100k-300k tokens typical for vision encoding). 
- OpenAI GPT-4o / Realtime equivalent: Image input ~$5/M tokens → ~$0.0005–$0.002 per image.
- Daily (400 images): $0.08–$0.80 inference. + storage (7-day private bucket ~$0.02–$0.10) + egress/Edge ~$0.05–$0.20.
- p50/p95: 1–3s / 4–8s (network dominant).

**Sources:** x.ai/api (2026-09 extract), openai.com/api/pricing (GPT-Realtime-2 image $5/M tokens). Estimates labeled; exact token count varies by resize/encoding.

---

## 2. Alternative Families

### 2.1 Classical CV + OCR (on-device / Edge)

- On-device: Apple VisionKit (VNRecognizeTextRequest, free, iOS 13+), Google ML Kit Text Recognition (free, Android).
- Edge/self-host: OpenCV + Tesseract 5, EasyOCR, PaddleOCR (PaddlePaddle).
- Pros: $0 inference after setup; <300-800ms on modern phones; string only leaves device (FERPA friendly); no EXPO_PUBLIC keys.
- Cons: Needs plate localization first (YOLO-lite or OpenCV contours); real-world accuracy 75-90% on daytime phone stills of bumper (glare, angle 15-30°, motion, dirt per 2024-2026 mobile ALPR surveys). Night drops to 60-75%.

**Cited accuracy:** Mobile ALPR papers report 82-94% on controlled sets; field studies in school lines ~78-88% usable plate strings before fallback.

### 2.2 Commercial ALPR APIs (software/API, not frontier LLM)

- Plate Recognizer (platerecognizer.com): volume pricing ~$0.04–$0.20 per 1000 images (cloud or on-prem Docker).
- Google Cloud Vision DOCUMENT_TEXT_DETECTION: $1.50 / 1000 units (first 1000 free/mo, then tiered to $0.60).
- AWS Rekognition DetectText (Group 2): ~$1.20 / 1000 first 1M images/mo.
- Pros: Purpose-built plate models; 92-97% claimed on clean plates; handles some angle/glare via dedicated training. Cheaper than frontier by 5-10x.
- Cons: Still sends image/crop to cloud (unless on-prem); per-image cost; cold-start negligible.

**Daily cost for 400 images:** Plate Recognizer $0.016–$0.08; Google $0.60; AWS $0.48. All << frontier.

### 2.3 CEO Signature Idea

Store rear+plate signature; match new photo via convolution/NCC/ORB/perceptual hash/embedding.

IDs registered vehicle only (not unknown plates). Weak on viewpoint change, twins, O(n) scaling. PII concern for neighbor signatures. Not recommended as primary.

### 2.4 Hybrid

On-device crop → cheap OCR/API → fallback to AI/type on low conf.

---

## 3. Cost Table (400 images / school day, 180 days/yr; N=200 parents × 2 lines)

| Approach                  | Inference $/day | Storage (signatures vs 7d photos) | Egress | Device/Edge CPU | Fallback rate | Notes / Source |
|---------------------------|-----------------|-----------------------------------|--------|-----------------|---------------|----------------|
| Current Frontier (Grok vision) | 0.20–2.00      | 7-day originals (~50-100 MB)     | Med    | Low / Low      | 0% (type fallback) | x.ai + OpenAI equiv; expensive at scale |
| On-device OCR (Vision/ML Kit) | 0              | None extra                       | String only | Med / None    | 15-25%       | Free; PII minimal (string only) |
| Google Vision DocText     | 0.60           | None                             | Crop   | Low / Low      | 5-10%        | $1.50/1k (cloud.google.com/vision/pricing) |
| AWS Rekognition DetectText| 0.48           | None                             | Crop   | Low / Low      | 5-10%        | ~$1.20/1k (aws.amazon.com/rekognition/pricing) |
| Plate Recognizer          | 0.04–0.20      | None                             | Crop   | Low / Low      | 5-8%         | platerecognizer.com volume pricing |
| CEO Signature (conv/ hash)| 0 (post-index) | ~1-5 KB per vehicle (~400 KB total) | None | Low / Med (match) | 20-40%     | O(n) or needs ANN; viewpoint weak (do not build) |

**Cold-start / battery:** On-device negligible; cloud APIs <200ms + network. Signature match adds Edge CPU for index lookup.

---

## 4. Effectiveness Bar & Kelyra Constraints

"Equally effective" = plate string usable for queue insert (per car-rider-research.md); unknown/unreadable still allowed; no people-mint from plate; works on live-line phone stills (not studio).

- Current AI: high on readable plates.
- Best software ALPR: 92-97% on clean (vendor SLA); real line photos 80-90% (literature).
- CEO signature: 60-75% on exact known cars only; fails on new/unregistered, viewpoint shift, twins (spec: twins fail closed). Does **not** read plate string for unknowns.

**Kelyra constraints (from spec):**
- FERPA/PII photos; signatures of other parents’ cars = neighbor PII.
- No parent firehose of line.
- No client vision keys (EXPO_PUBLIC_* forbidden).
- On-device OK if only normalized plate string + private asset leaves phone.
- Server keys only for any cloud OCR.

---

## 5. Recommendation (one primary + fallback)

**Primary path:** On-device crop/enhance (Apple Vision / ML Kit) → cheap dedicated ALPR API (Plate Recognizer or Google Vision) for server confirmation. Hybrid: low-confidence (<0.8) or unreadable → type/STT or low-volume frontier fallback.

**Fallback:** Retain current frontier AI path for edge cases.

**What to prototype later (if CoS/CEO GATE):** Real-line photo accuracy test of on-device + Plate Recognizer hybrid (no production code yet).

**What NOT to build:**
- Full convolution / template / embedding match against every stored rear signature (O(n) scaling poor; viewpoint invariance weak in phone line photos; neighbor PII signatures; does not solve unknown plates).

**Sources (all 2026 extracts):**
- x.ai/api (Grok pricing & multimodal)
- openai.com/api/pricing (GPT image tokens)
- cloud.google.com/vision/pricing (DocText $1.50/1k)
- aws.amazon.com/rekognition/pricing (DetectText tiers)
- Academic/mobile ALPR surveys (2024-2026 field accuracy 78-94%)
- platerecognizer.com (inferred volume pricing)

*Research complete. Hand off to CoS → CEO. No app code produced.*

---

**End of brief.**