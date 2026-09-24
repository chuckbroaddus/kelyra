# CAL-DRUM RNGH Expo pin (hotfix)

**Date:** 2026-09-24  
**Cause:** PR #195 added `react-native-gesture-handler@^3.2.1`. Expo SDK 57 / Expo Go ship native RNGH matching **~2.32.0**. JS 3.x calls `RNGestureHandlerModule.install()` → `undefined is not a function` in `NativeProxy.installUIRuntimeBindings`.

**Fix:** Pin `react-native-gesture-handler@~2.32.0` via `expo install`. Keep P1 Gesture.Pan + fixed plate + N=7.
