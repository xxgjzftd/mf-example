import { reactive } from 'vue'

const useAajax = () => {
  return reactive(
    {
      loading: false,
      data: []
    }
  )
}

export { useAajax }
