/**
 * Class syllabus entry → GB-08 T1–T8 wizard.
 * Photo import (parse-class-syllabus / ask_draft) still applies into wizard fields.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { SyllabusWizard, wizardPersonTabs } from '@/components/syllabus/SyllabusWizard';
import { IngestProposalReview } from '@/components/ingest/IngestProposalReview';
import {
  applyAskImport,
  canFinishReview,
  draftFromBundle,
  resolveWizardStep,
  setWizardStep,
  toEditorInput,
  type SyllabusWizardDraft,
  type WizardStepId,
} from '@/components/syllabus/wizardModel';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { type } from '@/constants/theme';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  maxPagesCopy,
  readingStatusForPages,
  uploadGradingDocPages,
} from '@/lib/ingest/gradingDocPages';
import { invokeIngestGradingDoc } from '@/lib/ingest/invokeIngest';
import { applyProposalToSyllabusDraft } from '@/lib/ingest/pathMapping';
import { applyInterviewToSyllabusDraft, takeInterviewHandoff } from '@/lib/interview';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { useWebIngestFixtureHook } from '@/lib/ingest/webIngestFixtureHook';
import { takeSyllabusIngestHandoff } from '@/lib/syllabus/ingestHandoff';
import {
  applyAskDraftToEditor,
  discardSyllabusAskDraft,
  getClassSyllabus,
  publishClassSyllabus,
  saveClassSyllabusDraft,
  unpublishClassSyllabus,
} from '@/lib/syllabus/api';
import {
  buildSchoolLockPolicy,
} from '@/lib/syllabus/locks';
import { applyCopyToDraftBag, copySyllabusFromTemplate } from '@/lib/syllabus/copy';
import { takeSyllabusTemplateHandoff } from '@/lib/syllabus/templateHandoff';
import { listSchoolSyllabusTemplates } from '@/lib/syllabus/templates';
import {
  loadLatestPublished,
  type SyllabusLockReasons,
  type SyllabusLocks,
} from '@/lib/school/gradingPolicy';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { ClassRow } from '@/lib/supabase/types';

type ConfirmKind =
  | { kind: 'publish' }
  | { kind: 'unpublish' }
  | { kind: 'discard_ask' }
  | { kind: 'live_edit' }
  | null;

export default function SyllabusScreen() {
  const { colors } = useTheme();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const { teacher, setActiveClassId, profile } = useAuth();
  const chrome = useChrome();
  usePushedTitle(chrome.className ?? 'Syllabus');

  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState<SyllabusWizardDraft | null>(null);
  const [askDraft, setAskDraft] = useState<Record<string, unknown> | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [ingestProposal, setIngestProposal] = useState<IngestProposal | null>(null);
  // Interview hand-off is one-shot; keep it so a focus reload before Save does not drop the answers.
  const interviewRef = useRef<ReturnType<typeof takeInterviewHandoff>>(null);

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    setLoading(true);
    setError(null);
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      await setActiveClass(teacher.id, id);
      setActiveClassId(id);
      const bundle = await getClassSyllabus(id);
      let schoolPolicy: {
        locks?: Partial<SyllabusLocks> | null;
        lock_reasons?: Partial<SyllabusLockReasons> | null;
        rollup_preset?: string | null;
      } | null = null;
      const schoolId = profile?.school_id ?? null;
      if (schoolId) {
        try {
          const pub = await loadLatestPublished(schoolId);
          const payload = (pub?.payload ?? null) as
            | {
                locks?: SyllabusLocks;
                lock_reasons?: SyllabusLockReasons;
                rollup_preset?: string | null;
              }
            | null;
          if (payload) {
            schoolPolicy = {
              locks: payload.locks ?? null,
              lock_reasons: payload.lock_reasons ?? null,
              rollup_preset: payload.rollup_preset ?? null,
            };
          }
        } catch {
          // optional school defaults
        }
      }
      const loaded = draftFromBundle({
        classId: id,
        syllabus: bundle.syllabus,
        categories: bundle.categories,
        schoolPolicy,
      });
      // GB-12 interview hand-off: same mapper as document ingest, then review + Save/Publish here.
      if (from === 'interview' && !interviewRef.current) interviewRef.current = takeInterviewHandoff('syllabus', id);
      const interview = from === 'interview' ? interviewRef.current : null;
      // School template picker handoff (same runtime) — apply onto the loaded bag.
      const templateKey = takeSyllabusTemplateHandoff(id);
      let nextDraft = loaded;
      let nextStatus: string | null = null;
      if (interview) {
        nextDraft = setWizardStep(applyInterviewToSyllabusDraft(loaded, interview), 'review');
        nextStatus = 'Your answers are filled in below. Check them, then Save draft or Publish.';
      } else if (templateKey) {
        const applied = applyTemplateToDraft(loaded, templateKey);
        if (applied) {
          nextDraft = applied.draft;
          nextStatus = applied.status;
        }
      }
      setDraft(nextDraft);
      if (nextStatus) setStatus(nextStatus);
      setAskDraft(bundle.syllabus?.ask_draft ?? null);
      // Capture syllabus Import multipage handoff (same runtime).
      const fromCapture = takeSyllabusIngestHandoff(id);
      if (fromCapture) {
        setIngestProposal(fromCapture);
        setStatus('Done reading. Check each setting we found, then tap Use these settings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load syllabus');
    } finally {
      setLoading(false);
    }
  }, [id, teacher, setActiveClassId, profile?.school_id, from]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSaveDraft = async () => {
    if (!id || !draft) return;
    if (draft.syllabus_status === 'published') {
      setError('This syllabus is already published. Tap Publish to save your changes.');
      return;
    }
    // §11.15: weighted engines block Save until active weights = 100%.
    if (!canFinishReview(draft)) {
      setError('Your category weights need to add up to 100% before you can save.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveClassSyllabusDraft(id, toEditorInput(draft));
      setStatus('Draft saved. It won’t change any grades until you publish.');
      interviewRef.current = null;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft');
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async () => {
    if (!id || !draft) return;
    setBusy(true);
    setError(null);
    try {
      await publishClassSyllabus(id, draft.row_version, toEditorInput(draft));
      setStatus('Syllabus published.');
      interviewRef.current = null;
      setConfirm(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not publish';
      setError(
        /not counting the extra credit|besides extra credit/i.test(msg)
          ? 'Your regular category weights need to add up to 100% before you can publish. Extra credit is added on top. Tap Categories to change them.'
          : /active weights must sum to 100/i.test(msg)
            ? 'Your category weights need to add up to 100% before you can publish. Tap Categories to change them.'
            : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const onPublishPress = () => {
    if (!draft) return;
    if (draft.syllabus_status === 'published') setConfirm({ kind: 'live_edit' });
    else setConfirm({ kind: 'publish' });
  };

  /** GB-11 document ingest → IngestProposal review (fixture + Capture multipage Import). */
  const runIngestDoc = useCallback(async (pages: Array<{ uri: string; mimeType: string }>) => {
    if (!id || !teacher) return;
    if (!pages.length) return;
    setBusy(true);
    setError(null);
    setStatus(readingStatusForPages(pages.length));
    try {
      const uploaded = await uploadGradingDocPages({
        teacherId: teacher.id,
        pages,
      });
      if (uploaded.truncated) setStatus(maxPagesCopy());
      const { proposal } = await invokeIngestGradingDoc({
        kind: 'syllabus',
        class_id: id,
        storage_paths: uploaded.storage_paths,
        image_urls: uploaded.image_urls,
        source_id: uploaded.source_id,
      });
      setIngestProposal(proposal);
      setStatus('Done reading. Check each setting we found, then tap Use these settings.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document');
    } finally {
      setBusy(false);
    }
  }, [id, teacher]);

  useWebIngestFixtureHook('syllabus', runIngestDoc);

  const applyIngestFields = (accepted: IngestField[]) => {
    if (!draft || !ingestProposal) return;
    const filtered: IngestProposal = { ...ingestProposal, fields: accepted };
    setDraft(applyProposalToSyllabusDraft(draft, filtered));
    setIngestProposal(null);
    setStatus('Settings added. Look them over, then publish.');
  };

  const applyAsk = () => {
    if (!askDraft || !draft) return;
    const applied = applyAskDraftToEditor(askDraft);
    if (applied.documentKind === 'rubric') {
      setError('This looks like a rubric for scoring one assignment, not a grading policy. Rubric levels can’t be used as category weights.');
      return;
    }
    if (applied.documentKind === 'mixed') {
      setStatus('This page has a grading policy and a rubric. We used the category weights and skipped the rubric.');
    }
    if (!applied.categories.length) {
      setError('We couldn’t find a grading policy in that photo. Please enter the weights yourself.');
      return;
    }
    setDraft(applyAskImport(draft, applied));
  };

  if (loading && !klass) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  if (!draft) {
    return (
      <Screen>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : <WorkingLine />}
      </Screen>
    );
  }

  const statusLabel =
    draft.syllabus_status === 'published'
      ? 'Published'
      : draft.syllabus_status === 'draft'
        ? 'Draft (not used for grades yet)'
        : 'Not set up yet';

  const step = resolveWizardStep(draft);
  const collapsing = (
    <PersonTabs
      tabs={wizardPersonTabs(draft)}
      value={step}
      compact
      onChange={(key) => setDraft(setWizardStep(draft, key as WizardStepId))}
    />
  );

  return (
    <Screen keyboard pageChromeHosted collapse={collapsing}>
      <Card>
        <Text style={[type.meta, { color: colors.mute }]}>Status: {statusLabel}</Text>
        <Text style={[type.body, { color: colors.ink, marginTop: 4 }]}>
          Step through each choice below. Nothing affects real grades until you publish.
        </Text>
      </Card>

      {askDraft ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>Settings read from your photo</Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            Check every line. Nothing changes until you publish.
          </Text>
          {String(askDraft.document_kind) === 'rubric' || String(askDraft.document_kind) === 'mixed' ? (
            <Text style={[type.meta, { color: colors.warn, marginTop: 6 }]}>
              This looks like a rubric (or part of one). Rubric levels can’t be used as category weights.
            </Text>
          ) : null}
          <PrimaryButton label="Use these settings" onPress={applyAsk} />
          <GhostButton align="left" label="Throw away" onPress={() => setConfirm({ kind: 'discard_ask' })} />
        </Card>
      ) : null}

      {ingestProposal ? (
        <IngestProposalReview
          proposal={ingestProposal}
          sourceLabel="your document"
          onApply={applyIngestFields}
          onDiscard={() => {
            setIngestProposal(null);
            setStatus('Thrown away. Your published syllabus did not change.');
          }}
        />
      ) : null}

      <View style={styles.importRow}>
        <View style={styles.importLead}>
          <GhostButton
            align="left"
            label="Answer a few questions instead"
            onPress={() => id && router.push(`/class/${id}/syllabus-interview` as never)}
          />
        </View>
        <View style={styles.iconPair}>
          <IconButton
            name="capture"
            size="lg"
            tone="brand"
            label="Import syllabus with Capture"
            disabled={busy || !id}
            onPress={() => {
              if (!id) return;
              router.push(`/capture?preset=syllabus&classId=${encodeURIComponent(id)}` as never);
            }}
          />
          <IconButton
            name="syllabusTemplate"
            size="lg"
            tone="brand"
            label="Start from a school template"
            disabled={busy || !id}
            onPress={() => {
              if (!id) return;
              router.push(`/class/${id}/syllabus-templates` as never);
            }}
          />
        </View>
      </View>

      <SyllabusWizard
        draft={draft}
        onChange={setDraft}
        busy={busy}
        onSaveDraft={() => void onSaveDraft()}
        onPublish={onPublishPress}
        tabsHostedOutside
        footer={
          <View style={styles.actions}>
            {draft.syllabus_status === 'published' ? (
              <GhostButton align="left" label="Unpublish" onPress={() => setConfirm({ kind: 'unpublish' })} />
            ) : null}
          </View>
        }
      />

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
                ? 'Throw away the settings read from your photo?'
                : ''
        }
        body={
          confirm?.kind === 'publish' || confirm?.kind === 'live_edit'
            ? `Category weights will drive the class average. Families ${
                draft.publish_to_family === false ? 'will not' : 'will'
              } see how this class grades. This does not change any student’s approved scores — only how averages are calculated.${
                confirm?.kind === 'live_edit'
                  ? ' Changing weights recalculates averages for everyone using the new weights.'
                  : ''
              }`
            : confirm?.kind === 'unpublish'
              ? 'Averages stop using these weights, and families no longer see how this class is graded. Approved scores stay.'
              : confirm?.kind === 'discard_ask'
                ? 'This only clears the settings read from your photo. Your published syllabus stays the same.'
                : ''
        }
        confirmLabel={
          confirm?.kind === 'unpublish' ? 'Unpublish' : confirm?.kind === 'discard_ask' ? 'Throw away' : 'Publish'
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === 'publish' || confirm?.kind === 'live_edit') void doPublish();
          else if (confirm?.kind === 'unpublish') {
            void (async () => {
              if (!id || !draft) return;
              setBusy(true);
              try {
                await unpublishClassSyllabus(id, draft.row_version);
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
                setError(err instanceof Error ? err.message : 'Could not throw away the photo settings');
              } finally {
                setBusy(false);
              }
            })();
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 8, marginBottom: 24 },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  importLead: { flexGrow: 1, flexShrink: 1, minWidth: 140 },
  iconPair: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  error: { ...type.meta, marginTop: 8 },
});

/** Apply a school template onto a wizard draft (respects school locks). */
function applyTemplateToDraft(
  draft: SyllabusWizardDraft,
  templateKey: string,
): { draft: SyllabusWizardDraft; status: string } | null {
  const policy = buildSchoolLockPolicy({
    locks: draft.locks,
    lock_reasons: draft.lock_reasons,
  });
  try {
    const copy = copySyllabusFromTemplate(templateKey, policy, {
      title: draft.title || undefined,
    });
    const bag = applyCopyToDraftBag(
      {
        engine: draft.engine,
        categories: draft.categories,
        late_rule: draft.late_rule,
        missing_rule: draft.missing_rule,
        floor: draft.floor,
        book_mode: draft.book_mode,
        extra_credit_method: draft.extra_credit_method,
        title: draft.title,
        rollup_preset: draft.rollup_preset,
        exam_weight: draft.exam_weight,
      },
      copy,
    );
    return {
      draft: {
        ...draft,
        engine: (bag.engine as typeof draft.engine) ?? draft.engine,
        categories: (bag.categories as typeof draft.categories) ?? draft.categories,
        late_rule: (bag.late_rule as typeof draft.late_rule) ?? draft.late_rule,
        missing_rule: (bag.missing_rule as typeof draft.missing_rule) ?? draft.missing_rule,
        floor: (bag.floor as number | null | undefined) ?? draft.floor,
        book_mode: (bag.book_mode as typeof draft.book_mode) ?? draft.book_mode,
        extra_credit_method:
          (bag.extra_credit_method as typeof draft.extra_credit_method) ?? draft.extra_credit_method,
        title: typeof bag.title === 'string' ? bag.title : draft.title,
        source: 'copied',
      },
      status: `Copied “${listSchoolSyllabusTemplates().find((t) => t.key === templateKey)?.name ?? templateKey}”. Settings your school controls were left as they are.`,
    };
  } catch {
    return null;
  }
}

