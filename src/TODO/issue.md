- 审查对象：提交bf11342至d5b6630（Add files via upload系列提交）
- 基准版本：`47bc0c0`（“test”提交）
- 当前状态：仓库结构已按基准版本整理完毕——根目录下的旧快照副本（`algorithm/`、`datastructure/`、`node/`、`controller/`、`main.ts`、`style.css`、`App.vue`）已删除；`visualizer/` 已迁至 `src/visualizer/`，其 `App.vue`/`style.css` 已并入 `src/`；`README.md`、`vite.config.ts` 已还原；`dist/` 已取消跟踪；`src/test` 32 项测试仍全部通过。以下为问题记录与修改方案

## 一、存在的问题

1. **目录结构混乱：复制算法层旧快照**
   - 算法层旧快照被整包复制到仓库根目录（`algorithm/`、`datastructure/`、`node/`、`controller/`），与 `src/` 下的正式代码形成两份事实来源；旧快照缺少 `47bc0c0` 的既有修复（如节点删除清空、`clear` 同步化、并查集按集合大小合并、图的 `init()/_clear()`、`OpHook` 放宽等）。
   - 新代码（`visualizer/`、`App.vue`、`main.ts`、`style.css`）同样放在根目录：入口 `index.html` 指向 `src/main.ts`，`npm run dev`/`npm run build` 无法加载到这些代码；`tsconfig.app.json` 只包含 `src/**`，这些代码从未经过类型检查，其提交的 `dist/` 无法由仓库状态复现。

2. **引入取消机制，与原设计不符**
   - 在其 `StepController` 中新增 `begin()/abort()/epoch/cancelled`，以 `Error('操作已取消')` 拒绝挂起的 `wait()`；`App.vue` 捕获该错误后把未完成的复合操作中途丢弃，且以错误信息字符串判断是否为取消。
   - 原设计不支持取消机制：在原设计中，任何中断必须强制把当前复合操作执行完毕再跳转（见 `StepController` 头部注释第 5 条与）。算法层没有回滚能力，强制中断会导致结构错乱；算法层也不捕获该异常，遗漏 catch 的调用会产生 unhandled rejection。
   - 附带改动：`setStatus(STEP_EXECUTION)` 的语义从“只唤醒最早等待的复合操作”改成“唤醒所有等待者”。

3. **类型不安全**
   - 可视化层内即有 70 余处 `any`：各 visualizer 的 `private ds: any`、`App.vue` 的 `currentDS: any`、`(node as any)` 直接访问结构内部字段（`node.arr`、`node.header`、`node.str` 等）、D3 回调的 `_d: any` 等。
   - 用鸭子类型推断结构类型（`Array.isArray(node.arr)`、`node.header !== undefined` 判断渲染模式），一旦算法层调整内部字段即静默失效。

4. **违反既有约定与回归**
   - 删除了 `vite.config.ts` 的 `base: './'`（AGENTS 中已记录保留原因），并把构建产物 `dist/` 强制提交（该目录已在 `.gitignore` 中）。
   - 重写了 `README.md`：删除“运行测试”一节；把运行方式改为“双击 `index.html` 即可运行”——ES 模块在 `file://` 下会被浏览器拦截，且提交的 `dist` 使用绝对路径 `/assets/...`，事实上双击无法运行。
   - 根目录新增的 `main.ts`、`style.css` 与 `src/` 重复。
   - 用户可见的 `console.warn` 使用英文（`Unknown visualizer type`），不符合中文文案约定。

5. **代码组织问题**
   - `App.vue` 单文件 1563 行；菜单到类/可视化器的映射在两个大文件 `switch`（`VisualizerManager.switchVisualizer` 与 `selectMenu`）中重复。
   - 每个操作重复 `begin/try/catch/addMessage` 样板；操作名（`'_set_head'` 等）以魔法字符串散落在各处 `switch`。

6. **算法层改动未回归、未迁移**
   - 在旧快照上修改了算法层（BST 系查找高亮、`RedBlackTreeNode._swap_color`、`TreeNode._delete` 等），未迁移到 `src/`，未不全测试。查找高亮功能现已正式实现（`BinarySearchTreeNode._set_visited` 及 BST/AVL/红黑树查找与删除路径高亮，含测试）；`RedBlackTreeNode._swap_color`、`TreeNode._delete` 属死代码，不再保留。

7. **当前编译状态**
   - 在现行 `src/` 下执行 `npx vue-tsc -b` 共 19 个错误：7 处依赖其取消接口（`begin/abort` 不存在于正式 `StepController`）；11 处 graph 相关文件名大小写不一致（仓库现存文件名均为小写，其代码与仓库既有 import 大小写混用）；1 处 `setOpHook` 回调首参与放宽后的 `OpHook` 不兼容。

## 二、修改方案

1. **代码源**：以 `47bc0c0` 的 `src/` 为准，所有开发在 `src/` 内进行；请勿再向仓库根目录复制算法层或公共文。
2. **删除取消机制，按原设计处理中断**：
   - `StepController` 保持 `src/controller/StepController.ts` 现状：`wait()` 只被唤醒、不失败，不提供取消/中止接口；
   - 中断处理改为：切换菜单/重置数据前，先把状态置为 `PLAYING`、间隔设为 `FAST_TIME_INTERVAL`，`await` 当前复合操作结束后，再执行 `DataNode.restart()`、切换 visualizer、创建新实例（详见 `TODO.md`“中断处理”）；
   - 删除 `App.vue` 中所有 `begin()/abort()/isCancelError/“已取消”` 相关逻辑。
3. **类型安全**：
   - 不使用 `as any` 访问算法层内部字段、 `currentDS/ds: any` 一类逃逸；可视化层需要的数据请通过节点的原子方法或只读 getter 暴露（在 `src/` 算法层补充，并按 `src/test` 约定补测试）；
   - D3 回调须给出明确类型或使用泛型；结构类型判断改为基于页面层传入的菜单/类型信息，不用鸭子类型。
4. **修复编译**：统一 graph 相关 import 与文件的大小写；`setOpHook` 回调首参适配现行 `OpHook`（首参为 `object`）；最终 `npx vue-tsc -b` 必须 0 错误。
5. **遵守既有约定**：不改动/覆盖公共文件（`README.md`、`vite.config.ts`、`package.json`、`index.html`、`.gitignore` 等）；请勿提交 `dist/` 等构建产物；用户可见文案一律使用中文。
6. **回归测试**：`src/test` 的 32 项测试须全部通过；在算法层新增任何原子方法/字段需补充测试，再供可视化层使用。查找高亮请直接使用 `src` 已提供的 `BinarySearchTreeNode._set_visited`/`visited`（BST、AVL、红黑树均已接入）。
7. **代码规范**：建议拆分 `App.vue`（可按菜单、控件、操作面板、消息区拆分组件）、抽出操作名常量与通用操作模板以消除重复样板。
