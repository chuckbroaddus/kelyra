import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClassAvatarRow } from '@/components/ui/ClassAvatarRow';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { FeedIconRow } from '@/components/ui/FeedIconPicker';
import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass } from '@/lib/classes/api';
import { setClassFeedIcon } from '@/lib/feeds/api';
import { asFeedIcon, DEFAULT_CLASS_FEED_ICON } from '@/lib/feeds/icons';
import { isOfficeRole } from '@/lib/school/roles';
import { activeWeightSum, getClassSyllabus, type ClassSyllabusDraft } from '@/lib/syllabus/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ClassSettingsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const office = isOfficeRole(profile);
  const chrome = useChrome();
  usePushedTitle(chrome.className ?? 'Class');
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syllabusMeta, setSyllabusMeta] = useState<{
    status: ClassSyllabusDraft['status'] | 'none';
    categoryCount: number;
    sum: number;
    publishToFamily: boolean;
    hasAskDraft: boolean;
  }>({ status: 'none', categoryCount: 0, sum: 0, publishToFamily: true, hasAskDraft: false });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      if (!office) {
        const syllabus = await getClassSyllabus(id).catch(() => null);
        if (!syllabus?.exists || !syllabus.syllabus) {
          setSyllabusMeta({
            status: 'none',
            categoryCount: 0,
            sum: 0,
            publishToFamily: true,
            hasAskDraft: false,
          });
        } else {
          setSyllabusMeta({
            status: syllabus.syllabus.status,
            categoryCount: syllabus.categories.filter((c) => c.active).length,
            sum: activeWeightSum(syllabus.categories),
            publishToFamily: syllabus.syllabus.publish_to_family !== false,
            hasAskDraft: Boolean(syllabus.syllabus.ask_draft),
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load class settings');
    }
  }, [id, office]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen keyboard collapse={id ? <ClassTabs classId={id} /> : null}>
      {klass ? (
        <>
          <ClassAvatarRow klass={klass} onChange={setKlass} onError={setError} />
          <FeedIconRow
            value={asFeedIcon(klass.feed_icon, DEFAULT_CLASS_FEED_ICON)}
            onPick={async (icon) => {
              try {
                await setClassFeedIcon(klass.id, icon);
                setKlass({ ...klass, feed_icon: icon });
                chrome.refreshChrome();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save the feed icon');
              }
            }}
          />
        </>
      ) : null}
      {!office && id ? (
        <Card>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
            How this class grades
          </Text>
          <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
            {syllabusMeta.hasAskDraft
              ? 'Ask draft waiting for review.'
              : syllabusMeta.status === 'none'
                ? 'Set categories and weights for the final average.'
                : syllabusMeta.status === 'draft'
                  ? 'Draft — not used in averages yet.'
                  : `${syllabusMeta.categoryCount} categories · weights sum ${Math.round(syllabusMeta.sum * 10) / 10}%${
                      syllabusMeta.publishToFamily ? ' · Visible to families' : ''
                    }`}
          </Text>
          <PrimaryButton
            label={
              syllabusMeta.hasAskDraft
                ? 'Review Ask draft'
                : syllabusMeta.status === 'none'
                  ? 'Set up syllabus'
                  : 'Edit syllabus'
            }
            onPress={() => router.push(`/class/${id}/syllabus`)}
          />
        </Card>
      ) : null}
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}
