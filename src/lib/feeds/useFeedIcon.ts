import { useEffect, useState } from 'react';

import { getClass } from '@/lib/classes/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { listMyFeeds } from '@/lib/feeds/api';
import {
  asFeedIcon,
  DEFAULT_CLASS_FEED_ICON,
  DEFAULT_SCHOOL_FEED_ICON,
  type FeedIconName,
} from '@/lib/feeds/icons';

export function useClassFeedIcon(classId: string | null | undefined): FeedIconName {
  const chrome = useChrome();
  const listed = classId ? chrome.classes.find((row) => row.id === classId)?.feed_icon : null;
  const [icon, setIcon] = useState<FeedIconName>(() => asFeedIcon(listed, DEFAULT_CLASS_FEED_ICON));

  useEffect(() => {
    if (!classId) {
      setIcon(DEFAULT_CLASS_FEED_ICON);
      return;
    }
    const fromChrome = chrome.classes.find((row) => row.id === classId)?.feed_icon;
    if (fromChrome) {
      setIcon(asFeedIcon(fromChrome, DEFAULT_CLASS_FEED_ICON));
      return;
    }
    let live = true;
    void getClass(classId)
      .then((klass) => {
        if (live) setIcon(asFeedIcon(klass.feed_icon, DEFAULT_CLASS_FEED_ICON));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [classId, chrome.classes]);

  return icon;
}

export function useSchoolFeedIcon(): FeedIconName {
  const { profile } = useAuth();
  const [icon, setIcon] = useState<FeedIconName>(DEFAULT_SCHOOL_FEED_ICON);

  useEffect(() => {
    let live = true;
    void listMyFeeds(profile)
      .then((feeds) => {
        const school = feeds.find((item) => item.kind === 'school');
        if (live && school) setIcon(school.icon);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [profile]);

  return icon;
}
