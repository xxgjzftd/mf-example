import { resolve } from 'path'
import { createRequire } from 'module'

import vue from '@vitejs/plugin-vue'

export default {
  scope: '@xx',
  extensions: ['vue', 'ts', 'js'],
  apps: [
    {
      name: 'v2-container',
      predicate: (pathname) => pathname.startsWith('/v2'),
      vite ({ command, mode }, utils) {
        const require = createRequire(resolve(utils.getPkgJsonPath('@xx/v2-container')))
        return {
          plugins: [require('vite-plugin-vue2').createVuePlugin()]
        }
      },
      packages (packages, utils) {
        return packages.filter((pn) => utils.getPkgJsonPath(pn).startsWith('packages/v2'))
      }
    },
    {
      name: 'v3-container',
      predicate: (pathname) => pathname.startsWith('/v3'),
      vite () {
        return {
          plugins: [vue()]
        }
      },
      packages (packages, utils) {
        return packages.filter((pn) => utils.getPkgJsonPath(pn).startsWith('packages/v3'))
      }
    }
  ],
  routes: {
    v2: {
      glob: [['packages/v2/*/src/pages/**/*.vue']],
      base: '/v2',
      depth: 1,
      extends: [
        {
          id: 'packages/v2/container/src/pages/layout.vue',
          path: '/v2',
          depth: 0
        }
      ]
    },
    v3: {
      glob: [['packages/v3/*/src/pages/**/*.vue']],
      base: '/v3',
      depth: 1,
      extends: [
        {
          id: 'packages/v3/container/src/pages/layout.vue',
          path: '/v3',
          depth: 0
        }
      ]
    }
  }
}
