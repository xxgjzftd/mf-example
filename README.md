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
