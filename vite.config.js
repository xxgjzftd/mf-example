import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default ({ command, mode }) => {
  /**
   * @type {import('vite').UserConfig}
   */
  const config = {
    plugins: [
      Components(
        {
          resolvers: [AntDesignVueResolver()]
        }
      )
    ]
  }
  if (command === 'serve') {
    config.server = {
      proxy: {
        '^/enoquote': 'http://47.97.115.166:18192'
      }
    }
  } else {
    switch (mode) {
      case 'qa':
        config.base = 'https://xx.com/'
        break
      case 'prod':
        config.base = 'https://yy.com/'
        break
      default:
        break
    }
    config.build = {
      sourcemap: true,
      minify: false,
      emptyOutDir: false
    }
  }

  return config
}
