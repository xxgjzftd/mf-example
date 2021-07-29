import vite from 'vite'
import vue from '@vitejs/plugin-vue'

import { routes } from './plugins.js'
import { constants, isRoute, getDevAlias } from './utils.js'

const { ws, watcher, moduleGraph, listen } = await vite.createServer(
  {
    configFile: false,
    resolve: {
      alias: getDevAlias()
    },
    plugins: [vue(), routes(true)]
  }
)

const refresh = (path) =>
  isRoute(path) &&
  (moduleGraph.invalidateModule(moduleGraph.getModuleById(constants.ROUTES)), ws.send({ type: 'full-reload' }))

watcher.on('add', refresh)
watcher.on('unlink', refresh)

await listen()
