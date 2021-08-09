export default {
  packages: {
    components: { type: 'components' },
    container: { type: 'container' },
    supplier: { type: 'pages' },
    utils: { type: 'utils' }
  },
  routes: {
    '/': {
      path: '/',
      component: 'packages/container/src/pages/layout.vue',
      root: true
    },
    '/supplier/xx': {
      props: (route) => ({ inquiryId: route.query.inquiryId }),
      root: true
    }
  }
}
