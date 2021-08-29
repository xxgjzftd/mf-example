# ENOQUOTE-WEB

- 以诺行云报价系统
- Vue 3 + Typescript + Vite

# 注意事项

- 暂不支持动态 import
- 从 verdors utils components 中 import
  ```
  // 正确
  import { xx } from 'xx'
  // 错误
  import yy from 'xx/yy'
  ```
- 服务器环境构建优先。本质上是比较两次 commit。所以要先 commit 后 build。
- 由于分包问题，部分引用文件不存在错误不会在编译阶段暴露。后续考虑优化方案。
- public 里面内容变化，不会向 dist copy。一个解决方案是修改下 container。
- 依赖顺序

  ```
  container > pages > components > utils > vendors
  // 像 @container @supplier 这样的alias只能在当前包内用。
  // 引入别的包时，用 @xx/utils 这样的全名。
  // 引入当前包时，用 @container 这样的别名。
  // 如果不是完全理解构建过程，最好按上面的规范来，要不然容易出错。
  ```

- 各个包引用的依赖，必须要在 package.json 中声明。
