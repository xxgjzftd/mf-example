<template>
  <h1>business components</h1>
  <span>{{ props.name }}</span>
  <ul>
    <li v-for="customer of customers">{{ customer.name }}</li>
  </ul>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

const props = defineProps<{ name: string }>()

const customers = reactive(
  [
    { name: 'xx', age: 17 },
    { name: 'yy', age: 12 }
  ]
)
</script>
