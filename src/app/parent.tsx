import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { firstName } from '@/lib/format';
import {
  formatPracticeStatus,
  loadParentProgress,
  type ParentChildProgress,
  type ParentProgress,
} from '@/lib/parents/api';
import {
  listParentTokens,
  parentFingerprint,
  rememberParentToken,
  touchParentLastSeen,
} from '@/lib/parents/session';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const { t } = useLocalSearchParams<{ t?: string }>();
  const [progress, setProgress] = useState<ParentProgress | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void touchParentLastSeen();
      chrome.refreshChrome();
      if (!t) {
        void listParentTokens().then((tokens) => {
          if (tokens[0]) {
            void loadParentProgress(tokens[0].token).then((next) => {
              setProgress(next);
              setActiveChildId(next?.children[0]?.student_id ?? null);
            });
            return;
          }
          setStatus('This page needs an invite link from the teacher.');
        });
        return;
      }
      void loadParentProgress(t)
        .then(async (next) => {
          setProgress(next);
          if (!next) {
            setStatus('This invite is not valid.');
            return;
          }
          setActiveChildId(next.children[0]?.student_id ?? null);
          const first = next.children[0];
          await rememberParentToken({
            token: t,
            displayName: first?.preferred_name || first?.display_name || next.parentName,
            className: first?.class_name ?? '',
            fingerprint: parentFingerprint({
              sentence: first?.parent_sentence ?? null,
              practiceStatus: first?.practice_status ?? null,
              focusLabel: first?.focus_label ?? null,
            }),
          });
          chrome.refreshChrome();
        })
        .catch((err) => {
          setStatus(err instanceof Error ? err.message : 'Could not load progress');
        });
    }, [t, chrome]),
  );

  if (!progress) {
    return (
      <Screen centered maxWidth={480}>
        <Text style={[type.title, { color: colors.ink }]}>Progress</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>{status ?? 'Loading…'}</Text>
      </Screen>
    );
  }

  const child =
    progress.children.find((item) => item.student_id === activeChildId) ?? progress.children[0] ?? null;

  return (
    <Screen centered maxWidth={480}>
      <Avatar name={progress.parentName} photoUrl={progress.parentPhotoUrl} size={72} />
      <MarqueeText
        text={progress.parentName}
        align="center"
        accessible
        fadeColor={colors.bg}
        style={[styles.parentName, { color: colors.ink }]}
      />
      {progress.children.length > 1 ? (
        <AvatarTray
          people={progress.children.map((item) => ({
            id: item.student_id,
            name: item.preferred_name || item.display_name,
            photoUrl: item.photoUrl,
          }))}
          onPress={(person) => setActiveChildId(person.id)}
        />
      ) : null}
      {child ? <ChildCard child={child} /> : (
        <Text style={[styles.empty, { color: colors.mute }]}>No children are linked to this invite.</Text>
      )}
      {progress.phone || progress.email || progress.address || progress.preferredContact ? (
        <View style={styles.block}>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Your contact</Text>
          {progress.relationship ? <Text style={[type.meta, { color: colors.mute }]}>{progress.relationship}</Text> : null}
          {progress.phone ? <Text style={[type.body, { color: colors.ink }]}>{progress.phone}</Text> : null}
          {progress.email ? <Text style={[type.body, { color: colors.ink }]}>{progress.email}</Text> : null}
          {progress.address ? <Text style={[type.body, { color: colors.ink }]}>{progress.address}</Text> : null}
          {progress.preferredContact ? (
            <Text style={[type.meta, { color: colors.mute }]}>Prefers {progress.preferredContact}</Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function ChildCard({ child }: { child: ParentChildProgress }) {
  const { colors } = useTheme();
  const shownName = child.preferred_name || child.display_name;
  const childFirst = firstName(shownName);
  const practice = formatPracticeStatus(child.practice_status);
  const empty = !child.focus_label && !child.parent_sentence && !child.practice_status;
  const practiceColor =
    practice === 'Done' ? colors.good : practice === 'Assigned' ? colors.warn : colors.mute;

  return (
    <View style={styles.child}>
      <Avatar name={shownName} photoUrl={child.photoUrl} size={56} />
      <Text style={[styles.kicker, { color: colors.mute }]} numberOfLines={1}>
        {child.class_name}
      </Text>
      <MarqueeText
        text={shownName}
        align="center"
        accessible
        fadeColor={colors.bg}
        style={[styles.name, { color: colors.ink }]}
      />
      {child.birthday_md ? (
        <Text style={[type.meta, { color: colors.mute, textAlign: 'center' }]}>{child.birthday_md}</Text>
      ) : null}
      {empty ? (
        <Text style={[styles.empty, { color: colors.mute }]}>Your teacher has not shared an update yet.</Text>
      ) : (
        <>
          <Text style={[styles.leadCenter, { color: colors.mute }]}>This week {childFirst} is working on</Text>
          <Text style={[type.title, { textAlign: 'center', color: colors.ink }]}>
            {child.focus_label ?? 'a skill the teacher will name soon'}
          </Text>
          <View style={styles.block}>
            <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Practice</Text>
            <Text style={[type.body, { fontWeight: '600', color: practiceColor }]}>{practice}</Text>
          </View>
          {child.parent_sentence ? (
            <View style={styles.block}>
              <Card>
                <Text style={[type.meta, { color: colors.mute }]}>From the teacher</Text>
                <Text style={[type.body, { color: colors.ink }]}>{child.parent_sentence}</Text>
              </Card>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  parentName: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  child: {
    width: '100%',
    alignItems: 'center',
  },
  kicker: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 12,
  },
  name: {
    ...type.display,
    textAlign: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  empty: {
    ...type.body,
    textAlign: 'center',
    marginTop: 16,
  },
  lead: {
    ...type.body,
    marginTop: 8,
    textAlign: 'center',
  },
  leadCenter: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 24,
  },
  block: {
    marginTop: 24,
    width: '100%',
    gap: 8,
  },
});
