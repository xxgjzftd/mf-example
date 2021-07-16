<template>
  <h1>supplier index</h1>
  <button @click="goToDetail">go to detail</button>
  <input-base v-model:value="count"></input-base>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InputBase from '@supplier/components/input-base.vue'

let count = ref('x')

const router = useRouter()
const goToDetail = () => {
  router.push('/supplier/xx/detail')
}
</script>

<style>
.xx {
  color: black;
}
</style>
