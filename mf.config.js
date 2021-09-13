import { resolve } from 'path'
import { createRequire } from 'module'

import vue from '@vitejs/plugin-vue'

export default {
  scope: '@xx',
  extensions: ['vue', 'ts', 'js'],
  apps: [
    {
      name: 'v2-container',
      predicate: () => location.pathname.startsWith('/v2')
    },
    {
      name: 'v3-container',
      predicate: () => location.pathname.startsWith('/v3')
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
  },
  vite (lmn, utils) {
    const pn = utils.getPkgName(lmn)
    const config = {
      plugins: []
    }
    if (pn.startsWith('@xx/v3')) {
      config.plugins.push(vue())
    } else if (pn.startsWith('@xx/v2')) {
      const require = createRequire(resolve(utils.getPkgPathFromLmn(lmn), 'package.json'))
      config.plugins.push(require('vite-plugin-vue2').createVuePlugin())
    }
    return config
  }
}
