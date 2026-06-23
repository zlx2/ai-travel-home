# PlanGo 前端

Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router

## 启动

```bash
npm install
npm run dev        # http://localhost:5173
```

演示账号 `sora / 123456`。

## Mock / 真实 API 切换

`.env` 中 `VITE_USE_MOCK` 控制：
- `true`（默认）：使用 localStorage Mock 数据
- `false`：调用后端 `/api` 接口

无论开关，登录注册始终走真实 API。

## 页面

| 页面 | 路由 | 数据来源 |
|------|------|----------|
| 首页 | / | Mock / API |
| 登录 | /login | API |
| 注册 | /register | API |
| 个人中心 | /profile | Mock / API |
| AI 行程规划 | /ai-trip | Mock / API |
| 行程列表 | /trips | Mock / API |
| 行程详情 | /trip/:id | Mock / API |
| 游记列表 | /notes | Mock / API |
| 游记详情 | /note/:id | Mock / API |
| 游记编辑 | /note-editor | Mock / API |
| 租车出行 | /car-rental | 纯 Mock（硬编码数据） |

## 目录

```
src/
├── api/          # API 调用层（Mock/真实双模式）
├── views/front/  # 页面组件（11 个）
├── components/   # 公共组件
├── stores/       # Pinia 状态
├── router/       # 路由配置
├── types/        # TypeScript 类型
├── data/         # Mock 数据
└── utils/        # 工具函数（auth、request）
```
