import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ClassTabs } from '@/components/ui/ClassTabs';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { GRADE_KINDS, GRADE_TERMS } from '@/lib/grade/marks';
import { invokeAi } from '@/lib/ai/invoke';
import { uploadTeacherAsset, signedUrlForAsset } from '@/lib/media/upload';
import { pickNormalizedPhoto, webCameraNeeded } from '@/lib/media/pickPhoto';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import {
  activeWeightSum,
  applyAskDraftToEditor,
  defaultPolicies,
  discardSyllabusAskDraft,
  emptyCategory,
  getClassSyllabus,
  publishClassSyllabus,
  saveClassSyllabusDraft,
  slugCategoryKey,
  unpublishClassSyllabus,
  upsertSyllabusAskDraft,
  weightsValidForPublish,
  type ClassSyllabusDraft,
  type SyllabusCategoryDraft,
} from '@/lib/syllabus/api';
import type { SyllabusPolicies } from '@/lib/grade/syllabusAverage';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { ClassRow } from '@/lib/supabase/types';

type ConfirmKind =
  | { kind: 'publish' }
  | { kind: 'unpublish' }
  | { kind: 'discard_ask' }
  | { kind: 'missing_zero' }
  | { kind: 'live_edit' }
  | null;

export default function SyllabusScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teacher } = useAuth();
  const chrome = useChrome();
  usePushedTitle(chrome.className ?? 'Syllabus');

  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState(1);
  const [syllabusStatus, setSyllabusStatus] = useState<ClassSyllabusDraft['status'] | 'none'>('none');
  const [title, setTitle] = useState('');
  const [termStructure, setTermStructure] = useState<ClassSyllabusDraft['term_structure']>('year');
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [policies, setPolicies] = useState<SyllabusPolicies>(defaultPolicies());
  const [categories, setCategories] = useState<SyllabusCategoryDraft[]>([]);
  const [askDraft, setAskDraft] = useState<Record<string, unknown> | null>(null);
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editingRulesKey, setEditingRulesKey] = useState<string | null>(null);

  const sum = useMemo(() => activeWeightSum(categories), [categories]);
  const canPublish = weightsValidForPublish(categories) && Boolean(termStructure);

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    setLoading(true);
    setError(null);
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      await setActiveClass(teacher.id, id);
      const bundle = await getClassSyllabus(id);
      if (!bundle.exists || !bundle.syllabus) {
        setSyllabusStatus('none');
        setRowVersion(1);
        setTitle('');
        setTermStructure('year');
        setActiveTerm(null);
        setPolicies(defaultPolicies());
        setCategories([]);
        setAskDraft(null);
        setSourceAssetId(null);
      } else {
        const s = bundle.syllabus;
        setSyllabusStatus(s.status);
        setRowVersion(s.row_version);
        setTitle(s.title ?? '');
        setTermStructure(s.term_structure);
        setActiveTerm(s.active_term);
        setPolicies({ ...defaultPolicies(), ...s.policies });
        setCategories(bundle.categories);
        setAskDraft(s.ask_draft);
        setSourceAssetId(s.source_asset_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load syllabus');
    } finally {
      setLoading(false);
    }
  }, [id, teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const patchCategory = (key: string, partial: Partial<SyllabusCategoryDraft>) => {
    setCategories((current) => current.map((row) => (row.key === key ? { ...row, ...partial } : row)));
  };

  const addCategory = (seed?: { key: string; label: string }) => {
    const used = new Set(categories.map((c) => c.key));
    const key = seed?.key && !used.has(seed.key) ? seed.key : slugCategoryKey(seed?.label || 'Other', used);
    const label = seed?.label || GRADE_KINDS.find((k) => k.key === key)?.label || 'Other';
    setCategories((current) => [...current, emptyCategory(label, key, current.length)]);
  };

  const onSaveDraft = async () => {
    if (!id) return;
    // Live published weights change only via Publish (sum gate + confirm).
    if (syllabusStatus === 'published') {
      setError('This syllabus is published. Use Publish changes to update live weights.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveClassSyllabusDraft(id, {
        title: title.trim() || null,
        term_structure: termStructure,
        active_term: activeTerm,
        policies,
        categories,
        source: askDraft ? 'ask_import' : 'manual',
      });
      setStatus('Draft saved — not used in averages yet.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft');
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await publishClassSyllabus(id, rowVersion, {
        title: title.trim() || null,
        term_structure: termStructure,
        active_term: activeTerm,
        policies: { ...policies, publish_to_family: policies.publish_to_family !== false },
        categories,
        source: askDraft ? 'ask_import' : 'manual',
      });
      setStatus('Syllabus published.');
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
  };

  const onPublishPress = () => {
    if (!canPublish) {
      setError('Active weights must total 100% and every category needs a label before publish.');
      return;
    }
    if (syllabusStatus === 'published') setConfirm({ kind: 'live_edit' });
    else setConfirm({ kind: 'publish' });
  };

  const parsePhoto = async (uri: string, mimeType: string) => {
    if (!id || !teacher) return;
    setBusy(true);
    setError(null);
    setStatus('Reading syllabus photo…');
    try {
      const asset = await uploadTeacherAsset({
        teacherId: teacher.id,
        kind: 'photo',
        uri,
        mimeType,
      });
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) throw new Error('Could not open the uploaded photo.');
      const draft = await invokeAi<Record<string, unknown>>('parse-class-syllabus', {
        classId: id,
        imageUrl,
        mimeType,
      });
      if (draft.error) throw new Error(String(draft.error));
      await upsertSyllabusAskDraft(id, { ...draft, schema_version: 1, class_id: id }, asset.id);
      setStatus('Ask draft ready — review before publish.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo');
    } finally {
      setBusy(false);
    }
  };

  const onPickPhoto = async (preferCamera: boolean) => {
    if (webCameraNeeded(preferCamera)) {
      setCameraOpen(true);
      return;
    }
    try {
      const photo = await pickNormalizedPhoto(preferCamera);
      if (!photo) return;
      await parsePhoto(photo.uri, photo.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open photo');
    }
  };

  const applyAsk = () => {
    if (!askDraft) return;
    const applied = applyAskDraftToEditor(askDraft);
    if (applied.documentKind === 'rubric') {
      setError('This looks like a scoring rubric. Rubric levels are not category weights.');
      return;
    }
    if (applied.documentKind === 'mixed') {
      setStatus('Mixed document — category weights applied; rubric criteria ignored.');
    }
    if (applied.title) setTitle(applied.title);
    setTermStructure(applied.term_structure);
    setActiveTerm(applied.active_term);
    setPolicies(applied.policies);
    if (applied.categories.length) setCategories(applied.categories);
    else setError('Could not read a grading policy from that photo. Enter weights manually.');
  };

  const useRemainder = () => {
    const leftover = Math.round((100 - sum) * 1000) / 1000;
    if (leftover <= 0) return;
    const used = new Set(categories.map((c) => c.key));
    const key = used.has('other') ? slugCategoryKey('Other', used) : 'other';
    setCategories((current) => [...current, { ...emptyCategory('Other', key, current.length), weight_percent: leftover }]);
  };

  if (loading && !klass) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  const statusLabel =
    syllabusStatus === 'published' ? 'Published' : syllabusStatus === 'draft' ? 'Draft' : 'Not set';

  const rulesCategory = categories.find((c) => c.key === editingRulesKey) ?? null;

  return (
    <Screen keyboard>
      {id ? <ClassTabs classId={id} /> : null}
      <SectionHeader label="How this class grades" first />
      <Card>
        <Text style={[type.meta, { color: colors.mute }]}>Status: {statusLabel}</Text>
        <Text style={[type.body, { color: colors.ink, marginTop: 4 }]}>
          Categories and weights drive the final average. Nothing is a grade until you Approve work.
        </Text>
        <Text style={[type.meta, { color: sum === 100 ? colors.good : colors.warn, marginTop: 8 }]}>
          Sum {Math.round(sum * 1000) / 1000}%
          {sum < 100 ? ` · ${Math.round((100 - sum) * 1000) / 1000}% unassigned` : sum > 100 ? ' · over 100%' : ' · OK'}
        </Text>
      </Card>

      {askDraft ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>From photo · Ask draft</Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            Review every line. Nothing is live until you publish.
          </Text>
          {String(askDraft.document_kind) === 'rubric' || String(askDraft.document_kind) === 'mixed' ? (
            <Text style={[type.meta, { color: colors.warn, marginTop: 6 }]}>
              This looks like a scoring rubric (or mixed). Rubric levels are not category weights.
            </Text>
          ) : null}
          <PrimaryButton label="Apply checked into editor" onPress={applyAsk} />
          <GhostButton align="left" label="Discard draft" onPress={() => setConfirm({ kind: 'discard_ask' })} />
        </Card>
      ) : null}

      <TextField
        label="Syllabus title"
        placeholder="Room 14 Math — Fall 2026"
        value={title}
        onChangeText={setTitle}
      />

      <SectionHeader label="Categories" />
      <GhostButton align="left" label="Add category" onPress={() => addCategory()} />
      <ChipRow>
        {GRADE_KINDS.filter((k) => !categories.some((c) => c.key === k.key)).map((k) => (
          <Chip key={k.key} label={`+ ${k.label}`} selected={false} onPress={() => addCategory(k)} />
        ))}
      </ChipRow>
      {categories.map((row) => (
        <Card key={row.key}>
          <TextField
            label="Label"
            value={row.label}
            onChangeText={(label) => patchCategory(row.key, { label })}
          />
          <TextField
            label="Weight %"
            keyboardType="numeric"
            value={String(row.weight_percent)}
            onChangeText={(text) => {
              const n = Number(text);
              patchCategory(row.key, { weight_percent: Number.isFinite(n) ? n : 0 });
            }}
          />
          <ChipRow>
            <Chip
              label={row.active ? 'Active' : 'Hidden'}
              selected={row.active}
              onPress={() => patchCategory(row.key, { active: !row.active })}
            />
            <Chip
              label={row.default_include_in_average ? 'Counts by default: Yes' : 'Counts by default: No'}
              selected={row.default_include_in_average}
              onPress={() =>
                patchCategory(row.key, { default_include_in_average: !row.default_include_in_average })
              }
            />
            <Chip label="Rules" selected={editingRulesKey === row.key} onPress={() => setEditingRulesKey(row.key)} />
          </ChipRow>
          <Text style={[type.meta, { color: colors.mute }]}>key: {row.key}</Text>
        </Card>
      ))}
      {sum < 100 ? (
        <GhostButton align="left" label={`Use remainder as Other (${Math.round((100 - sum) * 1000) / 1000}%)`} onPress={useRemainder} />
      ) : null}

      {rulesCategory ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>{rulesCategory.label} rules</Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            A makeup can replace the lowest test, capped at 85%.
          </Text>
          <TextField
            label="Drop lowest N (0–3)"
            keyboardType="numeric"
            value={String(rulesCategory.rules.drop_lowest_n ?? 0)}
            onChangeText={(text) => {
              const n = Math.max(0, Math.min(3, Number(text) || 0));
              patchCategory(rulesCategory.key, {
                rules: { ...rulesCategory.rules, drop_lowest_n: n },
              });
            }}
          />
          <ChipRow>
            <Chip
              label="Replace lowest with makeup"
              selected={Boolean(rulesCategory.rules.replace_lowest_with_makeup?.enabled)}
              onPress={() =>
                patchCategory(rulesCategory.key, {
                  rules: {
                    ...rulesCategory.rules,
                    replace_lowest_with_makeup: {
                      enabled: !rulesCategory.rules.replace_lowest_with_makeup?.enabled,
                      makeup_category_key: rulesCategory.key,
                      cap_percent: rulesCategory.rules.replace_lowest_with_makeup?.cap_percent ?? 85,
                      max_replacements: 1,
                    },
                  },
                })
              }
            />
          </ChipRow>
          {rulesCategory.rules.replace_lowest_with_makeup?.enabled ? (
            <TextField
              label="Cap %"
              keyboardType="numeric"
              value={String(rulesCategory.rules.replace_lowest_with_makeup?.cap_percent ?? 85)}
              onChangeText={(text) => {
                const n = Number(text);
                patchCategory(rulesCategory.key, {
                  rules: {
                    ...rulesCategory.rules,
                    replace_lowest_with_makeup: {
                      ...rulesCategory.rules.replace_lowest_with_makeup,
                      enabled: true,
                      makeup_category_key: rulesCategory.key,
                      cap_percent: Number.isFinite(n) ? n : 85,
                      max_replacements: 1,
                    },
                  },
                });
              }}
            />
          ) : null}
          <GhostButton align="left" label="Close rules" onPress={() => setEditingRulesKey(null)} />
        </Card>
      ) : null}

      <SectionHeader label="Terms" />
      <Text style={[type.meta, { color: colors.mute }]}>
        Year composite weighting comes later. v1 filters by term; weights are category weights inside the term.
      </Text>
      <ChipRow>
        {(
          [
            ['quarters', 'Quarters'],
            ['semesters', 'Semesters'],
            ['year', 'Year'],
            ['custom', 'Custom'],
          ] as const
        ).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={termStructure === key}
            onPress={() => setTermStructure(key)}
          />
        ))}
      </ChipRow>
      <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>Active term (optional)</Text>
      <ChipRow>
        {GRADE_TERMS.map((term) => (
          <Chip
            key={term.key}
            label={term.label}
            selected={activeTerm === term.key}
            onPress={() => setActiveTerm(activeTerm === term.key ? null : term.key)}
          />
        ))}
      </ChipRow>

      <SectionHeader label="Class rules" />
      <Text style={[type.meta, { color: colors.mute }]}>
        These apply across categories. Category-specific drop/makeup lives on each type.
      </Text>
      <ChipRow>
        <Chip
          label={policies.missing_as_zero ? 'Missing as zero: Yes' : 'Missing as zero: No'}
          selected={Boolean(policies.missing_as_zero)}
          onPress={() => {
            if (!policies.missing_as_zero) setConfirm({ kind: 'missing_zero' });
            else setPolicies((p) => ({ ...p, missing_as_zero: false }));
          }}
        />
        <Chip
          label={policies.rounding === 'none' ? 'Rounding: None' : 'Rounding: Nearest whole'}
          selected={policies.rounding !== 'none'}
          onPress={() =>
            setPolicies((p) => ({
              ...p,
              rounding: p.rounding === 'none' ? 'nearest_whole' : 'none',
            }))
          }
        />
        <Chip
          label={policies.publish_to_family === false ? 'Families: hidden' : 'Families: visible'}
          selected={policies.publish_to_family !== false}
          onPress={() => setPolicies((p) => ({ ...p, publish_to_family: p.publish_to_family === false }))}
        />
        <Chip
          label={policies.extra_credit_allowed ? 'Extra credit: Yes' : 'Extra credit: No'}
          selected={Boolean(policies.extra_credit_allowed)}
          onPress={() => setPolicies((p) => ({ ...p, extra_credit_allowed: !p.extra_credit_allowed }))}
        />
      </ChipRow>
      <TextField
        label="Score floor % (optional)"
        keyboardType="numeric"
        value={policies.min_floor_percent == null ? '' : String(policies.min_floor_percent)}
        onChangeText={(text) => {
          const trimmed = text.trim();
          setPolicies((p) => ({
            ...p,
            min_floor_percent: trimmed === '' ? null : Number(trimmed),
          }));
        }}
      />

      <SectionHeader label="Import" />
      {cameraOpen ? (
        <WebCameraCapture
          onCapture={(uri, mimeType) => {
            setCameraOpen(false);
            void parsePhoto(uri, mimeType);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      ) : (
        <View style={styles.row}>
          <GhostButton align="left" label="Import from photo" onPress={() => void onPickPhoto(true)} />
          <GhostButton align="left" label="Choose photo" onPress={() => void onPickPhoto(false)} />
        </View>
      )}

      <View style={styles.actions}>
        {syllabusStatus === 'published' ? (
          <Text style={[type.meta, { color: colors.mute }]}>
            Live weights update only when you publish changes (sum must be 100%).
          </Text>
        ) : (
          <SecondaryButton label="Save draft" onPress={() => void onSaveDraft()} disabled={busy} />
        )}
        <PrimaryButton
          label={syllabusStatus === 'published' ? 'Publish changes' : 'Publish'}
          onPress={onPublishPress}
          disabled={busy || !canPublish}
        />
        {syllabusStatus === 'published' ? (
          <GhostButton align="left" label="Unpublish" onPress={() => setConfirm({ kind: 'unpublish' })} />
        ) : null}
        <GhostButton align="left" label="Back to roster" onPress={() => router.replace(`/class/${id}/setup`)} />
      </View>

      {busy ? <WorkingLine /> : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <ConfirmSheet
        visible={Boolean(confirm)}
        title={
          confirm?.kind === 'publish' || confirm?.kind === 'live_edit'
            ? `Publish syllabus for ${klass?.name ?? 'this class'}?`
            : confirm?.kind === 'unpublish'
              ? 'Unpublish syllabus?'
              : confirm?.kind === 'discard_ask'
                ? 'Discard Ask draft?'
                : confirm?.kind === 'missing_zero'
                  ? 'Count missing as zero?'
                  : ''
        }
        body={
          confirm?.kind === 'publish' || confirm?.kind === 'live_edit'
            ? `Category weights will drive the class average. Families ${
                policies.publish_to_family === false ? 'will not' : 'will'
              } see how this class grades. This does not change any student’s approved scores — only how averages are calculated.${
                confirm?.kind === 'live_edit'
                  ? ' Changing weights recalculates averages for everyone using the new weights.'
                  : ''
              }`
            : confirm?.kind === 'unpublish'
              ? 'Averages stop using these weights. Family “how grades work” hides. Approved scores stay.'
              : confirm?.kind === 'discard_ask'
                ? 'Clears the Ask draft only. A published syllabus stays intact.'
                : confirm?.kind === 'missing_zero'
                  ? 'Missing work that is due will count as 0 in the type average. Work that is not due yet still does not count.'
                  : ''
        }
        confirmLabel={
          confirm?.kind === 'unpublish'
            ? 'Unpublish'
            : confirm?.kind === 'discard_ask'
              ? 'Discard'
              : confirm?.kind === 'missing_zero'
                ? 'Enable'
                : 'Publish'
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === 'publish' || confirm?.kind === 'live_edit') void doPublish();
          else if (confirm?.kind === 'unpublish') {
            void (async () => {
              if (!id) return;
              setBusy(true);
              try {
                await unpublishClassSyllabus(id, rowVersion);
                setConfirm(null);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not unpublish');
              } finally {
                setBusy(false);
              }
            })();
          } else if (confirm?.kind === 'discard_ask') {
            void (async () => {
              if (!id) return;
              setBusy(true);
              try {
                await discardSyllabusAskDraft(id);
                setConfirm(null);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not discard draft');
              } finally {
                setBusy(false);
              }
            })();
          } else if (confirm?.kind === 'missing_zero') {
            setPolicies((p) => ({ ...p, missing_as_zero: true }));
            setConfirm(null);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 16,
    marginBottom: 24,
  },
  row: {
    gap: 8,
  },
  error: {
    ...type.meta,
    marginTop: 8,
  },
});
