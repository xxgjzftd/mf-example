import { createHash } from 'crypto'
import { basename, resolve, normalize } from 'path'
import { writeFile, rename } from 'fs/promises'
import { createRequire } from 'module'
import { argv } from 'process'

import vite from 'vite'
import vue from '@vitejs/plugin-vue'
import execa from 'execa'
import axios from 'axios'
import fq from 'fast-glob'

import resolvers from '../resolvers/index.js'
import config from '../mfe.config.js'

const require = createRequire(import.meta.url)

let meta
const mode = argv[2]
try {
  switch (mode) {
    case 'qa':
      meta = await axios.get('qa meta oss url')
      break
    case 'prod':
      meta = await axios.get('prod meta oss url')
      break
    default:
      meta = require(resolve('meta.json'))
      break
  }
} catch (error) {
  meta = {}
}

if (meta.hash) {
  const { stdout } = execa.sync('git', ['diff', meta.hash, 'HEAD', '--name-only'])
  entries = stdout.split('\n')
} else {
  entries = fq.sync('packages/*/src/**/*.{ts,tsx,vue}')
}

const getPackageInfo = (path) => require(resolve(path.replace(/(?<=(.+?\/){2}).+/, 'package.json')))

const VIRTUALPAGE = 'VIRTUALPAGE'
const PAGE = 'PAGE'
const VENDOR = resolve('xx')
const DIST = 'dist'
const ASSETS = 'assets'

const localPkgNameRegExp = /^@vue-mfe\//

const allDeps = new Set()
const addToAllDeps = (dependencies) => dependencies.forEach((dep) => allDeps.add(dep))
const getAlias = (name) => {
  const dir = name.replace(localPkgNameRegExp, '')
  return {
    [`@${dir}`]: resolve(`packages/${dir}/src`)
  }
}
const getExternal = (dependencies) => [...Object.keys(dependencies), localPkgNameRegExp]

const valid = (entry, { name, dependencies }) => {
  return {
    name: 'vue-mfe-valid',
    generateBundle (options, bundle) {
      Object.keys(bundle).forEach(
        (fileName) => {
          const { importedBindings = {} } = bundle[fileName]
          Object.keys(importedBindings).forEach(
            (imported) => {
              if (Object.keys(dependencies).find((dep) => dep === imported)) {
                const vendor = (meta.data.vendors[imported] = meta.data.vendors[imported] || {})
                const bindings = (vendor.bindings = vendor.bindings || {})
                const stales = new Set(Object.keys(bindings))
                importedBindings[imported].forEach(
                  (binding) => {
                    const entries = (bindings[binding] = bindings[binding] || [])
                    if (!entries.find((e) => e === entry)) {
                      entries.push(entry)
                    }
                    stales.delete(binding)
                  }
                )
                stales.forEach(
                  (binding) => {
                    const entries = bindings[binding]
                    const index = entries.findIndex((e) => e === entry)
                    if (~index) {
                      entries.splice(index, 1)
                    }
                  }
                )
              } else if (!localPkgNameRegExp.test(imported)) {
                throw new Error(`${name} 中依赖了 ${imported}， 但没有在 package.json 中声明`)
              }
            }
          )
        }
      )
    }
  }
}

const pages = () => {
  return {
    name: 'vue-mfe-page',
    enforce: 'pre',
    resolveId (source, importer, options) {
      if (source.startsWith(VIRTUALPAGE)) {
        return source
      }
      if (source.startsWith(PAGE)) {
        const entry = source.split('?', 2)[1]
        return this.resolve(resolve(entry))
      }
    },
    load (id) {
      if (id.startsWith(VIRTUALPAGE)) {
        const entry = id.split('?', 2)[1]
        return `const page = () => import("${PAGE + '?' + entry}");export default page;`
      }
    },
    generateBundle (options, bundle) {
      console.log(bundle)
    }
  }
}

const builder = {
  async vendors (lib, bindings) {
    const stringifyBindings = bindings.toString()
    const [{ output }] = await vite.build(
      {
        configFile: false,
        publicDir: false,
        build: {
          lib: {
            entry: VENDOR,
            fileName: `${lib}.[hash]`,
            formats: ['es']
          },
          rollupOptions: {
            output: {
              dir: `${DIST}/${ASSETS}`,
              external: Array.from(allDeps)
            }
          }
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
                const resolver = resolvers[lib.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())]
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
    console.log(output)
    // meta.data.map[lib] = `/${outDir}/${fileName}.es.js`
  },
  // utils components pages
  async lib (entry, pkg) {
    const { name, dependencies } = pkg
    const external = getExternal(dependencies)
    addToAllDeps(external)
    return vite.build(
      {
        configFile: false,
        publicDir: false,
        resolve: {
          alias: getAlias(name)
        },
        build: {
          sourcemap: true,
          minify: false,
          emptyOutDir: false,
          rollupOptions: {
            input: entry,
            output: {
              dir: `${DIST}/${ASSETS}`,
              entryFileNames: '[name]-[hash].js',
              chunkFileNames: '[name]-[hash].js',
              assetFileNames: '[name]-[hash][extname]',
              format: 'es'
            },
            preserveEntrySignatures: 'allow-extension',
            external: [...external, /^@supplier/]
          }
        },
        plugins: [pages(), vue(), valid(entry, pkg)]
      }
    )
  },
  async container (entry, pkg) {
    const { name, dependencies } = pkg
    const external = getExternal(dependencies)
    addToAllDeps(external)
    return vite.build(
      {
        configFile: false,
        resolve: {
          alias: getAlias(name)
        },
        build: {
          minify: false,
          sourcemap: true,
          rollupOptions: {
            external
          }
        },
        plugins: [vue(), valid(entry, pkg)]
      }
    )
  }
}
const built = new Set()
const build = (path) => {
  const pkg = getPackageInfo(path)
  const {
    name,
    mfe: { type, entry }
  } = pkg
  switch (type) {
    case 'pages':
      return builder.lib(`${VIRTUALPAGE}?${path}`, pkg)
    // return builder.lib(resolve(path), pkg)
    case 'components':
    case 'utils':
    case 'container':
      return (
        built.has(type) ||
        (built.add(type), builder[type === 'container' ? type : 'lib'](path.replace(/(?<=(.+?\/){2}).+/, entry), pkg))
      )
    default:
      throw new Error(`${name} type 未指定`)
  }
}
let entries = []
if (meta.data.hash) {
  const { stdout } = execa.sync('git', ['diff', meta.data.hash, 'HEAD', '--name-only'])
  entries = stdout.split('\n')
} else {
  entries = fq.sync('packages/*/src/**/*.{ts,tsx,vue}')
}
// await entries.map(build)

await build('packages/supplier/src/pages/xx/index.vue')
console.log(meta.data)

// await build('packages/container/src/index.ts')
// console.log(meta.data)

// build('packages/utils/src/index.ts')
// console.log(meta.data)
