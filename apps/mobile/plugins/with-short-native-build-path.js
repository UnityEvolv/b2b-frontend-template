// Windows limits a path to 260 characters, and CMake names each native
// object file after its source's full path, under the app's own build
// folder. In a workspace checkout those paths run past the limit and the
// native build fails. On Windows only, the native build's working folder
// moves to a short one at the root of the system drive.
const { withAppBuildGradle } = require('expo/config-plugins')

const marker = '// b2b-template: a short native build path on Windows'

module.exports = function withShortNativeBuildPath(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(marker)) return mod
    mod.modResults.contents += `
${marker}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    android {
        externalNativeBuild {
            cmake {
                buildStagingDirectory = new File(System.getenv('SystemDrive') + '/uo-cxx')
            }
        }
    }
}
`
    return mod
  })
}
