const maps = [
  {
    component: /^Avatar/,
    dir: 'avatar'
  },
  {
    component: /^AutoComplete/,
    dir: 'auto-complete'
  },
  {
    component: /^Anchor/,
    dir: 'anchor'
  },

  {
    component: /^Badge/,
    dir: 'badge'
  },
  {
    component: /^Breadcrumb/,
    dir: 'breadcrumb'
  },
  {
    component: /^Button/,
    dir: 'button'
  },
  {
    component: /^Checkbox/,
    dir: 'checkbox'
  },
  {
    component: /^Card/,
    dir: 'card'
  },
  {
    component: /^Collapse/,
    dir: 'collapse'
  },
  {
    component: /^Descriptions/,
    dir: 'descriptions'
  },
  {
    component: /^RangePicker|^WeekPicker|^MonthPicker/,
    dir: 'date-picker'
  },
  {
    component: /^Dropdown/,
    dir: 'dropdown'
  },

  {
    component: /^Form/,
    dir: 'form'
  },
  {
    component: /^InputNumber/,
    dir: 'input-number'
  },

  {
    component: /^Input|^Textarea/,
    dir: 'input'
  },
  {
    component: /^Statistic/,
    dir: 'statistic'
  },
  {
    component: /^CheckableTag/,
    dir: 'tag'
  },
  {
    component: /^Layout/,
    dir: 'layout'
  },
  {
    component: /^Menu|^SubMenu/,
    dir: 'menu'
  },

  {
    component: /^Table/,
    dir: 'table'
  },
  {
    component: /^Radio/,
    dir: 'radio'
  },

  {
    component: /^Image/,
    dir: 'image'
  },

  {
    component: /^List/,
    dir: 'list'
  },

  {
    component: /^Tab/,
    dir: 'tabs'
  },
  {
    component: /^Mentions/,
    dir: 'mentions'
  },

  {
    component: /^Step/,
    dir: 'steps'
  },
  {
    component: /^Skeleton/,
    dir: 'skeleton'
  },

  {
    component: /^Select/,
    dir: 'select'
  },
  {
    component: /^TreeSelect/,
    dir: 'tree-select'
  },
  {
    component: /^Tree|^DirectoryTree/,
    dir: 'tree'
  },
  {
    component: /^Typography/,
    dir: 'typography'
  },
  {
    component: /^Timeline/,
    dir: 'timeline'
  },
  {
    component: /^Upload/,
    dir: 'upload'
  }
]

export default (component) => {
  const map = maps.find((map) => map.component.test(component))
  if (!map) {
    throw new Error(`当前解析器${import.meta.url}无法解析${component}`)
  }
  return {
    path: `es/${map.dir}`,
    sideEffects: `es/${map.dir}/style/css`
  }
}
