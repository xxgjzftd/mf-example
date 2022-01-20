<template>
  <h1>app</h1>
  <button @click="goToSupplier">go to supplier</button>
  <phone-filled></phone-filled>
  <message-outlined></message-outlined>
  <router-view></router-view>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PhoneFilled, MessageOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const goToSupplier = () => {
  router.push('/v3/v3-supplier/xx')
}

onMounted(
  () => {
    console.log('xx')
  }
)
</script>

<style>
.container {
  color: aqua;
}
</style>
