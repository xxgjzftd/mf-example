import { resolve } from 'path'
import { createRequire } from 'module'
import { cwd } from 'process'

import { normalizePath } from 'vite'

import resolvers from './resolvers/index.js'
import config from '../mfe.config.js'

const require = createRequire(import.meta.url)

const constants = {
  DIST: 'dist',
  ASSETS: 'assets',
  VENDOR: 'vendor',
  ROUTES: 'routes',
  SCOPE: '@vue-mfe',

  PAGES: 'pages',
  COMPONENTS: 'components',
  UTILS: 'utils',
  CONTAINER: 'container'
}
const localModuleNameRegExp = new RegExp(`^${constants.SCOPE}/`)
const once = (fn) => {
  let hasRun = false
  let res
  return (...args) => {
    if (!hasRun) {
      hasRun = true
      res = fn(...args)
    }
    return res
  }
}
const cached = (fn) => {
  const cache = Object.create(null)
  return (str) => cache[str] || (cache[str] = fn(str))
}
const isRoute = cached((path) => /packages\/.+?\/src\/pages\/.+(vue|tsx)/.test(path))
const isLocalModule = cached((mn) => localModuleNameRegExp.test(mn))
const getResolver = cached((mn) => mn && resolvers[mn.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())])
const getNormalizedPath = cached((path) => normalizePath(path.replace(cwd(), '')).slice(1))
const getPkgId = cached((path) => path.replace(/^packages\/(.+?)\/.+/, '$1'))
const getPkgInfoFromPkgId = cached((pkgId) => require(resolve(`packages/${pkgId}/package.json`)))
const getPkgInfo = cached((path) => getPkgInfoFromPkgId(getPkgId(path)))
const getPkgConfigFromPkgId = cached((pkgId) => config.packages[pkgId])
const getPkgConfig = cached((path) => getPkgConfigFromPkgId(getPkgId(path)))
const getLocalModuleName = cached(
  (path) => {
    const pkg = getPkgInfo(path)
    const { name } = pkg
    const { type } = getPkgConfig(path)
    if (type === 'pages' || isRoute(path)) {
      return path.replace(/.+?\/.+?(?=\/)/, name)
    } else {
      return name
    }
  }
)
const getAliasKeyFromPkgId = cached((pkgId) => `@${pkgId}`)
const getAliasKey = cached((path) => getAliasKeyFromPkgId(getPkgId(path)))
const getAliasFromPkgId = cached(
  (pkgId) => {
    const { type } = getPkgConfigFromPkgId(pkgId)
    const alias = []
    const aliasKey = getAliasKeyFromPkgId(pkgId)
    if (type === 'pages') {
      alias.push(
        { find: new RegExp(aliasKey + '(/.+\\.(vue|ts|tsx))'), replacement: `${constants.SCOPE}/${pkgId}/src$1` }
      )
    }
    alias.push({ find: aliasKey, replacement: resolve(`packages/${pkgId}/src`) })
    return alias
  }
)
const getAlias = cached((path) => getAliasFromPkgId(getPkgId(path)))
const getDevAlias = () => {
  const alias = {}
  Object.keys(config.packages).forEach(
    (pkgId) => (alias[getAliasKeyFromPkgId(pkgId)] = resolve(`packages/${pkgId}/src`))
  )
  return alias
}
const getExternalFromPkgId = cached(
  (pkgId) => [...Object.keys(getPkgInfoFromPkgId(pkgId).dependencies), localModuleNameRegExp]
)
const getExternal = cached((path) => getExternalFromPkgId(getPkgId(path)))
const stringify = (payload, replacer) => {
  const type = typeof payload
  switch (type) {
    case 'object':
      const isArray = Array.isArray(payload)
      let content = isArray
        ? payload.map((value, index) => (replacer && replacer(index, value)) ?? stringify(value, replacer))
        : Object.keys(payload).map(
            (key) => `${key}:${(replacer && replacer(key, payload[key])) ?? stringify(payload[key], replacer)}`
          )
      content = content.join(',')
      return (replacer && replacer('', payload)) ?? isArray ? `[${content}]` : `{${content}}`
    case 'function':
      return payload.toString()
    default:
      return JSON.stringify(payload)
  }
}

export {
  constants,
  localModuleNameRegExp,
  once,
  cached,
  isRoute,
  isLocalModule,
  getResolver,
  getNormalizedPath,
  getPkgId,
  getPkgInfoFromPkgId,
  getPkgInfo,
  getPkgConfigFromPkgId,
  getPkgConfig,
  getLocalModuleName,
  getAliasKeyFromPkgId,
  getAliasKey,
  getAliasFromPkgId,
  getAlias,
  getDevAlias,
  getExternalFromPkgId,
  getExternal,
  stringify
}
