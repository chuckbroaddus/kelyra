import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarTray } from '@/components/ui/AvatarTray';
import { captureBadge, practiceBadge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { WorkRow } from '@/components/ui/WorkRow';
import { WorkShelf } from '@/components/ui/WorkShelf';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { listInbox, listThisWeek, listTurnedIn, type InboxItem, type TurnedInItem } from '@/lib/captures/api';
import { deleteCapture } from '@/lib/captures/delete';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { loadClassOverview } from '@/lib/classes/overview';
import { ClassTabs, hrefForClassTab } from '@/components/ui/ClassTabs';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { formatWhen } from '@/lib/format';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ClassHomeScreen() {
  const { colors } = useTheme();
  const layout = useLayout();
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { teacher } = useAuth();
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [turned, setTurned] = useState<TurnedInItem[]>([]);
  const [week, setWeek] = useState<{ captures: InboxItem[]; practice: TurnedInItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<InboxItem | null>(null);
  usePushedTitle(klass?.name ?? 'Class');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      try {
        setRoster(await listRoster(id));
      } catch (err) {
        setRoster([]);
        setError(err instanceof Error ? err.message : 'Could not load roster');
      }
      setLoaded(true);
      await loadClassOverview(id);
      setInbox(await listInbox(id));
      setTurned(await listTurnedIn(id));
      setWeek(await listThisWeek(id));
      await setActiveClass(teacher.id, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load class');
      setLoaded(true);
    }
  }, [id, teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const waiting = inbox.length + turned.length;
  const paneRaw = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const pane = paneRaw === 'week' || paneRaw === 'needs' ? paneRaw : 'today';
  const twoUp = layout.breakpoint === 'tablet';

  const openCapture = (item: InboxItem) => {
    if (item.student_id) router.push(`/class/${item.class_id}/student/${item.student_id}`);
    else router.push('/inbox');
  };

  return (
    <Screen>
      {id ? <ClassTabs classId={id} /> : null}
      {!loaded ? <WorkingLine /> : null}

      {pane !== 'needs' && roster.length > 0 ? (
        <AvatarTray
          people={roster.map((student) => ({
            id: student.id,
            name: student.display_name,
            photoUrl: student.photoUrl,
            hasPhoto: Boolean(student.photo_asset_id),
          }))}
          onPress={(person) => router.push(`/class/${id}/student/${person.id}`)}
        />
      ) : null}

      {pane === 'today' && inbox.length > 0 ? (
        <WorkShelf
          items={inbox.slice(0, 12).map((item) => ({
            id: item.id,
            title: item.matchedName ?? 'Needs a name',
            photoUrl: item.photoUrl,
            unknown: !item.student_id && !item.photoUrl,
            badge: captureBadge(item.status),
          }))}
          onPress={(item) => {
            const row = inbox.find((entry) => entry.id === item.id);
            if (row) openCapture(row);
          }}
        />
      ) : null}

      {pane === 'today' ? (
        <GhostButton
          align="left"
          label="Post to class"
          onPress={() => router.replace(hrefForClassTab(id, 'feed') as never)}
        />
      ) : null}

      {pane === 'today' && roster.length === 0 ? (
        <Card>
          <Text style={[styles.empty, { color: colors.mute }]}>No students yet.</Text>
          <GhostButton align="left" label="Add students" onPress={() => router.push(`/class/${id}/setup`)} />
        </Card>
      ) : null}

      {pane === 'week' ? (
        <View style={twoUp ? styles.two : styles.one}>
          {(week?.captures ?? []).map((item) => (
            <WorkRow
              key={item.id}
              title={item.matchedName ?? 'Needs a name'}
              status={item.transcript ?? undefined}
              meta={`${formatWhen(item.created_at)} · ${klass?.name ?? ''}`}
              photoUrl={item.photoUrl}
              badge={captureBadge(item.status)}
              onPress={() => openCapture(item)}
              pills={[
                {
                  key: 'open',
                  label: item.student_id ? 'Open' : 'Assign name',
                  kind: 'primary',
                  onPress: () => openCapture(item),
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  kind: 'ghost',
                  onPress: () => setPending(item),
                },
              ]}
              leading={[
                {
                  key: 'delete',
                  label: 'Delete',
                  tone: 'danger',
                  autoCommit: false,
                  onPress: () => setPending(item),
                },
              ]}
            />
          ))}
          {(week?.practice ?? []).map((item) => (
            <WorkRow
              key={item.id}
              title={item.studentName}
              status={`Turned in ${item.title.replace(/^Practice:\s*/i, '')}`}
              meta={formatWhen(item.submittedAt)}
              avatarName={item.studentName}
              badge={practiceBadge('submitted')}
              onPress={() => router.push(`/class/${id}/student/${item.studentId}`)}
              pills={[{ key: 'open', label: 'Review', kind: 'primary', onPress: () => router.push(`/class/${id}/student/${item.studentId}`) }]}
            />
          ))}
        </View>
      ) : null}

      {pane === 'needs' ? (
        <View style={styles.one}>
          {inbox.map((item) => (
            <WorkRow
              key={item.id}
              title={item.matchedName ?? 'Needs a name'}
              status={item.transcript ?? undefined}
              meta={formatWhen(item.created_at)}
              photoUrl={item.photoUrl}
              badge={captureBadge(item.status)}
              onPress={() => openCapture(item)}
              pills={[
                {
                  key: 'open',
                  label: item.student_id ? 'Review' : 'Assign name',
                  kind: 'primary',
                  onPress: () => openCapture(item),
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  kind: 'ghost',
                  onPress: () => setPending(item),
                },
              ]}
              leading={[
                {
                  key: 'delete',
                  label: 'Delete',
                  tone: 'danger',
                  autoCommit: false,
                  onPress: () => setPending(item),
                },
              ]}
            />
          ))}
          {turned.map((item) => (
            <WorkRow
              key={item.id}
              title={item.studentName}
              status={`Turned in ${item.title.replace(/^Practice:\s*/i, '')}`}
              meta={formatWhen(item.submittedAt)}
              avatarName={item.studentName}
              badge={practiceBadge('submitted')}
              onPress={() => router.push(`/class/${id}/student/${item.studentId}`)}
              pills={[{ key: 'open', label: 'Review', kind: 'primary', onPress: () => router.push(`/class/${id}/student/${item.studentId}`) }]}
            />
          ))}
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={2}
        detail={
          roster.length === 0
            ? 'Add a few names in Setup, then photograph today’s work.'
            : waiting
              ? 'Start with what needs you. Then open a student to approve.'
              : 'Nothing waiting. Photograph work, or open a student.'
        }
      />
      <ConfirmSheet
        visible={Boolean(pending)}
        title="Delete this work?"
        body="This removes the photo and is not a grade. This cannot be undone."
        confirmLabel="Delete"
        photoUrl={pending?.photoUrl}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setBusy(true);
          void deleteCapture(pending.id)
            .then(() => {
              setPending(null);
              return load();
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : 'Could not delete');
            })
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: type.body,
  one: {
    gap: 0,
  },
  two: {
    gap: 0,
  },
  error: {
    ...type.body,
    marginTop: 8,
  },
});
