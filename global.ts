const relList = document.createElement('link').relList
const scriptRel = relList && relList.supports && relList.supports('modulepreload') ? 'modulepreload' : 'preload'
const seen = {}

function preload (baseModule: () => Promise<{}>, deps?: string[]) {
  if (!deps) {
    return baseModule()
  }

  return Promise.all(
    deps.map(
      (dep) => {
        if (dep in seen) return
        seen[dep] = true
        const isCss = dep.endsWith('.css')
        const cssSelector = isCss ? '[rel="stylesheet"]' : ''
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return
        }
        const link = document.createElement('link')
        link.rel = isCss ? 'stylesheet' : scriptRel
        if (!isCss) {
          link.as = 'script'
          link.crossOrigin = ''
        }
        link.href = dep
        document.head.appendChild(link)
        if (isCss) {
          return new Promise(
            (res, rej) => {
              link.addEventListener('load', res)
              link.addEventListener('error', rej)
            }
          )
        }
      }
    )
  ).then(() => baseModule())
}
