# 视界 · 前端接口契约

本文只描述前端期望的 HTTP 契约，不包含后端实现。当前项目通过 `USE_MOCK = true`
在本地模拟全部接口；后端就绪后，将 `config/index.ts` 中的 `USE_MOCK` 改为 `false`
即可切换到真实请求。

## 1. 基础约定

| 项目 | 约定 |
| --- | --- |
| Base URL | H5：`http://localhost:3000/api`；App：`http://10.0.2.2:3000/api` |
| 编码 | `application/json; charset=utf-8` |
| 鉴权 | `Authorization: Bearer <token>` |
| 业务成功 | `code === 0` |
| 时间格式 | ISO 8601 字符串，例如 `2026-01-01T08:00:00.000Z` |

Base URL 在 `config/index.ts` 的 `API_BASE_URL` 中维护。Android 模拟器使用
`10.0.2.2` 访问宿主机；真机调试需改为电脑的局域网 IP。

### 统一响应信封

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

- `code`: 业务码，`0` 表示成功。
- `message`: 面向用户的提示文本，失败时前端可能直接展示。
- `data`: 业务数据；无返回值时为 `null`。

### 分页结构

```json
{
  "list": [],
  "page": 1,
  "pageSize": 12,
  "total": 48,
  "hasMore": true
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `list` | `T[]` | 当前页数据 |
| `page` | `number` | 当前页码，从 1 开始 |
| `pageSize` | `number` | 每页条数 |
| `total` | `number` | 总条数 |
| `hasMore` | `boolean` | 是否还有下一页 |

前端仅在 `hasMore === true` 时继续触底加载；返回空数组时展示空态。

### HTTP 状态码与错误码

| HTTP | 业务码示例 | 含义 | 前端行为 |
| --- | --- | --- | --- |
| 200 | `0` | 成功 | 取 `data` |
| 400 | `40000` | 参数错误 | Toast 提示 `message` |
| 401 | `40101` | 未登录或凭证无效 | 清理本地会话；受保护页面回到登录页 |
| 409 | `40901` | 手机号已注册 | 注册页 Toast 提示 |
| 500 | `50000` | 服务异常 | Toast / 错误态，可重试 |

非 2xx 响应也建议返回统一信封，便于前端读取 `message`；若无法返回 JSON，
前端会回退为“请求失败（状态码）”。

## 2. 接口列表

### 2.1 登录

`POST /auth/login`

无需鉴权。手机号 + 密码登录。

请求：

```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

响应 `data`：

```json
{
  "token": "<access-token>",
  "user": {
    "id": "u_demo",
    "phone": "13800138000",
    "nickname": "Ava",
    "handle": "avac",
    "bio": "Collecting light & little moments.",
    "avatarUrl": "",
    "createdAt": "2026-01-01T08:00:00.000Z"
  }
}
```

失败：

- `401 / 40101`：手机号或密码不正确。

### 2.2 注册

`POST /auth/register`

无需鉴权。注册成功后直接返回会话，前端自动登录并跳转“我的”。

请求：

```json
{
  "phone": "13900000000",
  "nickname": "新用户",
  "password": "123456"
}
```

响应 `data`：同登录，返回 `token` 与 `user`。

失败：

- `409 / 40901`：该手机号已注册。

服务端需校验：手机号格式、昵称 2–12 个字符、密码 6–20 位；密码必须哈希存储，
不得明文落库，也不得在响应中返回。

### 2.3 退出登录

`POST /auth/logout`

需要鉴权。

响应 `data`: `null`。

前端在调用后立即清理本地 token 与用户缓存；接口失败也不会阻断退出。

### 2.4 发现页列表

`GET /feed`

无需鉴权（游客可浏览）。

Query：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `category` | `recommended \| popular \| foryou` | 是 | 编辑推荐 / 热门作品 / 猜你喜欢 |
| `page` | `number` | 否 | 默认 1 |
| `pageSize` | `number` | 否 | 默认 12 |

响应 `data`：`ApiPage<FeedImage>`。

`FeedImage`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 唯一 ID |
| `imageUrl` | `string` | 图片地址；为空时前端使用渐变占位 |
| `width` | `number` | 原图宽度，用于计算瀑布流宽高比 |
| `height` | `number` | 原图高度 |
| `category` | `string` | 分类 key |
| `author` | `string` | 作者名称 |
| `palette` | `[string, string]` | 占位渐变色，建议随图片一起返回 |
| `createdAt` | `string` | 创建时间 |
| `colSpan` | `1 \| 2` | 可选。强制占 1 列 / 2 列；不传时前端按 `width / height` 自动计算 |

说明：

- 前端瀑布流为 3 列，卡片可占 1 列或 2 列，位置由真实图片宽高动态计算，
  不会写死第几张图在哪个位置。
- 图片 CDN 建议按列宽提供多尺寸，避免加载原图造成流量浪费。

### 2.5 当前用户资料

`GET /users/me`

需要鉴权。响应 `data`：

```json
{
  "user": {
    "id": "u_demo",
    "phone": "13800138000",
    "nickname": "Ava",
    "handle": "avac",
    "bio": "Collecting light & little moments.",
    "avatarUrl": "",
    "createdAt": "2026-01-01T08:00:00.000Z"
  },
  "stats": {
    "works": 128,
    "followers": 2400,
    "following": 312
  }
}
```

`stats` 与个人页的“作品 / 粉丝 / 关注”一一对应。

### 2.6 个人页画廊

`GET /users/me/gallery`

需要鉴权。

Query：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `tab` | `gallery \| favorites \| drafts` | 是 | 画廊 / 收藏 / 草稿 |

响应 `data`：`GalleryItem[]`（当前前端按一次性数组渲染，不分页）。

`GalleryItem`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 唯一 ID |
| `imageUrl` | `string` | 图片地址 |
| `width` | `number` | 图片宽度 |
| `height` | `number` | 图片高度 |
| `palette` | `[string, string]` | 占位渐变色 |
| `createdAt` | `string` | 创建时间 |

收藏与草稿为空时返回 `[]`，前端展示对应空态。

## 3. 鉴权与失效处理

- 登录/注册成功后，前端在 `sj_token` 与 `sj_user` 中持久化会话。
- 所有受保护接口由请求封装自动注入 `Authorization: Bearer <token>`。
- 收到 HTTP 401 时：
  - 请求封装会清理本地 token 与用户缓存；
  - 认证 store 会派发 `auth:expired` 事件，应用根组件收到后 `reLaunch` 到登录页；
  - 登录/注册页自身不会重复跳转。
- 后端应在 token 过期、被吊销、用户不存在时返回 401，而不是 200 + 业务错误。

## 4. Mock 与真实后端的差异

| 行为 | Mock | 真实后端 |
| --- | --- | --- |
| 数据来源 | 本地静态生成 + localStorage | PostgreSQL |
| 密码 | 明文保存在本地，仅用于演示 | 必须 bcrypt / argon2 哈希 |
| Token | `mock-token:<userId>:<timestamp>` | 推荐 JWT 或 opaque token |
| 延迟 | 约 420–580ms | 以实际网络为准 |
| 演示账号 | `13800138000 / 123456` | 由种子数据决定 |

Mock 账号仅用于前端阶段验收，不得复制到生产环境。

## 5. 联调注意事项

1. H5 开发时后端需允许 `http://localhost:8081`（或实际端口）的 CORS。
2. Android 模拟器访问宿主机使用 `10.0.2.2`；真机使用电脑局域网 IP，并确保后端监听
   `0.0.0.0`。
3. 图片字段为空字符串时前端会展示渐变占位，便于后端未接入对象存储时先行联调。
4. 所有时间字段统一 UTC ISO 字符串，展示格式由前端负责。
