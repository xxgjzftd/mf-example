import { argv } from 'process'
import { resolve } from 'path'
import { createRequire } from 'module'

import { Processor } from '@ugdu/processor'
import { serve, build } from '@ugdu/packer'

const task = new Processor().task(build)

task.hook(
  'get-config',
  () => {
    const v2Require = createRequire(resolve('packages/v2/container/package.json'))
    const v3Require = createRequire(resolve('packages/v3/container/package.json'))
    return {
      extensions: ['vue', 'ts', 'js'],
      apps: [
        {
          name: '@xx/v2-container',
          predicate: (pathname) => pathname.startsWith('/v2'),
          vite: { plugins: [v2Require('vite-plugin-vue2').createVuePlugin()] },
          packages (lps) {
            return lps.filter((lp) => lp.path.startsWith('packages/v2')).map((lp) => lp.name)
          }
        },
        {
          name: '@xx/v3-container',
          predicate: (pathname) => pathname.startsWith('/v3'),
          vite: {
            plugins: [
              v3Require('@vitejs/plugin-vue')(),
              v3Require('unplugin-vue-components/vite')(
                { resolvers: [v3Require('unplugin-vue-components/resolvers').AntDesignVueResolver()] }
              )
            ]
          },
          packages (lps) {
            return lps.filter((lp) => lp.path.startsWith('packages/v3')).map((lp) => lp.name)
          }
        }
      ],
      routes: {
        v2: {
          patterns: 'packages/v2/*/src/pages/**/*.vue',
          base: '/v2/',
          depth: 1,
          extends: [
            {
              id: 'packages/v2/layout/src/pages/layout.vue',
              path: '/v2',
              depth: 0
            }
          ]
        },
        v3: {
          patterns: 'packages/v3/*/src/pages/**/*.vue',
          base: '/v3/',
          depth: 1,
          extends: [
            {
              id: 'packages/v3/layout/src/pages/layout.vue',
              path: '/v3',
              depth: 0
            }
          ]
        }
      },
      meta: 'local',
      vite: {}
    }
  }
)

task.hook(
  'build-local-module',
  (lmn, context) => {
    console.log(lmn)
  }
)

task.run()
