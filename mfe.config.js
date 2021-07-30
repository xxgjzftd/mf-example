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
  },
  oss: {
    qa: 'http://enoch-web-qa.oss-cn-hangzhou.aliyuncs.com/enoquote/',
    prod: 'http://enoch-web-prod.oss-cn-hangzhou.aliyuncs.com/enoquote/'
  }
}
