import { useEffect } from 'react';

import { useChrome, type HeaderChrome } from '@/lib/chrome/ChromeProvider';

/** Lesson player owns swipe. Stack pop gesture stays off on this screen only. */
export const LESSON_PLAYER_STACK_OPTIONS = {
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
} as const;

const ASSIGN: HeaderChrome = { hideBackOnNative: true, hideMenu: true };
const PLAYER: HeaderChrome = {
  hideBack: true,
  hideBackOnNative: true,
  hideMenu: true,
  hideSearch: true,
  hideMail: true,
  hideCapture: true,
  showClose: true,
};

export function useAssignmentHeaderChrome() {
  useHeaderChrome(ASSIGN);
}

export function useLessonPlayerChrome() {
  const { setForceHidden } = useChrome();
  useHeaderChrome(PLAYER);
  useEffect(() => {
    setForceHidden(true);
    return () => setForceHidden(false);
  }, [setForceHidden]);
}

function useHeaderChrome(spec: HeaderChrome) {
  const { setHeaderChrome } = useChrome();
  const hideBack = Boolean(spec.hideBack);
  const hideBackOnNative = Boolean(spec.hideBackOnNative);
  const hideMenu = Boolean(spec.hideMenu);
  const hideSearch = Boolean(spec.hideSearch);
  const hideMail = Boolean(spec.hideMail);
  const hideCapture = Boolean(spec.hideCapture);
  const showClose = Boolean(spec.showClose);
  useEffect(() => {
    setHeaderChrome({ hideBack, hideBackOnNative, hideMenu, hideSearch, hideMail, hideCapture, showClose });
    return () => setHeaderChrome(null);
  }, [hideBack, hideBackOnNative, hideCapture, hideMail, hideMenu, hideSearch, setHeaderChrome, showClose]);
}
