import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

export default defineConfig(
  ({ command, mode }) => {
    const config: UserConfig = {
      css: {
        preprocessorOptions: {
          less: {
            modifyVars: {
              '@primary-color': '#0d8d8d'
            },
            javascriptEnabled: true
          }
        }
      }
    }
    if (command === 'serve') {
      config.server = {
        proxy: {
          '^/enoquote': 'http://47.97.115.166:18192'
        }
      }
    } else {
      config.build = {
        sourcemap: true,
        minify: false,
        emptyOutDir: false
      }
    }

    return config
  }
)
