# PlanGo · 智能旅行规划平台

Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router。

## 启动

```bash
npm install
npm run dev
```

访问 `http://localhost:5173`，演示账号 `sora / 123456`。

## 页面

- 首页 Home
- 登录/注册 Login / Register
- 个人中心 Profile
- AI 行程规划 AiTrip
- 行程列表/详情 TripList / TripDetail
- 游记列表/详情/编辑 NoteList / NoteDetail / NoteEditor
- 租车出行 CarRental（当前使用 Mock 数据）

## 对接后端

`.env.example` → `.env`，设置 `VITE_API_BASE_URL`。页面与数据层已分离。
