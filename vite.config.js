export default ({ command, mode }) => {
  /**
   * @type {import('vite').UserConfig}
   */
  const config = {
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
