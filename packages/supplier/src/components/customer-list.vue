<template>
  <h1>business components</h1>
  <ul>
    <li v-for="customer of customers">{{ customer.name }}</li>
  </ul>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

const customers = reactive(
  [
    { name: 'xx', age: 17 },
    { name: 'yy', age: 12 }
  ]
)
</script>
