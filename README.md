# PlanGo 前端

PlanGo 智能旅行规划平台前端，当前处于联调开发阶段。项目使用 Vue 3 + TypeScript + Vite，包含首页、AI 行程规划、行程/游记页面、租车演示页，以及独立的高德地图测试页。

## 当前状态

- 主开发分支：`dev`，本地可能存在 `lab` 分支用于前端开发
- 包管理器：`npm`
- 开发端口：`5173`
- 默认联调：请求走后端 `/api`

## 技术栈

- Vue `3`
- TypeScript
- Vite
- Vue Router
- Pinia
- Element Plus
- Axios
- `@amap/amap-jsapi-loader` 高德 JSAPI Loader
- `@kangc/v-md-editor` Markdown 编辑器

## 安装与启动

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

构建：

```bash
npm run build
```

预览构建产物：

```bash
npm run preview
```

## 环境变量

### `.env.development`

当前联调配置：

```text
VITE_API_BASE_URL=/api
VITE_BACKEND_TARGET=http://127.0.0.1:8080
```

含义：

- `VITE_API_BASE_URL=/api`：浏览器请求同源 `/api`。
- `VITE_BACKEND_TARGET=http://127.0.0.1:8080`：Vite dev server 将 `/api` 转发到后端。

### 高德地图

地图测试页使用高德 JSAPI。Vite 配置已允许读取 `VITE_` 和 `AMAP_` 前缀变量。

可选配置：

```text
AMAP_API_KEY=你的高德 Web JS API Key
AMAP_SECURITY_JS_CODE=你的安全密钥
```

也兼容：

```text
VITE_AMAP_KEY=你的高德 Web JS API Key
VITE_AMAP_SECURITY_CODE=你的安全密钥
```

未配置 key 时，`/map-playground` 不会白屏，会显示：

```text
地图暂不可用，请检查高德地图配置
```

修改环境变量后需要重启 `npm run dev`。

## 路由页面

| 页面 | 路由 | 当前数据来源/状态 |
| --- | --- | --- |
| 首页 | `/` | 后端 `/home` |
| 登录 | `/login` | 后端 API |
| 注册 | `/register` | 后端 API |
| 个人中心 | `/profile` | 后端 API |
| AI 行程规划 | `/ai-trip` | 后端 `/api/ai/trips/analyze`、`/api/ai/trips/generate` |
| 我的行程 | `/trips` | 后端 API |
| 行程详情 | `/trips/:id` | 后端 API |
| 游记列表 | `/notes` | 后端 API |
| 游记详情 | `/notes/:id` | 后端 API |
| 写游记 | `/notes/create` | 后端 API |
| 编辑游记 | `/notes/edit/:id` | 后端 API |
| 租车出行 | `/car-rental` | 前端演示数据/流程 |
| 地图测试页 | `/map-playground` | 独立高德地图测试数据，不接现有行程业务 |

## 地图测试页

`/map-playground` 用来验证高德地图能力，暂不接业务数据。

当前支持：

- 三组测试路线：杭州轻松游、成都城市烟火、西安历史文化
- 地图 marker 编号 1-4
- marker 间折线连接
- 左侧地点卡片与地图 marker 双向联动
- 点击 marker 弹出 InfoWindow
- 随机打乱顺序
- 回到全览 `setFitView`
- 未配置高德 key 时显示可读提示

相关文件：

```text
src/utils/amapLoader.ts
src/views/front/MapPlayground.vue
src/vite-env.d.ts
```

## 目录说明

```text
src/
├── api/             # API 调用层
├── assets/          # 静态资源
├── components/      # 页面组件和复用组件
├── layouts/         # FrontLayout 顶部导航和页脚
├── router/          # Vue Router 配置
├── stores/          # Pinia 状态
├── types/           # TypeScript 类型
├── utils/           # auth、request、高德 loader 等工具
└── views/front/     # 前台页面
```

## 与后端联调注意

- 后端很多接口还在骨架阶段，返回 501 时前端部分页面会弹出后端错误。
- 首页 `/home` 失败时显示页面空态，不再使用前端假数据兜底。
- 登录态 token 存在 localStorage，路由守卫会保护 `/ai-trip`、`/trips`、`/profile`、写游记等页面。
- 地图测试页只依赖前端高德 JSAPI key，不依赖后端高德 REST 配置。

## 不要做的事

- 不要混用 pnpm/yarn。本项目使用 npm，提交 `package-lock.json`。
- 不要提交真实 `.env` 和任何密钥。
- 地图测试页目前不要接入 `AiTrip.vue` 或 `DayPlanCard.vue`，后续业务整合再单独设计。
