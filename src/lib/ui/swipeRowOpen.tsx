import { useNavigation } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Gate = {
  reportOpen: (id: string, open: boolean) => void;
  anyOpen: boolean;
};

const SwipeRowOpenContext = createContext<Gate | null>(null);

/**
 * Tracks open swipe rows so stack back-gestures can yield while actions are revealed.
 * Mount once in AppShell; rows call `useSwipeRowOpen(open)`.
 */
export function SwipeRowOpenProvider({ children }: { children: ReactNode }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const reportOpen = useCallback((id: string, open: boolean) => {
    setOpenIds((prev) => {
      const has = prev.has(id);
      if (open === has) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const anyOpen = openIds.size > 0;
  const value = useMemo(() => ({ reportOpen, anyOpen }), [reportOpen, anyOpen]);

  return <SwipeRowOpenContext.Provider value={value}>{children}</SwipeRowOpenContext.Provider>;
}

export function useSwipeRowsAnyOpen(): boolean {
  return useContext(SwipeRowOpenContext)?.anyOpen ?? false;
}

/**
 * While any registered swipe row is open, disable the focused screen's interactive
 * pop / full-screen back gesture so an LTR close swipe is not stolen by React
 * Navigation. Chrome (header) back stays available. Restores when the last row closes.
 */
export function useSwipeRowOpen(open: boolean): void {
  const id = useId();
  const gate = useContext(SwipeRowOpenContext);
  const navigation = useNavigation();
  const held = useRef(false);

  useEffect(() => {
    gate?.reportOpen(id, open);
    return () => gate?.reportOpen(id, false);
  }, [gate, id, open]);

  useEffect(() => {
    const block = gate ? gate.anyOpen : open;

    if (block) {
      if (!held.current) {
        held.current = true;
        navigation.setOptions({
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        });
      }
      return;
    }

    if (held.current) {
      held.current = false;
      navigation.setOptions({
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      });
    }
  }, [gate, gate?.anyOpen, open, navigation]);

  useEffect(() => {
    return () => {
      if (!held.current) return;
      held.current = false;
      try {
        navigation.setOptions({
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        });
      } catch {
        // Screen may already be unmounted.
      }
    };
  }, [navigation]);
}
