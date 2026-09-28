// Metro for a workspace: the shared packages are symlinked into node_modules
// and ship TypeScript source, so the bundler watches the whole repository and
// resolves them through their package exports.
const { getDefaultConfig } = require('expo/metro-config')
const fs = require('node:fs')
const path = require('node:path')

const app = __dirname
const root = path.resolve(app, '..', '..')

const config = getDefaultConfig(app)
config.watchFolders = [root]
config.resolver.nodeModulesPaths = [path.join(app, 'node_modules'), path.join(root, 'node_modules')]
config.resolver.unstable_enablePackageExports = true

// The shared packages import their own files with a `.js` extension, as
// TypeScript ES modules do; the files are `.ts`. Node and Vite resolve that;
// Metro needs to be told.
const defaultResolve = config.resolver.resolveRequest
// One React and one React Native in the bundle: the app's own, the versions
// this Expo release expects. The shared packages live beside the web apps,
// whose React is newer; resolved from where they sit, they would bring it in.
const singletons = ['react', 'react-native']
const fromApp = path.join(app, 'index.ts')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest
  if (singletons.some((name) => moduleName === name || moduleName.startsWith(name + '/'))) {
    return resolve({ ...context, originModulePath: fromApp }, moduleName, platform)
  }
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        return resolve(context, moduleName.slice(0, -3) + ext, platform)
      } catch {
        // not that one
      }
    }
  }
  return resolve(context, moduleName, platform)
}

// React Native 0.87 sets its environment up from InitializeCore and no longer
// ships `rn-get-polyfills`, which this Expo's Metro config still asks for; a
// bundle then fails before it starts. Nothing is left to polyfill separately.
const reactNative = path.dirname(require.resolve('react-native/package.json', { paths: [app] }))
if (!fs.existsSync(path.join(reactNative, 'rn-get-polyfills.js'))) {
  config.serializer.getPolyfills = () => []
}

module.exports = config
