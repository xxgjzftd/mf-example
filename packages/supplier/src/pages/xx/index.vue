<template>
  <h1>supplier xx index</h1>
  <button @click="goToDetail">go to detail</button>
  <input-base v-model:value="count"></input-base>
  <button-base size="mini"></button-base>
  <customer-list name="xx"></customer-list>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { InputBase, ButtonBase } from '@vue-mfe/components'

import CustomerList from '@supplier/components/customer-list.vue'

let count = ref('x')

const router = useRouter()
const goToDetail = () => {
  router.push('/supplier/xx/detail')
}
</script>

<style>
.xx {
  color: azure;
}
</style>
