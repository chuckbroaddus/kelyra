/**
 * Class syllabus entry → GB-08 T1–T8 wizard.
 * Photo import (parse-class-syllabus / ask_draft) still applies into wizard fields.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { SyllabusWizard } from '@/components/syllabus/SyllabusWizard';
import { IngestProposalReview } from '@/components/ingest/IngestProposalReview';
import { StartFromDocumentButton } from '@/components/ingest/StartFromDocumentButton';
import {
  applyAskImport,
  draftFromBundle,
  toEditorInput,
  type SyllabusWizardDraft,
} from '@/components/syllabus/wizardModel';
import { type } from '@/constants/theme';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { invokeAi } from '@/lib/ai/invoke';
import { invokeIngestGradingDoc } from '@/lib/ingest/invokeIngest';
import { applyProposalToSyllabusDraft } from '@/lib/ingest/pathMapping';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { uploadTeacherAsset, signedUrlForAsset } from '@/lib/media/upload';
import { pickNormalizedPhoto, webCameraNeeded } from '@/lib/media/pickPhoto';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import {
  applyAskDraftToEditor,
  discardSyllabusAskDraft,
  getClassSyllabus,
  publishClassSyllabus,
  saveClassSyllabusDraft,
  unpublishClassSyllabus,
  upsertSyllabusAskDraft,
} from '@/lib/syllabus/api';
import { loadLatestPublished, type SyllabusLocks } from '@/lib/school/gradingPolicy';
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
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ingestProposal, setIngestProposal] = useState<IngestProposal | null>(null);
  const [ingestCamera, setIngestCamera] = useState(false);

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
        rollup_preset?: string | null;
      } | null = null;
      const schoolId = profile?.school_id ?? null;
      if (schoolId) {
        try {
          const pub = await loadLatestPublished(schoolId);
          const payload = (pub?.payload ?? null) as
            | { locks?: SyllabusLocks; rollup_preset?: string | null }
            | null;
          if (payload) {
            schoolPolicy = {
              locks: payload.locks ?? null,
              rollup_preset: payload.rollup_preset ?? null,
            };
          }
        } catch {
          // optional school defaults
        }
      }
      setDraft(
        draftFromBundle({
          classId: id,
          syllabus: bundle.syllabus,
          categories: bundle.categories,
          schoolPolicy,
        }),
      );
      setAskDraft(bundle.syllabus?.ask_draft ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load syllabus');
    } finally {
      setLoading(false);
    }
  }, [id, teacher, setActiveClassId, profile?.school_id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSaveDraft = async () => {
    if (!id || !draft) return;
    if (draft.syllabus_status === 'published') {
      setError('This syllabus is published. Use Publish to update live weights.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveClassSyllabusDraft(id, toEditorInput(draft));
      setStatus('Draft saved — not used in averages yet.');
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
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
  };

  const onPublishPress = () => {
    if (!draft) return;
    if (draft.syllabus_status === 'published') setConfirm({ kind: 'live_edit' });
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
      const parsed = await invokeAi<Record<string, unknown>>('parse-class-syllabus', {
        classId: id,
        imageUrl,
        mimeType,
      });
      if (parsed.error) throw new Error(String(parsed.error));
      await upsertSyllabusAskDraft(id, { ...parsed, schema_version: 1, class_id: id }, asset.id);
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

  /** GB-11 v2 document ingest → IngestProposal review (does not replace parse-class-syllabus). */
  const runIngestDoc = async (uri: string, mimeType: string) => {
    if (!id || !teacher) return;
    setBusy(true);
    setError(null);
    setStatus('Reading document into proposal…');
    try {
      const asset = await uploadTeacherAsset({
        teacherId: teacher.id,
        kind: 'photo',
        uri,
        mimeType,
      });
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) throw new Error('Could not open the uploaded document.');
      const { proposal } = await invokeIngestGradingDoc({
        kind: 'syllabus',
        class_id: id,
        storage_paths: [asset.storage_path],
        image_urls: [imageUrl],
        source_id: asset.id,
      });
      setIngestProposal(proposal);
      setStatus('Proposal ready — review fields, then apply into the wizard.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document');
    } finally {
      setBusy(false);
    }
  };

  const onStartFromDocument = async () => {
    if (webCameraNeeded(true)) {
      setIngestCamera(true);
      return;
    }
    try {
      const photo = await pickNormalizedPhoto(false);
      if (!photo) return;
      await runIngestDoc(photo.uri, photo.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open document');
    }
  };

  const applyIngestFields = (accepted: IngestField[]) => {
    if (!draft || !ingestProposal) return;
    const filtered: IngestProposal = { ...ingestProposal, fields: accepted };
    setDraft(applyProposalToSyllabusDraft(draft, filtered));
    setIngestProposal(null);
    setStatus('Proposal applied into wizard. Review before publish.');
  };

  const applyAsk = () => {
    if (!askDraft || !draft) return;
    const applied = applyAskDraftToEditor(askDraft);
    if (applied.documentKind === 'rubric') {
      setError('This looks like a scoring rubric. Rubric levels are not category weights.');
      return;
    }
    if (applied.documentKind === 'mixed') {
      setStatus('Mixed document — category weights applied; rubric criteria ignored.');
    }
    if (!applied.categories.length) {
      setError('Could not read a grading policy from that photo. Enter weights manually.');
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
        ? 'Draft'
        : 'Not set';

  return (
    <Screen keyboard pageChromeHosted>
      <View style={[styles.titleHeader, styles.titleHeaderFirst, { backgroundColor: colors.bg }]}>
        <Text style={[type.section, styles.titleHeaderLabel, { color: colors.mute }]} numberOfLines={1}>
          Grading Syllabus
        </Text>
      </View>
      <Card>
        <Text style={[type.meta, { color: colors.mute }]}>Status: {statusLabel}</Text>
        <Text style={[type.body, { color: colors.ink, marginTop: 4 }]}>
          Guided setup T1–T8. Live preview updates as you choose. Nothing is a grade until you publish.
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
          <PrimaryButton label="Apply checked into wizard" onPress={applyAsk} />
          <GhostButton align="left" label="Discard draft" onPress={() => setConfirm({ kind: 'discard_ask' })} />
        </Card>
      ) : null}

      {ingestProposal ? (
        <IngestProposalReview
          proposal={ingestProposal}
          sourceLabel="document"
          onApply={applyIngestFields}
          onDiscard={() => {
            setIngestProposal(null);
            setStatus('Proposal discarded. Published syllabus unchanged.');
          }}
        />
      ) : null}

      {ingestCamera ? (
        <WebCameraCapture
          onCapture={(uri, mimeType) => {
            setIngestCamera(false);
            void runIngestDoc(uri, mimeType);
          }}
          onCancel={() => setIngestCamera(false)}
        />
      ) : null}

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
          <GhostButton
            align="left"
            label="Answer a few questions instead"
            onPress={() => id && router.push(`/class/${id}/syllabus-interview` as never)}
          />
          <StartFromDocumentButton onPress={() => void onStartFromDocument()} disabled={busy} />
          <GhostButton align="left" label="Import from photo" onPress={() => void onPickPhoto(true)} />
          <GhostButton align="left" label="Choose photo" onPress={() => void onPickPhoto(false)} />
        </View>
      )}

      <SyllabusWizard
        draft={draft}
        onChange={setDraft}
        busy={busy}
        onSaveDraft={() => void onSaveDraft()}
        onPublish={onPublishPress}
        footer={
          <View style={styles.actions}>
            {draft.syllabus_status === 'published' ? (
              <GhostButton align="left" label="Unpublish" onPress={() => setConfirm({ kind: 'unpublish' })} />
            ) : null}
            <GhostButton
              align="left"
              label="Back to settings"
              onPress={() => router.replace(`/class/${id}/settings`)}
            />
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
                ? 'Discard Ask draft?'
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
              ? 'Averages stop using these weights. Family “how grades work” hides. Approved scores stay.'
              : confirm?.kind === 'discard_ask'
                ? 'Clears the Ask draft only. A published syllabus stays intact.'
                : ''
        }
        confirmLabel={
          confirm?.kind === 'unpublish' ? 'Unpublish' : confirm?.kind === 'discard_ask' ? 'Discard' : 'Publish'
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
                setError(err instanceof Error ? err.message : 'Could not discard draft');
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
  titleHeader: {
    marginTop: 24,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    zIndex: 4,
    ...Platform.select({
      web: { position: 'sticky', top: 0 },
      default: {},
    }),
  },
  titleHeaderFirst: { marginTop: 0 },
  titleHeaderLabel: { flexShrink: 1, textTransform: 'none' },
  actions: { gap: 10, marginTop: 8, marginBottom: 24 },
  row: { gap: 8, marginBottom: 8 },
  error: { ...type.meta, marginTop: 8 },
});

