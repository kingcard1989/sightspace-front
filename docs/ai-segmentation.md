# AI 区域滤镜：分割、渲染与真机验证

本文说明“视界”编辑页里 AI 区域滤镜的实现边界、数据流、模型 I/O、合成规则，
以及在 Android 真机上完成自检的步骤。实现参考了 `毕业设计/参考代码1` 的纯前端
分割方案，并迁移为 uni-app 的 renderjs + Canvas 2D 版本。

## 1. 能力边界

已实现：

- 使用 `uni.chooseImage` 从相册或相机选择一张图片。
- 图片载入后，在设备本地用 ONNX Runtime Web 做语义分割，不上传服务器。
- 识别结果按面积排序，过滤占比低于 1% 的零碎区域，最多展示前 12 个区域，
  并提供“全图”。区域数量不足 6 个时按实际数量展示。
- 每个区域独立套用风格；“全图”作为底层，区域风格覆盖其上。
- 7 个风格：还原、暖阳、冷冽、浓郁、黑白、复古、赛博。
- 全局强度 0–100（默认 80），作用于所有风格。
- AI 工具内低透明度区域蒙版；画布点选或区域胶囊切换区域。
- 画布双击 1× / 2× 缩放；放大后单指拖动平移。
- 按住“对比原图”；沉浸预览（隐藏 Header、工具区和动作栏）。
- 明确失败浮层：重试 / 重新选图 / 自检。
- 独立自检页，可在 Android 真机查看环境、资源读取、会话与推理日志。

本轮不做：

- 导出成片、写入系统相册。
- 风格迁移、自定义参考图、历史记录。
- TFJS / Magenta 等第二套模型。
- Android 原生插件（当前方案是标准基座 + renderjs）。
- `ctx.filter` 不可用时的 CPU 逐像素兜底。

## 2. 架构与数据流

```text
pages/editor/index.vue
  └─ EditorCanvas.vue
       └─ AiCanvasStage.vue
            ├─ 逻辑层（Options API）
            │    useEditorImage.pickImage()
            │      → uni.chooseImage()
            │      → editor.setAiImage({ path, name })
            │    useEditor.aiRenderPayload（JSON 字符串）
            │    onAiPhase / onAiRegions / onAiRegionPick / onAiExitPreview
            └─ renderjs module="ai"
                 <canvas>、Image、ONNX Runtime Web
                 compose()：全图风格 + 区域蒙版 + 蒙版提示
```

关键约束：

- App-vue 逻辑层没有 DOM、Canvas 和 Worker，因此真实绘制与推理放在 renderjs。
- renderjs 运行在 view WebView，不能直接调用 uni API，也不能直接读写逻辑层状态。
- 含 renderjs 的组件必须使用 Options API；Vue 3 不支持在 `<script setup>` 中写
  renderjs。
- 逻辑层 → renderjs：绑定 prop，并用 `:change:ai-payload` 触发 renderjs 方法。
- renderjs → 逻辑层：`ownerInstance.callMethod('方法名', 数据)`，目标必须是逻辑层
  Options API 的 `methods`。

一次选图的完整流程：

1. `useEditorImage.pickImage()` 调用 `uni.chooseImage`，拿到临时路径与文件名。
2. `editor.setAiImage()` 递增 `aiImageToken`，清空旧区域与风格，进入 `loading`。
3. `aiRenderPayload` 更新，renderjs 的 `onPayloadChange` 检测到 token 变化。
4. `startImageJob()` 依次执行：读取图片 → 解码 → 缩放 → 准备模型 → 分割。
5. 分割完成后 `notifyRegions()` 回传区域列表，逻辑层进入 `ready`。
6. 用户点选区域或风格时，只更新轻量 payload；renderjs 重新合成，不再次推理。

## 3. 静态资源与读取策略

资源目录：`static/ai/`

| 文件 | 大小 | 用途 |
| --- | --- | --- |
| `ort.wasm.min.js` | 约 50KB | ONNX Runtime Web 1.29 UMD 脚本，全局 `ort` |
| `ort-wasm-simd-threaded.wasm` | 约 13.3MB | WASM 推理后端 |
| `ort-wasm-simd-threaded.mjs` | 约 24KB | `wasmPaths` 回退时使用 |
| `segmentation.onnx` | 约 14.6MB | SegFormer-B0 语义分割模型（ADE20K 150 类） |

合计约 28MB，会让 APK 相应增大。

资源路径使用相对 `_www` 的 `./static/ai/...`。renderjs 中按以下顺序读取：

1. `plus.io.resolveLocalFileSystemURL` + `plus.io.FileReader`（App 环境优先）。
   - 依次尝试 `_www/` 前缀、原路径、去掉 `./`、`file:///` 前缀、基于
     `location.href` 的绝对路径、`plus.io.convertLocalFileSystemURL()` 结果。
   - 每次路径解析限时 6 秒，超时后自动尝试下一个候选。
2. `fetch(path, { cache: 'no-store' })`。
3. `XMLHttpRequest` + `arraybuffer`。

**大文件必须分块读取。** 在 Android WebView 中，`plus.io.FileReader`
的 `readAsArrayBuffer` 一次性读取 13MB 以上的文件时，数据要经 JS ↔ native 桥
转码，实测会长时间不触发 `onloadend`，表现为自检日志停在 ORT 版本之后、
再无 WASM / 模型读取记录。因此 App 环境下改为：

- 通过 `File.slice(offset, end)` 按 512KB 分块；`File.slice` 不可用时回退
  `Blob.prototype.slice.call`。
- 每个分块新建一个 `plus.io.FileReader`，读取完成后拼进 `Uint8Array`。
- 每块之间 `setTimeout(0)` 让出事件循环，避免阻塞 UI。
- 单块限时 15 秒，超时调用 `abort()` 并明确报错。
- 每完成约 25% 输出一次进度日志，例如 `WASM 读取 25%`。

若 `File.slice` 完全不可用，会直接失败并记录
`plus.io File.slice 不可用，无法分块读取`，不会无限等待。

图片读取顺序：先 `plus.io.FileReader.readAsDataURL`，成功后直接交给 `Image`；
失败再走分块 ArrayBuffer + Blob URL，最后尝试本地 URL。压缩后的图片通常只有
几百 KB，DataURL 在这类机型上明显比 `readAsArrayBuffer` 可靠（后者可能一直
不触发 `onloadend`，白等 15–30 秒）。本地 URL 回退用于避开 App WebView 对
`file://` 直接 `fetch` 的限制。

ORT 配置：

- `executionProviders: ['wasm']`
- `graphOptimizationLevel: 'all'`
- `env.wasm.numThreads = 1`
- `env.wasm.proxy = false`
- 优先设置 `env.wasm.wasmBinary = Uint8Array`；失败时回退
  `env.wasm.wasmPaths = './static/ai/'`。

## 4. 模型输入、输出与后处理

模型标识：SegFormer-B0（MiT-B0 编码器），参数量约 3.75M，在 ADE20K 上微调，
输出 150 类。ONNX 文件由 PyTorch 2.14 导出，未写入模型名称元数据；根据
initializer 形状（各级 embedding 维度 32 / 64 / 160 / 256，分类头
`[150, 256, 1, 1]`）可确定其结构，配置与 Hugging Face 的
`nvidia/segformer-b0-finetuned-ade-512-512` 一致。

模型输入：

- 名称：`pixel_values`
- 形状：`[1, 3, 1024, 1024]`，RGB。模型导出的 H/W 是动态维度；
  1024 输入能把分割输出提升到 256 × 256，是 512 输入（128 × 128）的 4 倍像素。
- 如果该模型或设备不支持 1024，`session.run` 抛错后依次回退到
  `[1, 3, 768, 768]`、`[1, 3, 512, 512]`，并记住该设备可用的尺寸。
- 归一化：ImageNet
  - mean `[0.485, 0.456, 0.406]`
  - std `[0.229, 0.224, 0.225]`

模型输出：

- 名称：`logits`
- 实际形状：1024 输入时为 `[1, 150, 256, 256]`；768 输入时为
  `[1, 150, 192, 192]`；回退 512 时为 `[1, 150, 128, 128]`。
  代码按运行时 `dims` 处理。
- 模型元数据声称 `[1, 150, 56, 56]`，ONNX Runtime 会打印一次
  `Expected shape ... does not match actual shape ...`。这是元数据不一致，
  不影响结果。
- 类别 id：`0` 为背景；其余为 ADE20K 类别索引 + 1，范围 1–150。

后处理与参考代码1 一致：

1. 对 NCHW logits 逐像素 argmax，得到小图类别。
2. 类别 id 加 1，0 留给背景。
3. `bilinearRefineNCHW`：在小图类别候选上做双线性分数细化。
4. `majorityFilter`：3 × 3 多数滤波，平滑边缘。
5. `collectRegions`：统计区域面积并按大小排序；占比低于 1% 的区域直接丢弃，
   界面从剩余区域中取前 12 个。
6. **蒙版引导细化**（`prepareRefinement` / `refineMaskAlpha`）：模型输出只有
   输入的 1/4 分辨率（512 / 768 / 1024 输入时分别为 128 / 192 / 256），直接放大
   必然出现块状边缘。这里以原图灰度作为引导图，对前 12 个
   区域的类别概率做引导滤波，得到低分辨率的线性系数 `a` / `b`；把 `a` / `b`
   双线性放大到工作分辨率后，用高分辨率引导图计算 `q = a * I + b`，再用
   0.47–0.53 的窄 smoothstep 转成 0–255 的 alpha。这样蒙版边缘会跟随原图中的
   真实轮廓，而不是模型低分辨率网格。若模型输出已经是 softmax 概率则直接使用，
   否则先做数值稳定的 softmax；引导图读取失败（例如画布被标记为跨源）时回退到
   低分辨率二值蒙版，不会让识别整体失败。
   - `REFINE_RADIUS = 3`：低分辨率上的盒式窗口半径。
   - `REFINE_EPS = 0.0025`：抑制低对比度区域噪声的正则项；越小越跟随边缘。

工作尺寸：

- 原图最长边限制 1536，保留更多引导图细节。
- 合成画布最长边限制 1024，与常见手机屏幕分辨率接近。
- 送入模型优先 1024 × 1024；不支持时依次回退 768 / 512。

H5 POC（390 × 844、DPR 2、Edge、512 输入）参考耗时：

| 阶段 | 耗时 |
| --- | --- |
| 创建 InferenceSession | 约 297ms |
| 模型推理 | 约 1821ms |
| 前处理 | 约 18ms |
| 后处理（argmax + 细化 + 滤波） | 约 167ms |

推理耗时大致随输入像素数增长：768 输入约为 512 的 2–2.5 倍，1024 输入约为
512 的 4–5 倍（注意力与特征图规模都按面积增长），并且 1024 输入需要同时持有
更大的输入张量、150 × 256 × 256 的输出张量和引导滤波的多个中间数组，
内存峰值明显高于 512。当前实现优先保画质，允许这一档耗时；若真机出现
WebView 被杀或 `session.run` 内存不足，会自动回退到 768 / 512，日志中可见
`推理尺寸 1024 失败: ...` 与后续尺寸的尝试记录。

Android 真机耗时以日志为准，通常与 CPU、WebView 版本和内存有关。

## 5. 风格合成规则

`compose()` 按以下顺序绘制：

1. **全图底层**：若设置了全图风格，绘制强度缩放后的风格图；否则绘制原图。
2. **区域覆盖**：对每个有风格覆盖的区域，使用引导滤波细化后的 alpha 蒙版
   （缓存；非前 12 区域回退到二值蒙版 + 1.2px 羽化），将风格图通过
   `destination-in` 裁成该区域，再叠到合成画布。
3. **蒙版提示**：仅在 AI 工具、非对比、非预览、识别完成时显示。
   - 每个类别用黄金角色相散列生成 HSL 稳定色，相邻类别 id 的颜色也有明显差异。
   - 选中区域 alpha 112，其他区域 alpha 52（0–255），保证提示清晰可见；
     选中区域最后绘制，避免被相邻区域覆盖。
4. **显示**：`draw()` 将合成画布按 contain 适配到宿主画布，应用缩放与平移。

风格强度 `t = strength / 100`，对滤镜参数线性插值：

- `saturate = 1 + (recipe.saturate - 1) * t`
- `contrast = 1 + (recipe.contrast - 1) * t`
- `brightness = 1 + (recipe.brightness - 1) * t`
- `hue-rotate = recipe.hueRotate * t`
- `sepia = recipe.sepia * t`
- 温度：`soft-light` 叠加橙色或蓝色，alpha 随强度缩放。

“还原”不是一种滤镜，而是删除对应区域 / 全图的风格覆盖，露出底层。

风格依赖 Canvas 2D `ctx.filter`。组件启动时会检测：

```js
ctx.filter = 'grayscale(1)'
filterSupported = ctx.filter === 'grayscale(1)'
```

若为 `false`，区域选择和蒙版仍可用，但风格滤镜不会生效。当前没有 CPU 兜底。

## 6. 交互语义

- 区域栏第一个是“全图”，后面是面积最大的 12 个区域（占比须不低于 1%）；
  选中的区域若不在前 12，会补到列表最前。数量不足 6 个时按实际数量展示。
- 点击画布：在 AI 工具内按蒙版拾取区域；存在 300ms 单击延迟，用于区分双击。
- 双击画布：在 1× 与 2× 之间切换；双击会取消待执行的单击。
- 预览：隐藏 Header、底部工具区、动作栏；轻触画面退出；双击放大。
- 对比原图：按住时直接显示原图，同时隐藏区域蒙版。
- 切换工具：AI 蒙版隐藏；AI 风格覆盖仍保留。
- 换图：递增 token，清空区域选择与每个区域的风格。
- 重试：保留已解码的图片，只重新执行模型准备与分割。

## 7. 错误处理与自检

错误浮层包含三条路径：

- **重试**：`editor.retryAiSegmentation()` 递增 `aiRetryToken`，renderjs 重新分割。
- **重新选图**：再次调用 `uni.chooseImage`。
- **自检**：跳转 `/pages/editor/ai-test`。

自检页入口：编辑页右上角 **更多（…）→ AI 分割自检**。页面自动运行一次合成图
测试；也可以“选择图片”用真实照片测试，并“复制日志”。

日志中应重点确认：

```text
[ai-test] UA: ...
[ai-test] window.plus: 存在 (App 环境)
[ai-test] WebAssembly: 支持
[ai-test] Canvas 2D filter: 支持
[ai-test] WASM 开始分块读取: ./static/ai/ort-wasm-simd-threaded.wasm
[ai-test] WASM 读取 25%
...
[ai-test] WASM 读取成功（plus.io，...ms）
[ai-test] 模型 读取成功（plus.io，...ms）
[ai-test] 会话创建成功（...ms）
[ai-test] 推理完成（...ms），输出 dims: [1,150,128,128]
[ai-test] 识别区域数（含背景）: ...
========== 自检通过 ==========
```

编辑页控制台还会有 `[ai-render]` 前缀的日志，例如：

```text
[ai-render] 开始处理图片: ...
[ai-render] 图片尺寸 ...，工作尺寸 ...
[ai-render] 资源就绪 ...，WASM 13.xx MB，模型 14.xx MB
[ai-render] 会话创建成功 ...ms
```

ORT 的 `VerifyOutputSizes` 警告属于预期，不必处理。

## 8. Android 真机验证步骤

前置：使用 HBuilderX 5.05，标准 uni-app Vue 3 项目，**不是 uni-app x**，不需要
UTS 或原生插件。

1. 连接 Android 真机，开启开发者选项与 USB 调试。
2. HBuilderX：**运行 → 运行到手机或模拟器 → 运行到 Android App 基座**。
3. 首次启动允许相册 / 相机权限；如果没有弹窗，到系统设置中手动开启。
4. 进入编辑页，点击 **更多（…）→ AI 分割自检**。
5. 等待自动自检完成，检查：
   - `window.plus` 为“存在”
   - `WebAssembly` 为“支持”
   - `Canvas 2D filter` 为“支持”
   - WASM 与模型读取方式、大小、耗时
   - 会话创建与推理耗时
   - 输出 dims 为 `[1,150,128,128]`
   - 区域数量和 Top 列表
6. 点“选择图片”，选一张有明显主体的照片，再跑一次；确认真实图片也能完成分割。
7. 返回编辑页，点击空态选同一张照片：
   - 等待“准备 AI 模型 → 正在识别画面区域”
   - 出现区域胶囊，画布出现淡淡的区域蒙版
   - 点画面或胶囊切换区域，选中区域颜色更明显
   - 选“暖阳 / 黑白”，确认仅区域变化
   - 拖强度到 40%，风格应减弱
   - 切到“裁剪”，蒙版应隐藏；切回“ai滤镜”，蒙版恢复
   - 按住“对比原图”，确认显示原图；松开恢复
   - 点“预览”，确认 Header、工具区、动作栏消失；双击放大，轻触退出
8. 若失败，点自检页“复制日志”，保留以下信息：
   - 手机型号、Android 版本、WebView 版本
   - `UA`、`window.plus`、`Canvas 2D filter`
   - 资源读取失败的三种方式报错
   - 会话创建或推理的异常栈

## 9. 常见问题

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| `ONNX Runtime 脚本加载失败` | `static/ai` 未打进基座，或路径不对 | 确认四个文件存在，重新运行基座；自检日志会打印注入路径 |
| `资源读取失败 ... plus/fetch/xhr` | 文件名、大小写或打包资源缺失 | 核对 `static/ai` 文件名；确认不是云端 URL |
| `WebAssembly: 不支持` | 系统 WebView 过旧 | 更新 Android System WebView / Chrome |
| 创建会话失败或崩溃 | 内存不足、WASM 加载失败 | 关闭后台应用；查看是否回退 `wasmPaths`；保留日志 |
| 图片加载失败：无法解码 | 格式不被 WebView 支持 | 换 JPEG / PNG；`uni.chooseImage` 已请求压缩图 |
| 区域正常但风格没变化 | `Canvas 2D filter: 不支持` | 记录 WebView 版本；当前版本不提供 CPU 兜底 |
| 输出形状警告 | 模型元数据写的是 56×56 | 预期行为，代码按运行时实际维度处理 |
| 首次识别很慢 | 需读取 28MB 资源并创建会话 | 保持前台，等待自检 / 加载完成；后续复用会话 |

## 10. 代码索引

| 位置 | 职责 |
| --- | --- |
| `modules/editor/useEditorImage.ts` | `uni.chooseImage` 封装、文件名回退、错误 toast |
| `modules/editor/useEditor.ts` | 编辑状态、区域与风格、payload、强度、预览、重试 |
| `modules/editor/components/AiCanvasStage.vue` | renderjs 推理、蒙版缓存、风格合成、手势 |
| `modules/editor/components/EditorCanvas.vue` | 空态 / loading / error 浮层、预览入口、画布容器 |
| `modules/editor/components/panels/AiPanel.vue` | 区域栏、强度、风格缩略图、换图 / 预览 / 重置 |
| `modules/editor/constants.ts` | 风格配方、渐变缩略图、区域上限、默认强度 |
| `pages/editor/ai-test.vue` | 真机自检、日志复制、环境与推理诊断 |
| `static/ai/` | ORT 脚本、WASM、模型 |

## 11. 验证状态

- H5（Edge，390 × 844，DPR 2）已完成端到端验证：选图、分割、区域点选、
  独立上色、强度、对比、蒙版隐藏、沉浸预览、双击缩放、损坏图片错误与恢复。
- Android 真机由使用者在本地按第 8 节验证；仓库不声称已完成真机验证。
