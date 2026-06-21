# AI 智行伴旅 · 一期前台

技术栈：Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router、Axios、v-md-editor。

## 启动

```bash
npm install
npm run dev
```

访问：`http://localhost:5173`

演示账号：`sora / 123456`。当前默认使用本地 Mock 数据，并通过 localStorage 持久化行程、游记和评论。

## 后续对接后端

复制 `.env.example` 为 `.env`，设置：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

页面与数据访问层已经分离，对接时主要调整 `src/api` 和类型映射，无需重写页面。
