<template>
  <h1>supplier detail ~</h1>
  <p>{{ count }}</p>
  <button @click="inc">inc</button>
  <input-base v-model:value="count"></input-base>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { InputBase } from '@xx/components'

let count = ref('x')
const inc = () => (count.value += 'x')
</script>

<style>
.yy {
  color: red;
}
</style>
