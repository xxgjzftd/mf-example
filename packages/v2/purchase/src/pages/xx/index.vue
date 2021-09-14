<template>
  <div>
    <h1>v2 purchase xx</h1>
    <el-button @click="goToDetail">go to detail</el-button>
    <goods-list></goods-list>
  </div>
</template>

<script>
import GoodsList from '@v2-purchase/components/goods-list.vue'

export default {
  components: {
    GoodsList
  },
  methods: {
    goToDetail () {
      this.$router.push('/v2/v2-purchase/xx/detail')
    }
  }
}
</script>
