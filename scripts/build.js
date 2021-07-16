import { createHash } from 'crypto'
import { resolve } from 'path'
import { writeFile, rename } from 'fs/promises'
import { createRequire } from 'module'

import vite from 'vite'
import vue from '@vitejs/plugin-vue'
import execa from 'execa'

import resolvers from '../resolvers/index.js'
import config from '../mfe.config.js'

const require = createRequire(import.meta.url)
const meta = {
  path: resolve('meta.json')
}
meta.data = require(meta.path)
const dependencies = ['vue', 'vue-router']
const optimized = config.optimized
const target = ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1']
const getPackageInfo = (path) => require(resolve(path.replace(/(?<=(.+?\/){2}).+/, 'package.json')))
const getDigest = (content) => {
  const hash = createHash('sha256')
  hash.update(content)
  return hash.digest('hex').slice(0, 8)
}

const VENDOR = resolve('xx')
const BUILDING = 'BUILDING'
const FINISHED = 'FINISHED'

const pending = []
const build = (path) => {
  const {
    name,
    dependencies,
    mfe: { type, entry }
  } = getPackageInfo(path)
  switch (type) {
    case 'pages':
      routes.pages.build()
      break
    case 'components':
      routes.pages.build()
      break
    case 'utils':
      routes.utils.status || routes.utils.build(entry, dependencies)
      break
    case 'container':
      routes.pages.build()
      break
    default:
      throw new Error(`${name} type 未指定`)
  }
}

if (meta.data.hash) {
  const { stdout } = execa.sync('git', ['diff', meta.data.hash, 'HEAD', '--name-only'])
  const paths = stdout.split('\n')
  paths.forEach(build)
}

const valid = (dependencies) => {
  return {
    name: 'vue-mfe-valid',
    async generateBundle (options, bundle) {
      await Object.keys(bundle).map(
        async (fileName) => {
          const importedBindings = bundle[fileName].importedBindings
          await Object.keys(importedBindings).map(
            async (imported) => {
              if (Object.keys(dependencies).find((dep) => dep === imported)) {
                meta.data.vendors[imported] = meta.data.vendors[imported] || {}
                meta.data.vendors[imported].bindings = new Set(meta.data.vendors[imported].bindings || [])
                let existences = meta.data.vendors[imported].bindings
                const size = existences.size
                importedBindings[imported].forEach((binding) => existences.add(binding))
                meta.data.vendors[imported].bindings = existences = Array.from(existences)
                if (existences.length > size) {
                  await routes.vendors.build(imported, existences)
                }
              }
            }
          )
        }
      )
    }
  }
}

const routes = {
  // TODO: 节流
  vendors: {
    async build (lib, bindings) {
      const stringifyBindings = bindings.toString()
      const hash = createHash('sha256')
      hash.update(stringifyBindings)
      const outDir = 'vendors'
      const fileName = `${lib}.${hash.digest('hex').slice(0, 8)}`
      await vite.build(
        {
          configFile: false,
          build: {
            lib: {
              entry: VENDOR,
              fileName,
              formats: ['es']
            },
            outDir
          },
          plugins: [
            {
              name: 'vue-mfe-vendors',
              enforce: 'pre',
              resolveId (source, importer, options) {
                if (source === VENDOR) {
                  return VENDOR
                }
              },
              load (id) {
                if (id === VENDOR) {
                  const resolver = resolvers[lib] || resolvers[lib.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())]
                  if (resolver) {
                    bindings.map(
                      (binding) => {
                        const { path, sideEffects } = resolver(binding)
                        return `
                        ${sideEffects ? `import ${optimizedInfo.sideEffects};\n` : ''}
                        export { default as ${binding} } from "${lib}/${path}";`
                      }
                    )
                    return ``
                  } else {
                    return `export { ${stringifyBindings} } from "${lib}";`
                  }
                }
              }
            }
          ]
        }
      )
      meta.data.map[lib] = `/${outDir}/${fileName}.es.js`
    },
    status: ''
  },
  utils: {
    async build (entry, dependencies) {
      routes.utils.status = BUILDING
      const outDir = 'utils'
      const { output } = await vite.build(
        {
          configFile: false,
          build: {
            lib: {
              entry,
              fileName: 'utils',
              formats: ['es']
            },
            outDir,
            rollupOptions: {
              external: Object.keys(dependencies)
            }
          },
          plugins: [valid(dependencies)]
        }
      )
      routes.utils.status = FINISHED
      await output.map(
        async ({ fileName, code = '', source = '' }) => {
          await rename(
            fileName,
            fileName.replace(/(.+)(?=\..+?$)/, (m, p1) => p1.replace(/((?<=\.)es)?$/, getDigest(code + source)))
          )
        }
      )
    },
    status: ''
  },
  components: {
    async build () {},
    status: ''
  },
  pages: {
    async build () {},
    status: ''
  },
  container: {
    async build () {},
    status: ''
  }
}

build('packages/utils/src/index.ts')

// vite.build(
//   {
//     configFile: false,
//     plugins: [
//       vue(),
//       {
//         name: 'vue-mfe-pre',
//         enforce: 'pre',
//         apply: 'build',
//         resolveId (source, importer, options) {
//           console.log(source)
//           return (dependencies.find((dep) => dep === source) || null) && false
//         },
//         async generateBundle (options, bundle) {
//           Object.keys(bundle).forEach(
//             (fileName) => {
//               const importedBindings = bundle[fileName].importedBindings
//               Object.keys(importedBindings).forEach(
//                 async (imported) => {
//                   if (dependencies.find((dep) => dep === imported)) {
//                     meta.data.shared[imported] = meta.data.shared[imported] || {}
//                     meta.data.shared[imported].bindings = new Set(meta.data.shared[imported].bindings || [])
//                     let existence = meta.data.shared[imported].bindings
//                     const size = existence.size
//                     importedBindings[imported].forEach((binding) => existence.add(binding))
//                     meta.data.shared[imported] = existence = Array.from(existence)
//                   }
//                 }
//               )
//             }
//           )
//         },
//         transformIndexHtml () {}
//       }
//     ],
//     resolve: {
//       alias: {
//         '@container': resolve('packages/container/src'),
//         '@supplier': resolve('packages/supplier/src')
//       }
//     },
//     build: {
//       sourcemap: true,
//       minify: false,
//       rollupOptions: {
//         external: [/^@vue-mfe\//]
//         // input: [
//         //   resolve('packages/supplier/src/pages/xx/index.vue'),
//         //   resolve('packages/supplier/src/pages/xx/detail.vue')
//         // ]
//       }
//     }
//   }
// )
