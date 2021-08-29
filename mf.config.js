export default {
  scope: '@xx',
  glob: [['packages/*/**.{ts,vue}']],
  apps: [
    {
      name: 'container',
      predicate: () => location.pathname.startsWith('/container')
    }
  ],
  routes: {
    foo: {
      type: 'vue',
      glob: [['packages/container/src/pages/layout.vue', 'packages/supplier/src/*/**.vue']],
      base: '/bar',
      depth: 1,
      extends: [
        {
          id: '/container/layout',
          depth: 0
        }
      ]
    }
  }
}
