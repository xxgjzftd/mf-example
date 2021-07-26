<template>
  <input type="text" class="input" :value="props.value" @input="onInput" />
</template>

<script lang="ts" setup>
const props = defineProps<
  {
    value: string
  }
>()

const emit = defineEmits<
  {
    (e: 'update:value', value: string): void
  }
>()

const onInput = (e: Event) => emit('update:value', (e.target as HTMLInputElement).value)
</script>

<style>
.input {
  width: 120px;
}
</style>
