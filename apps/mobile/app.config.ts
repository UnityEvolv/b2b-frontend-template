/**
 * The Expo configuration. Configuration, so the update server's host may be
 * named here and nowhere else.
 *
 * The app's name, scheme and bundle identifier come from the build's
 * environment, with a template's defaults:
 *
 *   EXPO_PUBLIC_APP_NAME       the name under the icon (default "B2B App")
 *   EXPO_PUBLIC_APP_SCHEME     links into the app, `<scheme>://…` (default "b2bapp")
 *   EXPO_PUBLIC_APP_BUNDLE_ID  the Android package and iOS bundle identifier
 *                              (default "com.example.b2bapp")
 *
 * EXPO_PUBLIC_EAS_PROJECT_ID is set once `eas init` has created the project;
 * with it, builds carry the update URL and `eas update` reaches installed
 * devices without a reinstall. Without it, the app builds and runs, and
 * simply never checks for updates.
 *
 * EXPO_PUBLIC_APP_LINK_HOST is the web app's host, the one the product's
 * emails link to. With it, Android opens those links in the app (app links,
 * verified against the host's assetlinks.json) and iOS is told the same
 * domain. Without it, only the app's own scheme opens the app, which is
 * enough on a laptop.
 */
import type { ExpoConfig } from 'expo/config'

// The paths the product's emails link to, which the app opens itself, and the
// app's default name, scheme and bundle identifier. JSON,
// so this file and the app read the same values.
import APP_LINK_PATHS from './src/link-paths.json'
import APP_DEFAULTS from './src/app-identity.json'

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
const linkHost = process.env.EXPO_PUBLIC_APP_LINK_HOST?.trim() || undefined
const name = process.env.EXPO_PUBLIC_APP_NAME?.trim() || APP_DEFAULTS.name
const scheme = process.env.EXPO_PUBLIC_APP_SCHEME?.trim() || APP_DEFAULTS.scheme
const bundleId = process.env.EXPO_PUBLIC_APP_BUNDLE_ID?.trim() || APP_DEFAULTS.bundleId

const config: ExpoConfig = {
  name,
  slug: scheme,
  // <scheme>://accept-invite?token=…, and the sign-in browser's way back.
  scheme,
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  android: {
    package: bundleId,
    // The camera, for a profile photo. The gallery is the system photo
    // picker, which needs no permission.
    permissions: ['android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
    ],
    intentFilters: linkHost
      ? [
          {
            action: 'VIEW',
            autoVerify: true,
            category: ['BROWSABLE', 'DEFAULT'],
            data: APP_LINK_PATHS.map((pathPrefix) => ({
              scheme: 'https',
              host: linkHost,
              pathPrefix,
            })),
          },
        ]
      : [],
  },
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
    ...(linkHost ? { associatedDomains: [`applinks:${linkHost}`] } : {}),
  },
  // Every build with the same app version accepts the same updates.
  runtimeVersion: { policy: 'appVersion' },
  updates: projectId
    ? { url: `https://u.expo.dev/${projectId}`, enabled: true, fallbackToCacheTimeout: 0 }
    : { enabled: false },
  extra: projectId ? { eas: { projectId } } : {},
  // tsconfig.json points the type checker at the app's own React and React
  // Native; the bundle resolves them in metro.config.js, never through those
  // aliases (which would send React to its type definitions).
  experiments: { tsconfigPaths: false },
  plugins: [
    'expo-updates',
    // The session cookie lives in the keystore.
    'expo-secure-store',
    // Sign-in through an organization's provider opens the system browser,
    // never a webview in the app, and it comes back on the scheme above.
    'expo-web-browser',
    // A profile photo from the camera or the gallery, cropped square. The
    // reasons are the ones iOS shows; Android asks at the moment of use,
    // after the app has said why on its own screen.
    [
      'expo-image-picker',
      {
        cameraPermission: `${name} uses the camera to take your profile photo.`,
        photosPermission: `${name} uses a photo you choose as your profile photo.`,
        microphonePermission: false,
      },
    ],
    // Windows' path limit and CMake's object names (native builds only).
    './plugins/with-short-native-build-path',
  ],
}

export default config
