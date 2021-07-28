import { resolve } from 'path'
import fq from 'fast-glob'

const ROUTES = 'routes'

const routes = (isDev = false) => {
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
                )}, component: () => ${
                  isDev
                    ? `import("${path.replace(/packages\/(.+?)\/src(.+)/, '@$1$2')}")`
                    : `mfe.preload("${path.replace(/^packages/, '@vue-mfe')}")`
                } }`
            )
            .join(',') +
          ']'
        )
      }
    }
  }
}

export { routes }
