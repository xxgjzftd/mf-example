import { resolve } from 'path'

import vite from 'vite'
import vue from '@vitejs/plugin-vue'

import { routes } from './shared.js'

const server = await vite.createServer(
  {
    configFile: false,
    resolve: {
      alias: {
        '@components': resolve('packages/components/src'),
        '@container': resolve('packages/container/src'),
        '@supplier': resolve('packages/supplier/src'),
        '@utils': resolve('packages/utils/src')
      }
    },
    plugins: [vue(), routes(true)]
  }
)
await server.listen()
