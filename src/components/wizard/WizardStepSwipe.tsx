/**
 * Shared wizard step swipe host (Syllabus + Grading Policy).
 * RNGH pan; stack-gesture gate like calendar drum; rubber-band on last forward.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from 'expo-router';

import {
  decideWizardSwipe,
  wizardSwipeDragOffset,
  type WizardSwipeSample,
} from '@/lib/wizard/wizardStepSwipe';
import { setSwipeRowStackGestures, type SwipeRowNavLike } from '@/lib/ui/swipeRowStackGestures';

export type WizardStepSwipeProps = {
  children: ReactNode;
  stepIndex: number;
  stepCount: number;
  busy?: boolean;
  enabled?: boolean;
  /** Same as tray ‹ — previous visible step. */
  onBackStep: () => void;
  /** Same as tray › — next visible step + badge paint. */
  onNextStep: () => void;
  /** First-step back: stack pop (class Settings / school Settings). */
  onPopStack: () => void;
  style?: StyleProp<ViewStyle>;
};

function useWizardStackGestureGate() {
  const navigation = useNavigation();
  const held = useRef(false);

  const hold = useCallback(() => {
    if (held.current) return;
    held.current = true;
    setSwipeRowStackGestures(navigation as SwipeRowNavLike, false);
  }, [navigation]);

  const release = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    setSwipeRowStackGestures(navigation as SwipeRowNavLike, true);
  }, [navigation]);

  useEffect(() => {
    return () => {
      if (!held.current) return;
      held.current = false;
      setSwipeRowStackGestures(navigation as SwipeRowNavLike, true);
    };
  }, [navigation]);

  return { hold, release };
}

const SPRING = { damping: 22, stiffness: 260, mass: 0.7 };

export function WizardStepSwipe({
  children,
  stepIndex,
  stepCount,
  busy,
  enabled = true,
  onBackStep,
  onNextStep,
  onPopStack,
  style,
}: WizardStepSwipeProps) {
  const { hold, release } = useWizardStackGestureGate();
  const tx = useSharedValue(0);
  const ctxRef = useRef({ stepIndex, stepCount, busy: Boolean(busy), enabled });
  ctxRef.current = { stepIndex, stepCount, busy: Boolean(busy), enabled };

  const handlersRef = useRef({ onBackStep, onNextStep, onPopStack });
  handlersRef.current = { onBackStep, onNextStep, onPopStack };

  const settle = useCallback(() => {
    tx.value = withSpring(0, SPRING);
  }, [tx]);

  const applyDecision = useCallback(
    (sample: WizardSwipeSample) => {
      const ctx = ctxRef.current;
      const action = decideWizardSwipe(sample, {
        stepIndex: ctx.stepIndex,
        stepCount: ctx.stepCount,
        busy: ctx.busy || !ctx.enabled,
      });
      const h = handlersRef.current;
      switch (action) {
        case 'back_step':
          settle();
          h.onBackStep();
          break;
        case 'next_step':
          settle();
          h.onNextStep();
          break;
        case 'pop_stack':
          settle();
          h.onPopStack();
          break;
        case 'bounce_forward':
          settle();
          break;
        default:
          settle();
          break;
      }
    },
    [settle],
  );

  const onBegin = useCallback(() => {
    if (!ctxRef.current.enabled || ctxRef.current.busy) return;
    hold();
  }, [hold]);

  const onUpdate = useCallback(
    (translationX: number) => {
      const ctx = ctxRef.current;
      if (!ctx.enabled || ctx.busy) {
        tx.value = 0;
        return;
      }
      tx.value = wizardSwipeDragOffset(translationX, {
        stepIndex: ctx.stepIndex,
        stepCount: ctx.stepCount,
      });
    },
    [tx],
  );

  const onEnd = useCallback(
    (translationX: number, translationY: number, velocityX: number, success: boolean) => {
      release();
      if (!success || !ctxRef.current.enabled) {
        settle();
        return;
      }
      applyDecision({ translationX, translationY, velocityX });
    },
    [applyDecision, release, settle],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        // Do NOT manual-activate: let vertical ScrollView + chip/tab rows win first.
        .activeOffsetX([-24, 24])
        .failOffsetY([-16, 16])
        .enabled(enabled && !busy)
        .onBegin(() => {
          'worklet';
          runOnJS(onBegin)();
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(onUpdate)(e.translationX);
        })
        .onEnd((e, success) => {
          'worklet';
          runOnJS(onEnd)(e.translationX, e.translationY, e.velocityX, success);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(release)();
        }),
    [busy, enabled, onBegin, onEnd, onUpdate, release],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  // Web-only CSS keeps browser history swipe from stealing LTR/RTL step pans.
  const webStyle =
    Platform.OS === 'web'
      ? ({
          overscrollBehaviorX: 'none',
          touchAction: 'pan-y',
        } as unknown as ViewStyle)
      : undefined;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.host, style, webStyle, animStyle]}
        // Box-none so absolute nav host sibling still receives presses when parent is shell.
        pointerEvents="box-none"
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    minHeight: 0,
  },
});
