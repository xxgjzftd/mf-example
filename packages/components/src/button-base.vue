<template>
  <button :class="`button_${props.size}`"><slot>button name</slot></button>
</template>

<script lang="ts" setup>
const props = defineProps<
  {
    size: 'mini' | 'small'
  }
>()
</script>

<style>
.button_mini {
  width: 20px;
}

.button_small {
  width: 30px;
}
</style>
