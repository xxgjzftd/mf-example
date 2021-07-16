<template>
  <h1>app</h1>
  <button @click="goToSupplier">go to supplier</button>
  <router-view></router-view>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const goToSupplier = () => {
  router.push('/supplier/xx')
}
</script>
