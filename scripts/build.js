import { resolve } from 'path'
import { readFile, writeFile, rm } from 'fs/promises'
import { createRequire } from 'module'
import { argv, exit } from 'process'

import vite from 'vite'
import vue from '@vitejs/plugin-vue'
import execa from 'execa'
import axios from 'axios'
import fg from 'fast-glob'

import { routes } from './plugins.js'
import config from '../mfe.config.js'
import {
  constants,
  cached,
  isLocalModule,
  getPkgInfo,
  getPkgConfig,
  getVendorPkgInfo,
  getLocalModuleName,
  getAlias,
  getExternal,
  isRoute,
  getAliasFromPkgId,
  getExternalFromPkgId,
  getPkgInfoFromPkgId,
  getResolver
} from './utils.js'

const require = createRequire(import.meta.url)

const { DIST, ASSETS, VENDOR, PAGES, COMPONENTS, UTILS, CONTAINER } = constants
let meta
let base = '/'
const mode = argv[2]
try {
  switch (mode) {
    case 'qa':
    case 'prod':
      base = await vite.resolveConfig({ mode }, 'build').then((res) => res.base)
      meta = await axios.get(`${base}meta.json`).then((res) => res.data)
      break
    default:
      meta = require(resolve(`${DIST}/meta.json`))
      break
  }
} catch (error) {
  meta = {}
}
meta.modules = meta.modules || {}

let sources = []
if (meta.hash) {
  const { stdout } = execa.sync('git', ['diff', meta.hash, 'HEAD', '--name-status'])
  sources = stdout
    .split('\n')
    .map(
      (info) => {
        const [status, path] = info.split('\t')
        return { status, path }
      }
    )
    .filter(({ path }) => /packages\/.+?\/src\/.+/.test(path))
} else {
  sources = fg.sync('packages/*/src/**/*.{ts,tsx,vue}').map(
    (path) => {
      return { status: 'A', path }
    }
  )
}
!sources.length && exit()
meta.hash = execa.sync('git', ['rev-parse', '--short', 'HEAD']).stdout

const remove = (mn) => {
  const info = meta.modules[mn]
  const removals = []
  if (info) {
    Reflect.deleteProperty(meta.modules, mn)
    info.js && removals.push(info.js)
    info.css && removals.push(info.css)
  }
  if (!mode) {
    removals.forEach(
      (path) =>
        rm(
          resolve(DIST, path),
          {
            force: true,
            recursive: true
          }
        )
    )
  }
}

const getModuleInfo = cached((mn) => (meta.modules[mn] = meta.modules[mn] || {}))

const getAllDepsOfVendor = (vendor, vendors, deps = new Set()) => {
  const { dependencies } = getVendorPkgInfo(vendor)
  if (dependencies) {
    Object.keys(dependencies).forEach(
      (dep) => {
        deps.add(dep)
        !vendors.has(dep) && getAllDepsOfVendor(dep, vendors, deps)
      }
    )
  }
  return deps
}

const vendorToRefCountMap = {}
const vendorsDepInfo = {}

const getVendorsExports = (isPre = false) => {
  const vendorsExports = {}
  Object.keys(meta.modules).forEach(
    (mn) => {
      if (isPre || isLocalModule(mn)) {
        const { imports } = meta.modules[mn]
        if (imports) {
          Object.keys(imports).forEach(
            (imported) => {
              if (imports[imported].length && !isLocalModule(imported)) {
                const bindings = (vendorsExports[imported] = vendorsExports[imported] || new Set())
                imports[imported].forEach((binding) => bindings.add(binding))
              }
            }
          )
        }
      }
    }
  )
  let vendors = new Set(Object.keys(vendorsExports))
  if (!isPre) {
    vendors.forEach(
      (vendor) => {
        getAllDepsOfVendor(vendor, vendors).forEach(
          (dep) => {
            vendorToRefCountMap[dep] = (vendorToRefCountMap[dep] || 0) + 1
          }
        )
      }
    )
    Object.keys(vendorToRefCountMap).forEach(
      (vendor) => {
        if (vendorToRefCountMap[vendor] > 1) {
          vendors.add(vendor)
        }
      }
    )
    vendors.forEach(
      (vendor) => {
        const info = (vendorsDepInfo[vendor] = vendorsDepInfo[vendor] || {})
        const { peerDependencies, dependencies } = require(`${vendor}/package.json`)
        info.dependencies = []
        if (peerDependencies) {
          info.dependencies = Object.keys(peerDependencies)
        }
        if (dependencies) {
          Object.keys(dependencies).forEach((dep) => vendors.has(dep) && info.dependencies.push(dep))
        }
        info.dependencies.forEach(
          (dep) => {
            const depInfo = (vendorsDepInfo[dep] = vendorsDepInfo[dep] || {})
            depInfo.dependents = depInfo.dependents || []
            depInfo.dependents.push(vendor)
          }
        )
      }
    )
  }
  vendors.forEach(
    (vendor) => {
      if (vendorsExports[vendor]) {
        vendorsExports[vendor] = Array.from(vendorsExports[vendor])
        vendorsExports[vendor].sort()
      } else {
        vendorsExports[vendor] = []
      }
    }
  )
  return vendorsExports
}

const preVendorsExports = getVendorsExports(true)
const plugins = {
  meta (mn) {
    return {
      name: 'vue-mfe-meta',
      generateBundle (options, bundle) {
        const info = getModuleInfo(mn)
        const fileNames = Object.keys(bundle)
        const js = fileNames.find((fileName) => bundle[fileName].isEntry)
        const css = fileNames.find((fileName) => fileName.endsWith('.css'))
        info.js = js
        css && (info.css = css)
        const { importedBindings } = bundle[js]
        info.imports = importedBindings
        Object.keys(importedBindings).forEach(
          (imported) => {
            if (
              isLocalModule(imported) &&
              !meta.modules[imported] &&
              !sources.find((source) => getLocalModuleName(source.path) === imported)
            ) {
              throw new Error(`'${mn}'中引用的'${imported}'模块不存在。`)
            }
          }
        )
      }
    }
  },
  // 如果有动态import的需求，再加上相应实现。暂时不用这个plugin。
  import () {
    return {
      name: 'vue-mfe-import',
      options (options) {
        const index = options.plugins.findIndex((plugin) => plugin.name === 'vite:import-analysis')
        if (~index) {
          options.plugins.splice(index, 1)
        } else {
          throw new Error('vite 内置插件有变动，构建结果可能有缺陷')
        }
      }
    }
  }
}

let containerName = ''
const built = new Set()
const builder = {
  vendors: cached(
    async (mn) => {
      const info = vendorsDepInfo[mn]
      const preBindings = preVendorsExports[mn]
      let curBindings = curVendorsExports[mn]
      if (info.dependents) {
        await Promise.all(info.dependents.map((dep) => builder.vendors(dep)))
        curBindings = new Set(curBindings)
        info.dependents.forEach(
          (dep) =>
            meta.modules[dep].imports[mn] &&
            meta.modules[dep].imports[mn].forEach((binding) => curBindings.add(binding))
        )
        curBindings = curVendorsExports[mn] = Array.from(curBindings).sort()
      }
      const curHasStar = curBindings.find((binding) => binding === '*')
      if (
        !preBindings ||
        (!(preBindings.find((binding) => binding === '*') && curHasStar) &&
          preBindings.toString() !== curBindings.toString())
      ) {
        remove(mn)
        const input = resolve(VENDOR)
        return vite.build(
          {
            mode,
            publicDir: false,
            build: {
              rollupOptions: {
                input,
                output: {
                  entryFileNames: `${ASSETS}/${mn}.[hash].js`,
                  chunkFileNames: `${ASSETS}/${mn}.[hash].js`,
                  assetFileNames: `${ASSETS}/${mn}.[hash][extname]`,
                  format: 'es',
                  manualChunks: null
                },
                preserveEntrySignatures: 'allow-extension',
                external: info.dependencies
              }
            },
            plugins: [
              {
                name: 'vue-mfe-vendors',
                enforce: 'pre',
                resolveId (source, importer, options) {
                  if (source === input) {
                    return VENDOR
                  }
                },
                load (id) {
                  if (id === VENDOR) {
                    const resolver = getResolver(mn)
                    if (resolver) {
                      const getSideEffectsCode = (sideEffects) =>
                        sideEffects ? `import "${mn}/${sideEffects}";\n` : ''
                      if (curHasStar) {
                        const { path, sideEffects } = resolver('*')
                        return getSideEffectsCode(sideEffects) + `export * from "${mn}/${path}";`
                      }
                      return curBindings
                        .map(
                          (binding) => {
                            const { path, sideEffects } = resolver(binding)
                            return (
                              getSideEffectsCode(sideEffects) + `export { default as ${binding} } from "${mn}/${path}";`
                            )
                          }
                        )
                        .join('\n')
                    } else {
                      return curHasStar
                        ? `export * from "${mn}";`
                        : `export { ${curBindings.toString()} } from "${mn}";`
                    }
                  }
                }
              },
              plugins.meta(mn)
            ]
          }
        )
      }
    }
  ),
  // utils components pages
  async lib (path) {
    const mn = getLocalModuleName(path)
    return (
      built.has(mn) ||
      (built.add(mn),
      vite.build(
        {
          mode,
          publicDir: false,
          resolve: {
            alias: getAlias(path)
          },
          build: {
            rollupOptions: {
              input: resolve(path),
              output: {
                entryFileNames: `${ASSETS}/[name].[hash].js`,
                chunkFileNames: `${ASSETS}/[name].[hash].js`,
                assetFileNames: `${ASSETS}/[name].[hash][extname]`,
                format: 'es'
              },
              preserveEntrySignatures: 'allow-extension',
              external: getExternal(path)
            }
          },
          plugins: [vue(), plugins.meta(mn)]
        }
      ))
    )
  },
  async container () {
    const pkgId = Object.keys(config.packages).find((pkgId) => config.packages[pkgId].type === CONTAINER)
    const mn = getPkgInfoFromPkgId(pkgId).name
    containerName = mn
    return (
      built.has(mn) ||
      (built.add(mn),
      vite.build(
        {
          mode,
          resolve: {
            alias: getAliasFromPkgId(pkgId)
          },
          build: {
            rollupOptions: {
              external: getExternalFromPkgId(pkgId)
            }
          },
          plugins: [vue(), plugins.meta(mn), routes()]
        }
      ))
    )
  }
}

const build = async ({ path, status }) => {
  const pkg = getPkgInfo(path)
  const { name, main } = pkg
  const { type } = getPkgConfig(path)
  if (status !== 'A') {
    remove(getLocalModuleName(path))
  }
  if (isRoute(path)) {
    return Promise.all([builder.lib(path), status === 'A' && builder.container()])
  }
  switch (type) {
    case PAGES:
      return builder.lib(path)
    case COMPONENTS:
    case UTILS:
      return builder.lib(path.replace(/(?<=(.+?\/){2}).+/, main))
    case CONTAINER:
      return builder.container()
    default:
      throw new Error(`${name} type 未指定`)
  }
}

await Promise.all(sources.map(build))

const curVendorsExports = getVendorsExports()
Object.keys(preVendorsExports).forEach(
  (vendor) => {
    if (!(vendor in curVendorsExports)) {
      remove(vendor)
    }
  }
)

await Promise.all(
  Object.keys(curVendorsExports)
    .filter((vendor) => !vendorsDepInfo[vendor].dependencies.length)
    .map((vendor) => builder.vendors(vendor))
)
await Promise.all(
  [
    writeFile(resolve(`${DIST}/meta.json`), JSON.stringify(meta)),
    (built.has(containerName) || !mode
      ? readFile(resolve(`${DIST}/index.html`), { encoding: 'utf8' })
      : axios.get(`${base}index.html`).then((res) => res.data)
    ).then(
      (html) => {
        let importmap = { imports: {} }
        const imports = importmap.imports
        Object.keys(meta.modules).forEach((mn) => (imports[mn] = base + meta.modules[mn].js))
        importmap = `<script type="importmap">${JSON.stringify(importmap)}</script>`
        let modules =
          `<script>window.mfe = window.mfe || {};` +
          `window.mfe.base = '${base}';` +
          `window.mfe.modules = ${JSON.stringify(meta.modules)}</script>`
        return writeFile(
          resolve(`${DIST}/index.html`),
          html.replace(
            built.has(containerName)
              ? '<!-- mfe placeholder -->'
              : /\<script type="importmap"\>.+?\<script\>window\.mfe.+?<\/script\>/,
            importmap + modules
          )
        )
      }
    )
  ]
)
