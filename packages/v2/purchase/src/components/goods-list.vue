<template>
  <div>
    <h1>business components</h1>
    <ul>
      <li v-for="goods of list">{{ goods.name }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  data () {
    return {
      list: []
    }
  },
  created () {
    this.list = [
      {
        name: 'foo',
        count: 10
      },
      {
        name: 'bar',
        count: 20
      }
    ]
  }
}
</script>
