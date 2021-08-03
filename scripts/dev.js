import vite from 'vite'
import vue from '@vitejs/plugin-vue'
import MagicString from 'magic-string'
import { init, parse } from 'es-module-lexer'

import { routes } from './plugins.js'
import { constants, isRoute, getResolver, getNormalizedPath, getDevAlias } from './utils.js'

const { ws, watcher, moduleGraph, listen } = await vite.createServer(
  {
    resolve: {
      alias: getDevAlias()
    },
    plugins: [
      vue(),
      routes(true),
      {
        async transform (code, id) {
          await init
          const [imports] = parse(code)
          let ms
          const gms = () => ms || (ms = new MagicString(code))
          imports.forEach(
            ({ n: mn, ss, se }) => {
              const resolver = getResolver(mn)
              if (resolver) {
                const matches = code
                  .slice(ss, se)
                  .replace(/\n/g, '')
                  .match(/\{(.+)\}/)
                if (!matches) {
                  throw new Error(`为性能考虑，限制${mn}只能局部导入。`)
                }
                matches[1].split(',').forEach(
                  (binding) => {
                    const { sideEffects } = resolver(binding.trim())
                    if (sideEffects) {
                      gms().prepend(`import "${mn}/${sideEffects}";`)
                    }
                  }
                )
              }
            }
          )
          if (ms) {
            return {
              code: ms.toString(),
              map: ms.generateMap({ hires: true })
            }
          }
        }
      }
    ]
  }
)

const refresh = (path) =>
  isRoute(getNormalizedPath(path)) &&
  (moduleGraph.invalidateModule(moduleGraph.getModuleById(constants.ROUTES)), ws.send({ type: 'full-reload' }))

watcher.on('add', refresh)
watcher.on('unlink', refresh)

await listen()
