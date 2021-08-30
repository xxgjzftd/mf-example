<template>
  <div>
    <h1>v2 purchase detail</h1>
    <input-base v-model="value"></input-base>
    <img src="@v2-purchase/assets/avatar.png" />
  </div>
</template>

<script>
import { InputBase } from '@xx/v2-components'

export default {
  components: {
    InputBase
  },
  data () {
    return {
      value: ''
    }
  }
}
</script>
