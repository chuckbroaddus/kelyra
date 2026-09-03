import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function hasAudioStream(rel: string): boolean {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type,codec_name', '-of', 'csv=p=0', join(root, rel)],
      { encoding: 'utf8' },
    );
    return /audio/.test(out) && /aac/i.test(out);
  } catch {
    return false;
  }
}

test('signed-out home gate uses unified splash auth (no push to /sign-in)', () => {
  const home = read('src/app/index.tsx');
  const splash = read('src/components/ui/SplashLanding.tsx');
  const brand = read('src/components/ui/splashBrand.ts');

  assert.match(home, /import \{ SplashLanding \} from '@\/components\/ui\/SplashLanding'/);
  assert.match(home, /<SplashLanding error=\{error\} \/>/);
  assert.doesNotMatch(home, /router\.push\(['"]\/sign-in['"]\)/);
  assert.doesNotMatch(home, /Photograph the work\. Approve the gap\. Send a short practice set\./);
  assert.doesNotMatch(home, /styles\.wordmark/);

  assert.match(brand, /assets\/brand\/splash\/kelyra_splash_16x9\.mp4/);
  assert.match(brand, /assets\/brand\/splash\/kelyra_splash_9x16\.mp4/);
  assert.match(brand, /kelyra_splash_still_16x9\.jpg/);
  assert.match(brand, /kelyra_splash_still_9x16\.jpg/);
  assert.doesNotMatch(brand, /kelyra_splash_still_16x9\.png/);
  assert.doesNotMatch(brand, /kelyra_splash_still_9x16\.png/);
  assert.match(splash, /Sign in/);
  assert.match(splash, /isLooping=\{false\}/);
  assert.match(splash, /isMuted=\{awaitingGesture\}/);
  assert.match(splash, /volume=\{1\}/);
  assert.match(splash, /SplashVideo/);
  assert.match(splash, /splashAspectForSize/);
  assert.match(splash, /Audio\.setAudioModeAsync/);
  assert.match(splash, /playsInSilentModeIOS:\s*true/);
  assert.match(splash, /didJustFinish/);
  assert.doesNotMatch(splash, /http:\/\/|https:\/\//);

  const nativeVideo = read('src/components/ui/SplashVideo.tsx');
  assert.match(nativeVideo, /ResizeMode\.COVER/);
  assert.match(nativeVideo, /useNativeControls=\{false\}/);
});

test('splash plays once unmuted and CTA matches neon splash palette (not terracotta Primary)', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');
  const cta = read('src/components/ui/SplashSignInButton.tsx');

  assert.doesNotMatch(splash, /PrimaryButton/);
  assert.doesNotMatch(splash, /colors\.brand/);
  assert.doesNotMatch(splash, /#B03E0E|#E07A3A/);
  assert.doesNotMatch(splash, /\bisLooping(?:=\{true\}|\s)/);
  assert.doesNotMatch(splash, /volume=\{0\}/);
  assert.match(splash, /isMuted=\{awaitingGesture\}/);
  assert.doesNotMatch(splash, /^\s*isMuted=\{(?:true|false)\}/m);
  assert.doesNotMatch(splash, /rgba\(20,\s*12,\s*8/);

  assert.match(splash, /SplashSignInButton/);
  assert.match(splash, /splashCtaGradient/);
  assert.match(cta, /expo-linear-gradient/);
  assert.match(cta, /LinearGradient/);
  assert.match(cta, /splashCtaGradient/);
  assert.match(cta, /#6B4CFF/);
  assert.match(cta, /#2EC6F0/);
  assert.match(cta, /#F5FBFF|#FFFFFF/);
  assert.match(splash, /backgroundColor:\s*'#000000'/);
});

test('CEO JPG still always under video; crossfade opacity then unmount (no black unload flash)', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');
  const brand = read('src/components/ui/splashBrand.ts');

  assert.match(splash, /splashStillSources/);
  assert.match(splash, /hasCompletedSplash/);
  assert.match(splash, /splashSessionCompleted/);
  assert.match(splash, /markCompleted/);
  assert.match(splash, /showVideo/);
  assert.match(splash, /videoOpacity/);
  assert.match(splash, /SPLASH_CROSSFADE_RATIO/);
  assert.match(splash, /VIDEO_FADE_MS/);
  assert.match(splash, /beginVideoCrossfade/);
  assert.match(splash, /completeNatural/);
  // End path never relies on setPositionAsync last-frame hold.
  assert.doesNotMatch(splash, /setPositionAsync/);
  assert.doesNotMatch(splash, /SPLASH_PEAK_FRAME/);
  assert.doesNotMatch(splash, /SPLASH_PEAK_RATIO/);
  assert.doesNotMatch(splash, /SPLASH_END_EPSILON_MS/);
  // Still Image mounts unconditionally (under video); SplashVideo gated by showVideo.
  assert.match(splash, /source=\{stillSource\}/);
  assert.match(splash, /resizeMode="cover"/);
  assert.match(splash, /\{showVideo \? \([\s\S]*?<SplashVideo/);
  assert.match(splash, /CEO JPG still/);
  assert.match(splash, /zIndex:\s*1/);
  assert.match(splash, /zIndex:\s*2/);
  assert.match(splash, /zIndex:\s*3/);
  // Full-bleed cover via absoluteFill + 100% of root (not a one-shot window box alone).
  assert.doesNotMatch(splash, /mediaBox\s*=\s*\{\s*width,\s*height\s*\}/);
  assert.match(splash, /style=\{styles\.still\}/);
  assert.match(splash, /style=\{styles\.video\}/);
  assert.match(
    splash,
    /still:\s*\{[\s\S]*?\.\.\.StyleSheet\.absoluteFillObject[\s\S]*?width:\s*'100%'[\s\S]*?height:\s*'100%'/,
  );
  assert.match(
    splash,
    /video:\s*\{[\s\S]*?\.\.\.StyleSheet\.absoluteFillObject[\s\S]*?width:\s*'100%'[\s\S]*?height:\s*'100%'/,
  );
  const nativeVideo = read('src/components/ui/SplashVideo.tsx');
  assert.match(nativeVideo, /ResizeMode\.COVER/);

  assert.match(brand, /splashStillSources/);
  assert.match(brand, /CEO hold stills \(JPG\)/);
  assert.match(brand, /kelyra_splash_still_16x9\.jpg/);
  assert.match(brand, /kelyra_splash_still_9x16\.jpg/);
  assert.ok(existsSync(join(root, 'assets/brand/splash/kelyra_splash_still_16x9.jpg')));
  assert.ok(existsSync(join(root, 'assets/brand/splash/kelyra_splash_still_9x16.jpg')));
});

test('orientation after complete does not remount SplashVideo with shouldPlay', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  // Video only while showVideo — never remount after finish.
  assert.match(splash, /\{showVideo \? \([\s\S]*?<SplashVideo[\s\S]*?shouldPlay/);
  // Session flag short-circuits focus/play effect so rotate after finish never replays.
  assert.match(
    splash,
    /if\s*\(\s*hasCompletedSplash\s*\|\|\s*splashSessionCompleted\s*\)/,
  );
  assert.match(splash, /setShowVideo\(false\)/);
  assert.match(splash, /ownedVideo/);
  assert.match(splash, /let ownedVideo:\s*SplashVideoHandle\s*\|\s*null\s*=\s*null/);
  assert.match(
    splash,
    /return \(\) => \{[\s\S]*?cancelled\s*=\s*true;[\s\S]*?if\s*\(\s*!ownedVideo\s*\)\s*return;[\s\S]*?ownedVideo\.pauseAsync[\s\S]*?ownedVideo\.unloadAsync/,
  );
  // Completed path: still Image remains; SplashVideo branch is gated off.
  assert.match(splash, /<Image[\s\S]*?source=\{stillSource\}/);
  assert.doesNotMatch(
    splash,
    /hasCompletedSplash\s*\?\s*\(\s*<Image[\s\S]*?\)\s*:\s*\(\s*<Pressable[\s\S]*?<SplashVideo/,
  );
});

test('orientation cleanup unloads only the owned SplashVideo instance (not videoRef after remount)', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /ownedVideo/);
  assert.match(splash, /let ownedVideo:\s*SplashVideoHandle\s*\|\s*null\s*=\s*null/);
  assert.match(splash, /ownedVideo\s*=\s*videoRef\.current/);
  assert.match(
    splash,
    /return \(\) => \{[\s\S]*?cancelled\s*=\s*true;[\s\S]*?if\s*\(\s*!ownedVideo\s*\)\s*return;[\s\S]*?ownedVideo\.pauseAsync[\s\S]*?ownedVideo\.unloadAsync/,
  );
  assert.doesNotMatch(
    splash,
    /return \(\) => \{[\s\S]*?const video\s*=\s*videoRef\.current;[\s\S]*?unloadAsync/,
  );
  assert.match(splash, /key=\{sourceKey\}/);
});

test('splashAspectForSize picks portrait when height > width', async () => {
  const brand = read('src/components/ui/splashBrand.ts');
  assert.match(
    brand,
    /export function splashAspectForSize\(width:\s*number,\s*height:\s*number\):\s*SplashAspectKey\s*\{[\s\S]*?return height > width \? 'portrait' : 'landscape';/,
  );

  const aspect = (width: number, height: number) => (height > width ? 'portrait' : 'landscape');
  assert.equal(aspect(390, 844), 'portrait');
  assert.equal(aspect(844, 390), 'landscape');
  assert.equal(aspect(800, 800), 'landscape');
});

test('native phone splash locks portrait pre-auth and unlocks after sign-in', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');
  const orient = read('src/lib/theme/screenOrientation.ts');
  const auth = read('src/lib/auth/AuthProvider.tsx');
  const appJson = read('app.json');
  const pkg = read('package.json');

  assert.match(orient, /expo-screen-orientation/);
  assert.match(orient, /OrientationLock\.PORTRAIT_UP/);
  assert.match(orient, /lockAsync/);
  assert.match(orient, /unlockAsync/);
  assert.match(orient, /Platform\.OS === 'web'/);
  assert.match(orient, /Platform\.isPad/);
  assert.match(orient, /Math\.min\(width,\s*height\)\s*<\s*720/);
  assert.match(orient, /export async function lockPreAuthPortrait/);
  assert.match(orient, /export async function unlockAppOrientation/);

  assert.match(splash, /lockPreAuthPortrait/);
  assert.match(splash, /unlockAppOrientation/);
  assert.match(splash, /isNativePhone/);
  assert.match(splash, /phoneLocked\s*\?\s*'portrait'\s*:\s*splashAspectForSize/);
  assert.match(splash, /void lockPreAuthPortrait\(width,\s*height\)/);
  assert.match(splash, /await unlockAppOrientation\(\)/);
  const signInBody = splash.match(/const runSignIn = useCallback\(async \(\) => \{([\s\S]*?)\},/);
  assert.ok(signInBody, 'expected runSignIn callback');
  assert.match(signInBody[1], /unlockAppOrientation/);
  assert.match(signInBody[1], /router\.replace\(['"]\/['"]\)/);

  assert.match(auth, /unlockAppOrientation/);
  assert.match(auth, /if\s*\(\s*!session\s*\)\s*return;/);
  assert.match(auth, /void unlockAppOrientation\(\)/);

  assert.match(appJson, /"expo-screen-orientation"/);
  assert.match(appJson, /"initialOrientation":\s*"DEFAULT"/);
  assert.match(appJson, /"orientation":\s*"default"/);
  assert.match(pkg, /"expo-screen-orientation":\s*"~9\.0\.9"/);
});

test('splash mp4 assets are bundled with AAC audio', () => {
  const landscape = 'assets/brand/splash/kelyra_splash_16x9.mp4';
  const portrait = 'assets/brand/splash/kelyra_splash_9x16.mp4';
  assert.ok(existsSync(join(root, landscape)));
  assert.ok(existsSync(join(root, portrait)));
  assert.ok(hasAudioStream(landscape), `${landscape} must include an AAC audio stream`);
  assert.ok(hasAudioStream(portrait), `${portrait} must include an AAC audio stream`);
});

test('CTA and form stay hidden during animation; natural end fades CTA after crossfade', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  // Overlay (button/form) mounts only after completion — hidden during play.
  assert.match(splash, /\{hasCompletedSplash \? \([\s\S]*?KeyboardAvoidingView/);
  assert.match(splash, /ctaOpacity/);
  assert.match(splash, /formOpacity/);
  assert.match(splash, /Animated\.timing/);
  assert.match(splash, /revealCta/);
  assert.match(splash, /completeNatural/);
  assert.match(splash, /beginVideoCrossfade/);
  const naturalBody = splash.match(/const completeNatural = useCallback\(\(\) => \{([\s\S]*?)\},/);
  assert.ok(naturalBody, 'expected completeNatural callback');
  assert.match(naturalBody[1], /beginVideoCrossfade\(\)/);
  assert.doesNotMatch(naturalBody[1], /revealForm/);
  // Logo hold must not require didJustFinish — crossfade ratio is primary.
  assert.match(splash, /SPLASH_CROSSFADE_RATIO/);
  assert.match(splash, /pastCrossfade\s*\|\|\s*status\.didJustFinish/);
});

test('end/skip completion never pause/unload while video opacity covers still', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  const naturalBody = splash.match(/const completeNatural = useCallback\(\(\) => \{([\s\S]*?)\},/);
  const skipBody = splash.match(/const skipSplash = useCallback\(\(\) => \{([\s\S]*?)\},/);
  const fadeBody = splash.match(/const beginVideoCrossfade = useCallback\(\(\) => \{([\s\S]*?)\},/);
  assert.ok(naturalBody, 'expected completeNatural callback');
  assert.ok(skipBody, 'expected skipSplash callback');
  assert.ok(fadeBody, 'expected beginVideoCrossfade callback');

  // Skip: opacity 0 + unmount immediately.
  assert.match(skipBody[1], /videoOpacity\.setValue\(0\)/);
  assert.match(skipBody[1], /setShowVideo\(false\)/);
  assert.match(skipBody[1], /markCompleted\(\)/);
  assert.match(skipBody[1], /revealCta\(\)/);
  assert.match(skipBody[1], /revealForm\(\)/);
  assert.doesNotMatch(skipBody[1], /unloadAsync/);
  assert.doesNotMatch(skipBody[1], /pauseAsync|pauseVideo/);
  assert.doesNotMatch(naturalBody[1], /unloadAsync/);
  assert.doesNotMatch(naturalBody[1], /pauseAsync|pauseVideo/);
  assert.doesNotMatch(fadeBody[1], /unloadAsync/);
  assert.doesNotMatch(fadeBody[1], /pauseAsync|pauseVideo/);

  // Crossfade uses Animated opacity; pointerEvents none during fade-out.
  assert.match(fadeBody[1], /Animated\.timing\(videoOpacity/);
  assert.match(fadeBody[1], /toValue:\s*0/);
  assert.match(splash, /pointerEvents=\{isFadingOut \? 'none' : 'auto'\}/);

  // Unload belongs in focus-effect cleanup after SplashVideo is unmounted.
  assert.match(
    splash,
    /return \(\) => \{[\s\S]*?ownedVideo\.pauseAsync[\s\S]*?ownedVideo\.unloadAsync/,
  );
  assert.match(splash, /\{showVideo \? \([\s\S]*?<SplashVideo/);
});

test('crossfade starts at 0.72 duration — not peak-frame / last-frame hold', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /export const SPLASH_CROSSFADE_RATIO = 0\.72/);
  assert.match(splash, /export const VIDEO_FADE_MS = 300/);
  assert.match(splash, /position\s*>=\s*duration\s*\*\s*SPLASH_CROSSFADE_RATIO/);
  assert.match(splash, /SPLASH_SAFETY_MS/);
  assert.match(splash, /completeNatural\(\)/);
  assert.match(splash, /beginVideoCrossfade\(\)/);
  // Forbidden old peak-cut / last-frame architecture.
  assert.doesNotMatch(splash, /SPLASH_PEAK_FRAME/);
  assert.doesNotMatch(splash, /SPLASH_PEAK_RATIO/);
  assert.doesNotMatch(splash, /SPLASH_END_EPSILON_MS/);
  assert.doesNotMatch(splash, /SPLASH_FRAME_COUNT/);
  const statusHandler = splash.match(/onPlaybackStatusUpdate = useCallback\([\s\S]*?\],/);
  assert.ok(statusHandler, 'expected onPlaybackStatusUpdate');
  assert.match(statusHandler[0], /SPLASH_CROSSFADE_RATIO/);
  assert.match(statusHandler[0], /beginVideoCrossfade/);
  // didJustFinish is fallback only — logo hold does not require it.
  assert.match(statusHandler[0], /didJustFinish/);
  assert.match(statusHandler[0], /pastCrossfade/);
});

test('scrim is soft bottom gradient only (no opaque full-bleed black over logo)', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /LinearGradient/);
  assert.match(splash, /expo-linear-gradient/);
  assert.match(splash, /colors=\{\['rgba\(0, 0, 0, 0\)',\s*'rgba\(0, 0, 0, 0\.55\)'\]\}/);
  // Flat opaque scrim wash removed.
  assert.doesNotMatch(splash, /scrim:\s*\{[^}]*backgroundColor:\s*'rgba\(0,\s*0,\s*0,\s*0\.45\)'/);
  assert.doesNotMatch(splash, /styles\.scrim[^}]*backgroundColor:\s*'#000/);
});

test('mid-animation: muted body tap unmutes; Skip control skips; Sign in reveals form after finish', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /skipSplash/);
  assert.match(splash, /revealForm/);
  assert.match(splash, /showForm/);
  const skipBody = splash.match(/const skipSplash = useCallback\(\(\) => \{([\s\S]*?)\},/);
  assert.ok(skipBody, 'expected skipSplash callback');
  assert.match(skipBody[1], /videoOpacity\.setValue\(0\)/);
  assert.match(skipBody[1], /setShowVideo\(false\)/);
  assert.match(skipBody[1], /markCompleted\(\)/);
  assert.match(skipBody[1], /revealCta\(\)/);
  assert.match(skipBody[1], /revealForm\(\)/);
  assert.match(splash, /if\s*\(\s*!showForm\s*\)\s*\{[\s\S]*?revealForm\(\)/);
  assert.match(splash, /signInWithPassword/);
  assert.match(splash, /router\.replace\(['"]\/['"]\)/);
  assert.match(splash, /splashOfficeFooter/);
  assert.match(
    splash,
    /Account creation is performed by the school office\. Please contact your school's administration for access\./,
  );

  // Distinct Skip control — body tap must not be the only path.
  assert.match(splash, /accessibilityLabel="Skip splash"/);
  assert.match(splash, /styles\.skipButton/);
  assert.match(splash, />Skip</);
  assert.match(splash, /onPress=\{skipSplash\}/);

  const videoPress = splash.match(/const onVideoPress = useCallback\(\(\) => \{([\s\S]*?)\},/);
  assert.ok(videoPress, 'expected onVideoPress callback');
  // Muted-for-autoplay: first body tap unmutes (does not skip).
  assert.match(videoPress[1], /if\s*\(\s*awaitingGesture\s*\)\s*\{[\s\S]*?unlockAudioIfNeeded\(\)/);
  assert.match(videoPress[1], /skipSplash\(\)/);
  // Unmute path must run before skip when awaitingGesture.
  const unmuteIdx = videoPress[1].search(/if\s*\(\s*awaitingGesture\s*\)/);
  const skipIdx = videoPress[1].indexOf('skipSplash()');
  assert.ok(unmuteIdx >= 0 && skipIdx > unmuteIdx, 'awaitingGesture unmute must precede skipSplash');
});

test('unified splash hosts credential fields; /sign-in reuses same UI', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');
  const signIn = read('src/app/sign-in.tsx');
  const cta = read('src/components/ui/SplashSignInButton.tsx');
  const brand = read('src/components/ui/splashBrand.ts');

  assert.match(splash, /splashStillSources/);
  assert.match(splash, /TextField/);
  assert.match(splash, /Email or @username/);
  assert.match(splash, /placeholder="Password"/);
  assert.doesNotMatch(splash, /Password \(6\+ characters\)/);
  assert.doesNotMatch(splash, /Sign in with email or @username/);
  assert.doesNotMatch(splash, /styles\.kicker/);
  assert.match(splash, /SplashSignInButton/);
  assert.doesNotMatch(splash, /KelyraMark/);
  assert.doesNotMatch(splash, />Kelyra<\/Text>/);
  assert.doesNotMatch(splash, /PrimaryButton/);
  assert.doesNotMatch(splash, /school_claim_superintendent/);

  assert.match(signIn, /SplashLanding/);
  assert.match(signIn, /initialRevealForm/);
  assert.doesNotMatch(signIn, /KelyraMark/);
  assert.doesNotMatch(signIn, />Kelyra<\/Text>/);
  assert.doesNotMatch(signIn, /PrimaryButton/);
  assert.doesNotMatch(signIn, /signUp|createTeacher|auth\.signUp/);

  assert.match(brand, /splashStillSources/);
  assert.match(brand, /kelyra_splash_still_16x9\.jpg/);
  assert.match(brand, /kelyra_splash_still_9x16\.jpg/);
  assert.ok(existsSync(join(root, 'assets/brand/splash/kelyra_splash_still_16x9.jpg')));
  assert.ok(existsSync(join(root, 'assets/brand/splash/kelyra_splash_still_9x16.jpg')));
  assert.match(cta, /#6B4CFF/);
  assert.match(cta, /#2EC6F0/);
});

test('Sign in CTA keeps stable y-position: fields and office footer always layout', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  // Fields stay mounted (opacity/pointerEvents gate) — not unmounted when showForm is false.
  assert.match(
    splash,
    /Always layout fields so Sign in CTA does not jump/,
  );
  assert.match(splash, /styles\.formBlock,\s*\{\s*opacity:\s*formOpacity\s*\}/);
  assert.match(splash, /pointerEvents=\{showForm \? 'auto' : 'none'\}/);
  // No conditional mount that collapses form height before first CTA tap.
  assert.doesNotMatch(
    splash,
    /\{showForm \? \(\s*<>[\s\S]*?Email or @username[\s\S]*?\)\s*:\s*null\}/,
  );
  assert.doesNotMatch(splash, /paddingTop:\s*showForm\s*\?/);
  assert.match(splash, /paddingTop:\s*20/);
  // Office footer also always layouts (opacity gate) — flex-end would otherwise shift CTA up.
  assert.match(
    splash,
    /Always layout office footer so flex-end stack does not shift CTA/,
  );
  assert.match(splash, /styles\.hintWrap,\s*\{\s*opacity:\s*formOpacity\s*\}/);
  assert.match(splash, /<Text style=\{styles\.hint\}>\{splashOfficeFooter\}<\/Text>/);
  assert.doesNotMatch(
    splash,
    /\{showForm \? <Text style=\{styles\.hint\}>\{splashOfficeFooter\}<\/Text> : null\}/,
  );
  assert.doesNotMatch(splash, /Sign in with email or @username/);
  assert.doesNotMatch(splash, /6\+ characters/);
});

test('web splash auth column is centered (no left-pinned maxWidth stretch)', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /footer:\s*\{[\s\S]*?alignItems:\s*'center'/);
  for (const block of ['formBlock', 'ctaWrap', 'hintWrap', 'error'] as const) {
    const re = new RegExp(
      `${block}:\\s*\\{[\\s\\S]*?alignSelf:\\s*'center'[\\s\\S]*?maxWidth:\\s*360`,
    );
    assert.match(splash, re, `${block} must use alignSelf center + maxWidth 360`);
    assert.doesNotMatch(
      splash,
      new RegExp(`${block}:\\s*\\{[\\s\\S]*?alignSelf:\\s*'stretch'`),
      `${block} must not stretch (RN Web left-pins maxWidth strips)`,
    );
  }
  assert.match(splash, /formBlock:\s*\{[\s\S]*?width:\s*'100%'/);
  assert.match(splash, /ctaWrap:\s*\{[\s\S]*?width:\s*'100%'/);
});

test('web splash root + media fill viewport for cover resize', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /root:\s*\{[\s\S]*?flex:\s*1/);
  assert.match(
    splash,
    /Platform\.select\(\s*\{\s*web:\s*\{[\s\S]*?width:\s*'100%'[\s\S]*?height:\s*'100%'[\s\S]*?minHeight:\s*'100vh'/,
  );
  assert.match(splash, /minHeight:\s*'100vh'/);
  assert.match(splash, /videoHit:\s*\{[\s\S]*?\.\.\.StyleSheet\.absoluteFillObject/);
  assert.match(splash, /videoLayer:\s*\{[\s\S]*?\.\.\.StyleSheet\.absoluteFillObject/);
  // Aspect still comes from window dims; sizing does not.
  assert.match(splash, /useWindowDimensions/);
  assert.match(splash, /splashAspectForSize\(width,\s*height\)/);
  assert.doesNotMatch(splash, /style=\{\[styles\.still,\s*mediaBox\]\}/);
  assert.doesNotMatch(splash, /style=\{\[styles\.videoHit,\s*mediaBox\]\}/);
});

test('web muted autoplay unlocks on body tap; skip stays available; native audio path intact', () => {
  const splash = read('src/components/ui/SplashLanding.tsx');

  assert.match(splash, /tryPlayUnmuted/);
  assert.match(splash, /setAwaitingGesture\(true\)/);
  assert.match(splash, /Platform\.OS === 'web'/);
  assert.match(splash, /isMuted=\{awaitingGesture\}/);
  assert.match(splash, /playsInSilentModeIOS:\s*true/);
  assert.match(splash, /Sound on/);
  assert.match(splash, /flashSoundOnHint/);
  assert.match(splash, /Tap for sound/);
  // Web always starts muted (not lucky first-load unmuted).
  assert.match(
    splash,
    /useState\(\s*\(\)\s*=>\s*Platform\.OS === 'web' && !startCompleted,?\s*\)/,
  );
  assert.match(splash, /Web: always muted autoplay/);
  assert.match(splash, /await ownedVideo\?\.setIsMutedAsync\(true\)/);

  const unlock = splash.match(/const unlockAudioIfNeeded = useCallback\(async \(\) => \{([\s\S]*?)\},/);
  assert.ok(unlock, 'expected unlockAudioIfNeeded');
  assert.match(unlock[1], /tryPlayUnmuted\(videoRef\.current\)/);
  assert.match(unlock[1], /flashSoundOnHint\(\)/);
  // Unlock must not await audio-mode setup before unmute (drops web user gesture).
  assert.doesNotMatch(unlock[1], /await\s+enableSplashAudioMode/);
  assert.doesNotMatch(unlock[1], /Audio\.setAudioModeAsync/);

  // Press handler unlock path invokes setIsMutedAsync(false) via tryPlayUnmuted.
  const tryUnmute = splash.match(/const tryPlayUnmuted = useCallback\(async \(video: SplashVideoHandle \| null\) => \{([\s\S]*?)\},/);
  assert.ok(tryUnmute, 'expected tryPlayUnmuted');
  assert.match(tryUnmute[1], /setIsMutedAsync\(false\)/);
  assert.match(tryUnmute[1], /setVolumeAsync\(1\)/);
  assert.match(tryUnmute[1], /playAsync\(\)/);
  // Unmute+volume must not be awaited before play (Safari gesture token).
  assert.match(tryUnmute[1], /void video\.setIsMutedAsync\(false\)/);
  assert.match(tryUnmute[1], /void video\.setVolumeAsync\(1\)/);
  assert.doesNotMatch(tryUnmute[1], /await video\.setIsMutedAsync/);
  assert.doesNotMatch(tryUnmute[1], /await video\.setVolumeAsync/);

  const videoPress = splash.match(/const onVideoPress = useCallback\(\(\) => \{([\s\S]*?)\},/);
  assert.ok(videoPress, 'expected onVideoPress');
  assert.match(videoPress[1], /if\s*\(\s*awaitingGesture\s*\)\s*\{[\s\S]*?unlockAudioIfNeeded\(\)/);

  // Corner Skip is independent of body-tap unmute.
  assert.match(
    splash,
    /showVideo && !hasCompletedSplash \? \([\s\S]*?accessibilityLabel="Skip splash"[\s\S]*?onPress=\{skipSplash\}/,
  );
});

test('web splash video uses HTML5 absolute fill + object-fit cover (not expo-av web)', () => {
  const web = read('src/components/ui/SplashVideo.web.tsx');
  const native = read('src/components/ui/SplashVideo.tsx');
  const types = read('src/components/ui/splashVideoTypes.ts');

  assert.ok(existsSync(join(root, 'src/components/ui/SplashVideo.web.tsx')));
  assert.ok(existsSync(join(root, 'src/components/ui/SplashVideo.tsx')));
  assert.match(web, /createElement\('video'/);
  assert.match(web, /objectFit:\s*'cover'/);
  assert.match(web, /objectPosition:\s*'center'/);
  assert.match(web, /position:\s*'absolute'/);
  assert.match(web, /playsInline:\s*true/);
  assert.match(web, /controls:\s*false/);
  assert.match(web, /onTimeUpdate/);
  assert.match(web, /onEnded/);
  assert.match(web, /setIsMutedAsync/);
  assert.match(web, /setVolumeAsync/);
  assert.match(web, /playAsync/);
  // Video must not steal Pressable taps — parent receives unmute / skip.
  assert.match(web, /pointerEvents:\s*'none'/);
  assert.match(web, /['"]pointer-events['"]:\s*'none'/);
  // Default muted until parent clears awaitingGesture.
  assert.match(web, /isMuted = true/);
  assert.match(web, /el\.muted = muted/);
  assert.match(web, /await el\.play\(\)/);
  // Must not rely on expo-av web path that clears absolute positioning.
  assert.doesNotMatch(web, /from 'expo-av'/);
  assert.doesNotMatch(web, /ExponentVideo/);
  assert.doesNotMatch(web, /customStyle\s*=\s*\{[\s\S]*?position:\s*undefined/);

  assert.match(native, /from 'expo-av'/);
  assert.match(native, /ResizeMode\.COVER/);
  assert.match(types, /SplashVideoHandle/);
  assert.match(types, /SplashPlaybackStatus/);
});

test('splash still JPGs are non-black CEO holds (JPEG magic + neon ink present)', () => {
  for (const rel of [
    'assets/brand/splash/kelyra_splash_still_16x9.jpg',
    'assets/brand/splash/kelyra_splash_still_9x16.jpg',
  ]) {
    const abs = join(root, rel);
    const buf = readFileSync(abs);
    assert.ok(buf.byteLength > 10_000, `${rel} looks empty`);
    // JPEG SOI marker
    assert.equal(buf[0], 0xff);
    assert.equal(buf[1], 0xd8);
    // Sample RGB: a solid black hold frame would have max channel ~0.
    const raw = execFileSync(
      'ffmpeg',
      ['-v', 'error', '-i', abs, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    let max = 0;
    for (let i = 0; i < raw.length; i += 48) {
      const v = raw[i];
      if (v > max) max = v;
      if (max >= 200) break;
    }
    assert.ok(max >= 200, `${rel} looks near-black (max channel ${max})`);
  }
});

test('bundled MP4 last frame is non-black; CEO JPG stills are not early peak frame 52', () => {
  const tmp = join(root, 'node_modules', '.cache', 'kelyra-splash-last-check');
  execFileSync('mkdir', ['-p', tmp]);

  function maxChannel(imagePath: string): number {
    const raw = execFileSync(
      'ffmpeg',
      ['-v', 'error', '-i', imagePath, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    let max = 0;
    for (let i = 0; i < raw.length; i += 48) {
      const v = raw[i];
      if (v > max) max = v;
      if (max >= 200) break;
    }
    return max;
  }

  for (const [mp4, still] of [
    ['assets/brand/splash/kelyra_splash_16x9.mp4', 'assets/brand/splash/kelyra_splash_still_16x9.jpg'],
    ['assets/brand/splash/kelyra_splash_9x16.mp4', 'assets/brand/splash/kelyra_splash_still_9x16.jpg'],
  ] as const) {
    const lastOut = join(tmp, `last-${still.split('/').pop()}.png`);
    const peakOut = join(tmp, `peak52-${still.split('/').pop()}.png`);
    // n=75 is 0-based index for 1-based frame 76 (last).
    execFileSync(
      'ffmpeg',
      ['-y', '-i', join(root, mp4), '-vf', 'select=eq(n\\,75)', '-vframes', '1', lastOut],
      { stdio: 'ignore' },
    );
    // n=51 is old peak frame 52 — stills must not be that early cut.
    execFileSync(
      'ffmpeg',
      ['-y', '-i', join(root, mp4), '-vf', 'select=eq(n\\,51)', '-vframes', '1', peakOut],
      { stdio: 'ignore' },
    );
    const last = readFileSync(lastOut);
    const peak52 = readFileSync(peakOut);
    const bundled = readFileSync(join(root, still));
    assert.ok(last.byteLength > 10_000, `${mp4} last frame extract empty`);
    assert.ok(maxChannel(lastOut) >= 200, `${mp4} last frame looks near-black`);
    assert.ok(maxChannel(join(root, still)) >= 200, `${still} looks near-black`);
    // CEO JPGs must not be the old peak-52 ffmpeg extract.
    assert.ok(!bundled.equals(peak52), `${still} must not equal peak frame 52 of ${mp4}`);
  }
});
