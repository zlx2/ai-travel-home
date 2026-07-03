# PlanGo 智能旅行规划平台 · 前端

基于 Vue 3 + TypeScript + Vite 的 AI 旅行规划 Web 端，结合高德地图提供从需求输入到行程可视化的完整交互体验。

## 技术栈

| 能力 | 选型 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 7 |
| UI | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| HTTP | Axios |
| 地图 | 高德 JSAPI（@amap/amap-jsapi-loader） |
| 编辑器 | @kangc/v-md-editor（Markdown） |
| 包管理 | npm 11 |

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 聚合展示：热门目的地推荐、精选游记、标签云 |
| `/login` | 登录 | 邮箱/用户名 + 密码 |
| `/register` | 注册 | 邮箱验证码注册 |
| `/forgot-password` | 重置密码 | 邮箱验证码重置 |
| `/ai-trip` | AI 行程规划 | **核心页面**：自然语言输入 → 需求分析 → 流式生成完整行程 |
| `/trips` | 我的行程 | 已保存行程列表 |
| `/trips/:id` | 行程详情 | 完整行程查看（每日路线/景点/预算） |
| `/notes` | 游记广场 | 用户游记列表（浏览/搜索） |
| `/notes/:id` | 游记详情 | 含点赞、收藏、评论互动 |
| `/notes/create` | 写游记 | Markdown 编辑器 |
| `/notes/edit/:id` | 编辑游记 | 草稿续写/修改 |
| `/car-rental` | 租车服务 | 租车报价/下单/支付演示 |
| `/profile` | 个人中心 | 个人资料/行程统计/游记管理 |

## 核心功能

### AI 行程规划 (`/ai-trip`)

这是平台的核心交互页面，采用多轮对话 + 流式生成的整体设计：

**1. 需求输入**
- 自然语言描述旅行意向（如"成都 3 天，带老人，不要太累"）
- AI 实时解析并结构化展示（目的地、天数、预算、节奏偏好）
- 支持追问补充（出发地、交通方式、饮食偏好等）

**2. 行程生成**
- SSE 流式推送生成进度（实时知道每个生成阶段的状态）
- 逐日生成：先宏观路线 → 再逐天细化
- 生成过程中可查看当前进度状态，无需等待完整结果
- 支持单日重新生成（调整某一天的计划）

**3. 结果展示**
- 每日行程时间线（景点/路线/餐饮/预算）
- 地图路线可视化（高德地图标注 + 路线连线）
- 预算明细（门票/餐饮/交通/住宿）
- 出行贴士

### 游记系统 (`/notes`)

- Markdown 编辑器撰写图文游记
- 游记广场浏览、搜索、按标签筛选
- 点赞 / 收藏 / 评论互动

### 租车服务 (`/car-rental`)

- 根据行程需求推荐租车方案
- 报价对比（车型/价格/门店）
- 下单 → 支付（支付宝沙箱演示）

### 用户系统

- 邮箱注册/登录
- 个人资料编辑
- 头像上传（腾讯云 COS）
- 行程/游记数据统计

## 组件架构

```
src/
├── api/                  # API 调用层（auth / trip / note / rental / user / file）
│   ├── index.ts          # 所有 API 封装 + 数据归一化
│   ├── auth.ts           # 认证相关
│   └── home.ts           # 首页相关
├── assets/               # 静态资源（图片/样式）
├── components/
│   ├── trip-builder/     # AI 行程规划核心组件
│   │   ├── DayPlanCard.vue          # 单日计划卡片
│   │   ├── FinalReviewPanel.vue     # 最终行程总览面板
│   │   ├── NaturalLanguageInputCard.vue  # 自然语言输入卡片
│   │   ├── RentalQuoteDeck.vue      # 租车报价展示
│   │   ├── RequirementSummaryBar.vue     # 需求摘要栏
│   │   ├── TripProgressRail.vue     # 生成进度轨道
│   │   ├── TripRouteMap.vue         # 高德地图路线组件
│   │   └── types.ts                 # 组件类型定义
│   └── ...                # 其他通用组件
├── layouts/              # 布局
│   └── FrontLayout.vue   # 前台布局（顶部导航 + 页脚）
├── router/               # 路由配置（含登录守卫）
├── stores/               # Pinia 状态管理
├── types/                # TypeScript 类型定义
├── utils/                # 工具函数
│   ├── auth.ts           # Token 管理
│   ├── request.ts        # Axios 封装（拦截器/错误处理）
│   └── tripLimits.ts     # 行程天数约束
└── views/front/          # 页面组件
```

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 5173）
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | API 请求前缀 | `/api` |
| `VITE_BACKEND_TARGET` | Vite 代理目标 | `http://127.0.0.1:8080` |
| `AMAP_API_KEY` | 高德地图 JSAPI Key | — |
| `AMAP_SECURITY_JS_CODE` | 高德安全密钥 | — |

开发模式下 Vite 自动代理 `/api` 到后端，生产环境通过 Nginx 反向代理。

## 生产部署

```bash
# 构建
npm run build

# 将 dist/ 部署到 Nginx 目录
# Nginx 配置参考：
#   root /var/www/ai-trip;
#   location / { try_files $uri $uri/ /index.html; }
#   location /api/ { proxy_pass http://127.0.0.1:10001; }
```

## 与后端联调

- 登录态 Token 存储在 localStorage，路由守卫自动保护需要登录的页面
- 所有 API 请求自动附带 Authorization header
- 后端 API 前缀 `/api`，通过 Nginx 或 Vite 代理转发到后端端口
- 首页 `/home` 接口失败时显示空态，不使用前端假数据兜底
