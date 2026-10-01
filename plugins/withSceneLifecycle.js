/**
 * iOS 26+/27 requires UIScene life cycle adoption or the process traps at launch
 * (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
 *
 * Expo ships EXExpoAppSceneDelegate; the stock Expo 57 AppDelegate template still
 * creates the window and starts RN in application(_:didFinishLaunchingWithOptions:).
 * This plugin:
 *  1) Adds UIApplicationSceneManifest pointing at EXExpoAppSceneDelegate
 *  2) Makes AppDelegate conform to ExpoReactNativeFactoryProvider
 *  3) Removes the legacy window / startReactNative bootstrap (scene delegate owns it)
 */
const {
  createRunOncePlugin,
  withAppDelegate,
  withInfoPlist,
} = require('@expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';
const SCENE_CONFIG_NAME = 'Default Configuration';

const LEGACY_START_RN_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\r?\n[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\r?\n[ \t]*factory\.startReactNative\(\r?\n[ \t]*withModuleName: "main",\r?\n[ \t]*in: window,\r?\n[ \t]*launchOptions: launchOptions\)\r?\n#endif\r?\n?/;

const SCENE_COMMENT =
  '    // Window + React Native start happen in ExpoAppSceneDelegate (iOS 27 scene life cycle).\n';

function ensureSceneManifest(infoPlist) {
  infoPlist.UIApplicationSceneManifest = {
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      UIWindowSceneSessionRoleApplication: [
        {
          UISceneConfigurationName: SCENE_CONFIG_NAME,
          UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
        },
      ],
    },
  };
  return infoPlist;
}

function patchAppDelegateContents(src, language) {
  if (language !== 'swift') {
    throw new Error(
      `withSceneLifecycle: only Swift AppDelegate is supported (got ${language})`
    );
  }

  let next = src;

  if (!/\bExpoReactNativeFactoryProvider\b/.test(next)) {
    const classRe = /class\s+AppDelegate\s*:\s*ExpoAppDelegate(\s*,\s*[^{\n]+)?\s*\{/;
    if (!classRe.test(next)) {
      throw new Error(
        'withSceneLifecycle: could not find `class AppDelegate: ExpoAppDelegate`'
      );
    }
    next = next.replace(classRe, (full, rest) => {
      if (rest && /\bExpoReactNativeFactoryProvider\b/.test(rest)) {
        return full;
      }
      return 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
    });
  }

  if (LEGACY_START_RN_BLOCK.test(next)) {
    // SCENE_COMMENT already ends with \n; keep a single blank line before `return`.
    next = next.replace(LEGACY_START_RN_BLOCK, SCENE_COMMENT);
  } else if (/\bfactory\.startReactNative\s*\(/.test(next)) {
    throw new Error(
      'withSceneLifecycle: found factory.startReactNative but the expected #if os(iOS) block did not match'
    );
  } else if (!next.includes('ExpoAppSceneDelegate')) {
    // Already without startReactNative — ensure the intent comment exists once.
    if (!next.includes('ExpoAppSceneDelegate (iOS 27 scene life cycle)')) {
      next = next.replace(
        /(reactNativeFactory\s*=\s*factory\s*\n)/,
        `$1\n${SCENE_COMMENT}`
      );
    }
  }

  return next;
}

function withSceneLifecycleInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults = ensureSceneManifest(cfg.modResults);
    return cfg;
  });
}

function withSceneLifecycleAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    cfg.modResults.contents = patchAppDelegateContents(
      cfg.modResults.contents,
      cfg.modResults.language
    );
    return cfg;
  });
}

function withSceneLifecycle(config) {
  config = withSceneLifecycleInfoPlist(config);
  config = withSceneLifecycleAppDelegate(config);
  return config;
}

module.exports = createRunOncePlugin(
  withSceneLifecycle,
  'withSceneLifecycle',
  '1.0.0'
);
