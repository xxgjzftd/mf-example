import { resolve } from 'path'
import { readFile, writeFile, rm } from 'fs/promises'
import { createRequire } from 'module'
import { argv, exit } from 'process'

import vite from 'vite'
import vue from '@vitejs/plugin-vue'
import execa from 'execa'
import axios from 'axios'
import fq from 'fast-glob'

import resolvers from '../resolvers/index.js'

const require = createRequire(import.meta.url)

const DIST = 'dist'
const ASSETS = 'assets'
const VENDOR = 'vendor'
const ROUTES = 'routes'
let meta
let ossUrl
const mode = argv[2]
try {
  switch (mode) {
    case 'qa':
      ossUrl = 'qa oss url'
      meta = await axios.get('qa meta oss url')
      break
    case 'prod':
      ossUrl = 'prod oss url'
      meta = await axios.get('prod meta oss url')
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
  sources = fq.sync('packages/*/src/**/*.{ts,tsx,vue}').map(
    (path) => {
      return { status: 'A', path }
    }
  )
}
!sources.length && exit()
meta.hash = execa.sync('git', ['rev-parse', '--short', 'HEAD']).stdout

const vendorsDepInfo = {}
const cached = (fn) => {
  const cache = Object.create(null)
  return (str) => cache[str] || (cache[str] = fn(str))
}
const helper = {
  scope: '@vue-mfe',
  localPkgNameRegExp: /^@vue-mfe\//,
  isLocalPkg: cached((pkgName) => helper.localPkgNameRegExp.test(pkgName)),
  rm (mn) {
    const info = meta.modules[mn]
    const removals = []
    if (info) {
      info.js && removals.push(info.js)
      info.css && removals.push(info.css)
    }
    if (mode) {
      removals.forEach(
        (path) =>
          rm(
            resolve(DIST, path.slice(1)),
            {
              force: true,
              recursive: true
            }
          )
      )
    } else {
      // oss rm
    }
  },
  getPkgId: cached((path) => path.replace(/^packages\/(.+?)\/.+/, '$1')),
  getPkgInfoFromPkgId: cached((pkgId) => require(resolve(`packages/${pkgId}/package.json`))),
  getPkgInfo: cached((path) => helper.getPkgInfoFromPkgId(helper.getPkgId(path))),
  getLocalModuleName: cached(
    (path) => {
      const pkg = helper.getPkgInfo(path)
      const {
        name,
        mfe: { type }
      } = pkg
      if (type === 'pages') {
        return path.replace(/.+?\/.+?(?=\/)/, name)
      } else {
        return name
      }
    }
  ),
  getModuleInfo: cached((mn) => (meta.modules[mn] = meta.modules[mn] || {})),
  getAliasKeyFromPkgId: cached((pkgId) => `@${pkgId}`),
  getAliasKey: cached((path) => helper.getAliasKeyFromPkgId(helper.getPkgId(path))),
  getAliasFromPkgId: cached(
    (pkgId) => {
      const pkg = helper.getPkgInfoFromPkgId(pkgId)
      const {
        mfe: { type }
      } = pkg
      const alias = []
      const aliasKey = helper.getAliasKeyFromPkgId(pkgId)
      if (type === 'pages') {
        alias.push(
          { find: new RegExp(aliasKey + '(/.+\\.(vue|ts|tsx))'), replacement: `${helper.scope}/${pkgId}/src$1` }
        )
      }
      alias.push({ find: aliasKey, replacement: resolve(`packages/${pkgId}/src`) })
      return alias
    }
  ),
  getAlias: cached((path) => helper.getAliasFromPkgId(helper.getPkgId(path))),
  getExternalFromPkgId: cached(
    (pkgId) => [...Object.keys(helper.getPkgInfoFromPkgId(pkgId).dependencies), helper.localPkgNameRegExp]
  ),
  getExternal: cached((path) => helper.getExternalFromPkgId(helper.getPkgId(path))),
  setVendorsDepInfo: cached(
    (mn) => {
      const info = (vendorsDepInfo[mn] = vendorsDepInfo[mn] || {})
      const { peerDependencies } = require(`${mn}/package.json`)
      if (peerDependencies) {
        info.dependencies = Object.keys(peerDependencies)
        info.dependencies.forEach(
          (dep) => {
            const depInfo = (vendorsDepInfo[dep] = vendorsDepInfo[dep] || {})
            depInfo.dependents = depInfo.dependents || []
            depInfo.dependents.push(mn)
          }
        )
      }
      return true
    }
  ),
  getVendorsExports () {
    const vendorsExports = {}
    Object.keys(meta.modules).forEach(
      (mn) => {
        const { imports } = meta.modules[mn]
        if (imports) {
          Object.keys(imports).forEach(
            (imported) => {
              if (!helper.isLocalPkg(imported)) {
                helper.setVendorsDepInfo(imported)
                const bindings = (vendorsExports[imported] = vendorsExports[imported] || new Set())
                imports[imported].forEach((binding) => bindings.add(binding))
              }
            }
          )
        }
      }
    )
    Object.keys(vendorsExports).forEach(
      (vendor) => {
        vendorsExports[vendor] = Array.from(vendorsExports[vendor])
        vendorsExports[vendor].sort()
      }
    )
    return vendorsExports
  }
}

const preVendorsExports = helper.getVendorsExports()
const plugins = {
  meta (pathOrMN, isVendor = false) {
    return {
      name: 'vue-mfe-meta',
      generateBundle (options, bundle) {
        const mn = isVendor ? pathOrMN : helper.getLocalModuleName(pathOrMN)
        const info = helper.getModuleInfo(mn)
        const fileNames = Object.keys(bundle)
        const js = fileNames.find((fileName) => bundle[fileName].isEntry)
        const css = fileNames.find((fileName) => fileName.endsWith('.css'))
        info.js = `/${js}`
        css && (info.css = `/${css}`)
        const { importedBindings } = bundle[js]
        info.imports = importedBindings
      }
    }
  },
  routes () {
    return {
      name: 'vue-mfe-routes',
      resolveId (source, importer, options) {
        if (source === ROUTES) {
          return ROUTES
        }
      },
      async load (id) {
        if (id === ROUTES) {
          // 不检查包类型，提升性能。
          const pages = await fq('packages/*/src/pages/**/*.{vue,tsx}')
          return (
            'export default [' +
            pages
              .map(
                (path) =>
                  `{ path: ${path.replace(
                    /packages\/(.+?)\/src\/pages\/(.+?)(\/index)?\.(vue|tsx)/,
                    '"/$1/$2"'
                  )}, component: () => mfe.preload("${path.replace(/^packages/, helper.scope)}") }`
              )
              .join(',') +
            ']'
          )
        }
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

const builder = {
  async vendors (mn) {
    const info = vendorsDepInfo[mn]
    const preBindings = preVendorsExports[mn]
    let curBindings = curVendorsExports[mn]
    if (info.dependents) {
      await Promise.all(info.dependents.map((dep) => builder.vendors(dep)))
      curBindings = new Set(curBindings)
      info.dependents.forEach((dep) => meta.modules[dep].imports[mn].forEach((binding) => curBindings.add(binding)))
      curBindings = curVendorsExports[mn] = Array.from(curBindings).sort()
    }
    if (!preBindings || preBindings.toString() !== curBindings.toString()) {
      helper.rm(mn)
      return vite.build(
        {
          configFile: false,
          publicDir: false,
          build: {
            sourcemap: true,
            minify: false,
            emptyOutDir: false,
            lib: {
              entry: resolve(VENDOR),
              fileName: `${ASSETS}/${mn}.[hash]`,
              formats: ['es']
            },
            rollupOptions: {
              external: info.dependencies
            }
          },
          plugins: [
            {
              name: 'vue-mfe-vendors',
              enforce: 'pre',
              resolveId (source, importer, options) {
                if (source === resolve(VENDOR)) {
                  return VENDOR
                }
              },
              load (id) {
                if (id === VENDOR) {
                  const resolver = resolvers[mn.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())]
                  if (resolver) {
                    return curBindings
                      .map(
                        (binding) => {
                          const { path, sideEffects } = resolver(binding)
                          return `${sideEffects ? `import ${optimizedInfo.sideEffects};\n` : ''}
                            export { default as ${binding} } from "${mn}/${path}";`
                        }
                      )
                      .join('\n')
                  } else {
                    return `export { ${curBindings.toString()} } from "${mn}";`
                  }
                }
              }
            },
            plugins.meta(mn, true)
          ]
        }
      )
    }
  },
  // utils components pages
  async lib (path) {
    return vite.build(
      {
        configFile: false,
        publicDir: false,
        resolve: {
          alias: helper.getAlias(path)
        },
        build: {
          sourcemap: true,
          minify: false,
          emptyOutDir: false,
          rollupOptions: {
            input: resolve(path),
            output: {
              entryFileNames: `${ASSETS}/[name]-[hash].js`,
              chunkFileNames: `${ASSETS}/[name]-[hash].js`,
              assetFileNames: `${ASSETS}/[name]-[hash][extname]`,
              format: 'es'
            },
            preserveEntrySignatures: 'allow-extension',
            external: helper.getExternal(path)
          }
        },
        plugins: [vue(), plugins.meta(path)]
      }
    )
  },
  async container (path) {
    return vite.build(
      {
        configFile: false,
        resolve: {
          alias: helper.getAlias(path)
        },
        build: {
          sourcemap: true,
          minify: false,
          emptyOutDir: false,
          rollupOptions: {
            external: helper.getExternal(path)
          }
        },
        plugins: [vue(), plugins.meta(path), plugins.routes()]
      }
    )
  }
}

let containerName = ''
const built = new Set()
const build = async ({ path, status }) => {
  const pkg = helper.getPkgInfo(path)
  const {
    name,
    main,
    mfe: { type }
  } = pkg
  if (status !== 'A') {
    helper.rm(helper.getLocalModuleName(path))
  }
  switch (type) {
    case 'pages':
      return builder.lib(path)
    case 'components':
    case 'utils':
    case 'container':
      return (
        built.has(name) ||
        (built.add(name),
        builder[type === 'container' ? ((containerName = name), type) : 'lib'](path.replace(/(?<=(.+?\/){2}).+/, main)))
      )
    default:
      throw new Error(`${name} type 未指定`)
  }
}

await Promise.all(sources.map(build))

const curVendorsExports = helper.getVendorsExports()
Object.keys(preVendorsExports).forEach(
  (vendor) => {
    if (!(vendor in curVendorsExports)) {
      helper.rm(vendor)
    }
  }
)

await Promise.all(
  Object.keys(curVendorsExports)
    .filter((vendor) => !vendorsDepInfo[vendor].dependencies)
    .map((vendor) => builder.vendors(vendor))
)
await Promise.all(
  [
    writeFile(resolve(`${DIST}/meta.json`), JSON.stringify(meta, 2)),
    (built.has(containerName)
      ? readFile(resolve(`${DIST}/index.html`), { encoding: 'utf8' })
      : axios.get('mode index.html oss url').then((res) => res.data)
    ).then(
      (html) => {
        let importmap = { imports: {} }
        const imports = importmap.imports
        Object.keys(meta.modules).forEach((mn) => (imports[mn] = meta.modules[mn].js))
        importmap = `<script type="importmap">${JSON.stringify(importmap)}</script>`
        let modules = `<script>window.mfe = window.mfe || {};window.mfe.modules = ${JSON.stringify(
          meta.modules
        )}</script>`
        return writeFile(
          resolve(`${DIST}/index.html`),
          html.replace(
            built.has(containerName)
              ? '<!-- mfe placeholder -->'
              : /\<script type="importmap"\>.+?\<script\>window\.mfe\.+?<\/script\>/,
            importmap + modules
          )
        )
      }
    )
  ]
)

// TODO: dev route
// TODO: oss
