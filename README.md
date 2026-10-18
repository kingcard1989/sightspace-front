# 视界

一款以图片发现与轻量编辑为核心的前端演示 App。使用标准 **uni-app (Vue 3 + TypeScript)**
开发，面向 Android App，H5 用于开发调试。

包含登录 / 注册 / 找回密码、发现瀑布流、个人空间、编辑页与 AI 区域滤镜。
AI 分割使用 ONNX Runtime Web 在设备本地推理，图片不上传服务器；账号、作品与
信息流连接 Python FastAPI 后端（[sightspace-serve](https://github.com/kingcard1989/sightspace-serve)）。

## 快速开始

### 先启动后端

前端默认请求 `http://localhost:3000/api`。首次运行先进入后端仓库，双击
`start-backend.bat`：

```text
https://github.com/kingcard1989/sightspace-serve
```

脚本会自动创建 Python 虚拟环境、初始化项目专用 PostgreSQL 集群、执行迁移、
生成演示数据并启动 FastAPI。成功后打开 `http://localhost:3000/docs` 可确认接口。

开发模式（`DEBUG=true`）下，验证码会打印在后端窗口，并随发送接口返回；
注册页与重置密码页会显示“开发模式验证码”，点击即可填入。

### 环境

- HBuilderX 5.05（项目使用其内置的 Vue 3 / Vite 编译器与 dart-sass，
  不需要额外安装 npm 依赖）
- 浏览器：Edge / Chrome（H5 调试）

### 运行

1. 打开 HBuilderX，导入项目目录 `HBuilderProjects/视界`。
2. 菜单选择 **运行 → 运行到浏览器 → Edge/Chrome**。
3. 或使用 HBuilderX 自带 CLI：

```bash
<HBuilderX安装目录>/cli.exe launch web --project "<项目绝对路径>" --browser Edge
```

默认 H5 端口为 `8080`；若被占用，Vite 会自动改用 `8081` 等端口，以控制台输出为准。

运行到 Android：

1. 连接真机或启动模拟器，开启 USB 调试。
2. 菜单选择 **运行 → 运行到手机或模拟器 → 运行到 Android App 基座**。
3. 首次进入编辑页选图时，应用会从 `static/ai/` 读取约 28MB 的 WASM 与模型资源，
   并创建本地推理会话；请保持应用在前台并预留数秒加载时间。
4. 编辑页右上角 **更多 → AI 分割自检** 可检查真机上的 ORT、WASM、模型读取与推理。
   详细步骤、预期日志和排查方式见
   [docs/ai-segmentation.md](docs/ai-segmentation.md)。

> `manifest.json` 中的 `appid` 留空，首次云打包前需在 HBuilderX 中重新获取。
> Android 包名已设置为 `com.shijie.app`。相册与相机权限已声明：
> `READ_EXTERNAL_STORAGE`、`READ_MEDIA_IMAGES`、`CAMERA`。

## 演示账号

后端种子数据包含一个演示账号，画廊中有 9 张作品：

```text
手机号：13800138000
密码：123456
```

新注册的账号写入 PostgreSQL，刷新或换设备后仍可登录；其画廊、收藏、草稿均为空。

## 页面与功能

| 页面 | 说明 |
| --- | --- |
| 发现 `/pages/discover/index` | 游客可浏览；3 分类切换、数据驱动 3 列混合宽度瀑布流、下拉刷新、触底加载、加载/错误/空态 |
| 编辑 `/pages/editor/index` | 全屏深色编辑页；6 套工具栏面板；选图后本地 AI 分割，按区域套用风格；沉浸预览；保存仍为演示 |
| AI 自检 `/pages/editor/ai-test` | 真机环境诊断；检查 ORT、WASM、模型读取、推理与区域识别 |
| 我的 `/pages/profile/index` | 登录后可见；画廊 / 收藏 / 草稿分段；三列方形网格；下拉刷新；右上角菜单退出登录 |
| 登录 `/pages/auth/login` | 手机号 + 密码；字段内联校验；协议弹层；成功后回“我的” |
| 注册 `/pages/auth/register` | 手机号、短信验证码、昵称、密码；注册成功自动登录 |
| 重置密码 `/pages/auth/reset` | 手机号、验证码、新密码；成功后回到登录页 |

交互约定：

- 自定义 TabBar：发现 / 编辑 / 我的；编辑页为独立全屏页面，不显示 TabBar。
- 未登录点击“我的”会跳转登录页，登录成功后 `reLaunch` 回“我的”。
- 编辑页选图使用 `uni.chooseImage`（相册或相机）；图片载入后自动在本地完成分割。
- AI 面板可在“全图”和面积最大的 12 个区域之间切换，每个区域独立套用风格；
  强度 0–100 全局生效，“还原”恢复选中区域。
- 裁剪 / 调色 / 文字 / 贴纸 / 刷子仍为参数预览；AI 区域滤镜会合成真实像素。
- 画布支持双击 1× / 2× 缩放；单指拖动（放大后）平移画面。
- AI 工具内常显低透明度区域蒙版；切换其他工具、按住对比原图或进入预览时隐藏。
- “对比原图”需按住查看，松开恢复；“预览”隐藏 Header、底部工具区与动作栏，
  轻触画面退出。
- 保存按钮仍为演示 toast；撤销、更多中的帮助文案同样为演示交互。

## Mock 与真实后端

开关在 `config/index.ts`：

```ts
export const USE_MOCK = false
```

- `USE_MOCK = false`：通过 `shared/api/request.ts` 请求 FastAPI 后端（默认）；
- `USE_MOCK = true`：所有接口走 `modules/*/mock.ts`，无网络请求，适合离线演示。

后端地址：

```ts
// H5
http://localhost:3000/api
// Android 模拟器访问宿主机
http://10.0.2.2:3000/api
// 真机：把 LAN_HOST 改成电脑局域网 IP，例如 '192.168.1.23'
const LAN_HOST = ''
```

真机调试时填写 `LAN_HOST`，并确保手机和电脑在同一 Wi-Fi、后端监听 `0.0.0.0`、
防火墙放行 3000 端口。接口字段、分页结构、鉴权与错误码见
[docs/api-contract.md](docs/api-contract.md)。

后端仓库：[kingcard1989/sightspace-serve](https://github.com/kingcard1989/sightspace-serve)。

## 目录结构

```text
视界/
├─ App.vue                    # 应用入口，恢复本地会话
├─ main.ts                    # Vue 3 + Pinia
├─ pages.json / manifest.json
├─ config/                    # 应用配置、Mock 开关、API 地址
├─ pages/
│  ├─ discover/index.vue
│  ├─ editor/index.vue
│  ├─ editor/ai-test.vue      # 真机 AI 分割自检
│  ├─ profile/index.vue
│  └─ auth/login.vue、register.vue、reset.vue
├─ modules/                   # 按业务模块拆分
│  ├─ auth/                   # 类型、API、Mock、验证码倒计时、store、品牌/协议组件
│  ├─ discover/               # 类型、常量、瀑布流布局算法、API、Mock、store、组件
│  ├─ profile/                # 类型、常量、API、Mock、store、个人页组件
│  └─ editor/                 # 类型、常量、store、选图、画布、renderjs AI 推理、6 个面板
├─ shared/
│  ├─ api/                    # 请求封装、错误、Mock 工具
│  ├─ components/             # 18 个通用组件（按钮、输入、弹层、滑块、TabBar 等）
│  ├─ composables/            # 系统布局、状态栏、登录守卫
│  ├─ styles/                 # 设计令牌、mixin、全局样式
│  ├─ types/                  # 通用 API 与数据模型
│  └─ utils/                  # 存储、校验、导航、格式化、颜色
├─ static/icons/              # 96 × 96 图标 PNG（源文件在 design/icons）
├─ static/ai/                 # ONNX Runtime Web、WASM 与分割模型（约 28MB）
├─ design/icons/              # SVG 图标源文件
├─ docs/                      # 接口契约、设计令牌、AI 分割说明
└─ uni.scss                   # 全局注入 tokens / mixins
```

## 设计

- 设计基准 390 × 844，样式使用 SCSS + 设计令牌 + `rpx`，`dp()` 将设计 px 转为 rpx。
- 发现页布局完全由图片宽高数据驱动，3 列、1/2 列混合宽度、最短列放置，
  新增数据会自动重新排版，不写死任何图片位置。
- 个人页使用固定的三列方形网格，第二列下移，强化与发现页的差异。
- 图标为自绘 Lucide 风格 SVG，统一导出 PNG；无图片时使用柔和渐变占位。
- AI 区域滤镜运行在 renderjs（view WebView）中：ONNX Runtime Web 单线程 WASM
  推理，Canvas 2D 负责区域蒙版与风格合成；逻辑层只通过 JSON payload 下发指令。
- 详细令牌、字号、间距、组件与页面尺寸见
  [docs/design-tokens.md](docs/design-tokens.md)，AI 架构与真机验证见
  [docs/ai-segmentation.md](docs/ai-segmentation.md)。

## 当前限制

- 不导出成片、不写入系统相册；保存按钮只显示演示 toast。
- 裁剪、调色、文字、贴纸、刷子仍为参数预览；只有 AI 区域滤镜会处理真实像素。
- AI 使用固定的分割模型，不做风格迁移、自定义参考图或历史记录；模型与 WASM
  约 28MB，首次识别需要数秒。图片仅在设备本地处理。
- 区域风格依赖 Canvas 2D `filter`（blur / saturate / contrast / brightness /
  hue-rotate / sepia）。若部分 Android WebView 不支持，区域选择与蒙版仍可用，
  但风格可能不生效；目前尚未实现 CPU 逐像素兜底。
- H5（390 × 844）已完成端到端验证；Android 真机的本地资源读取、WASM 与 Canvas
  兼容性需通过应用内自检确认，步骤见
  [docs/ai-segmentation.md](docs/ai-segmentation.md)。
- 发现页搜索、菜单、作品详情、编辑资料等入口为占位 toast。
- 头像使用首字母渐变占位，暂不支持上传。
- 收藏与草稿接口目前返回空数组，对应页面展示空态。
- 编辑结果尚未上传后端；作品上传接口已在后端实现，前端保存流程待接入。

## 文档

- [前端接口契约](docs/api-contract.md)
- [设计令牌与组件规格](docs/design-tokens.md)
- [AI 分割与真机验证](docs/ai-segmentation.md)
- 后端文档：[API](https://github.com/kingcard1989/sightspace-serve/blob/main/docs/api.md)、
  [数据库设计](https://github.com/kingcard1989/sightspace-serve/blob/main/docs/database-design.md)、
  [验证码原理](https://github.com/kingcard1989/sightspace-serve/blob/main/docs/verification-code.md)
