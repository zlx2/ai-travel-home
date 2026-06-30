<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChatDotRound, Collection, EditPen, Search, Star } from '@element-plus/icons-vue'
import { baseApi, noteApi } from '../../api'
import { useUserStore } from '../../stores/user'
import type { Note } from '../../types'

const router = useRouter()
const route = useRoute()
const store = useUserStore()
const loading = ref(false)
const items = ref<Note[]>([])
const tagList = ref<any[]>([])
const total = ref(0)
const tab = ref<'discover' | 'mine'>('discover')
const unmatchedTagName = ref('')

const params = reactive({ pageNum: 1, pageSize: 9, keyword: '', tagId: 0, sort: 'latest' })
const mineParams = reactive({ pageNum: 1, pageSize: 9, status: undefined as number | undefined })

const curPage = (t: 'discover' | 'mine') => (t === 'discover' ? params.pageNum : mineParams.pageNum)

const load = async () => {
  if (tab.value === 'discover' && unmatchedTagName.value) {
    items.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    if (tab.value === 'discover') {
      const data = await noteApi.list(params)
      items.value = data.list
      total.value = data.total
    } else {
      if (!store.isLogin) { router.push('/login'); return }
      const data = await noteApi.mine(mineParams)
      items.value = data.list
      total.value = data.total
    }
  } finally { loading.value = false }
}

const onPageChange = (p: number) => {
  if (tab.value === 'discover') params.pageNum = p
  else mineParams.pageNum = p
  load()
}

const chooseTag = (id: number) => { unmatchedTagName.value = ''; params.tagId = id; params.pageNum = 1; load() }
const chooseStatus = (s: number | undefined) => { mineParams.status = s; mineParams.pageNum = 1; load() }

const switchTab = (t: 'discover' | 'mine') => {
  tab.value = t
  if (t === 'mine' && !store.isLogin) { router.push('/login'); return }
  items.value = []; total.value = 0
  if (t === 'discover') { params.pageNum = 1; load() } else { mineParams.pageNum = 1; load() }
}

const goNote = (note: Note) => {
  if (note.status === 0) router.push(`/notes/edit/${note.id}`)
  else router.push(`/notes/${note.id}`)
}
const statusText = (s: number) => (s === 0 ? '草稿' : s === 1 ? '已发布' : '')

const handleTagParam = async () => {
  const tagName = route.query.tag ? decodeURIComponent(String(route.query.tag)) : ''
  unmatchedTagName.value = ''
  if (!tagName || !tagList.value.length) return
  const matchedTag = tagList.value.find(t => t.name === tagName)
  if (matchedTag) {
    params.tagId = matchedTag.id
    params.pageNum = 1
    load()
  } else {
    unmatchedTagName.value = tagName
    params.tagId = -1
    params.pageNum = 1
    items.value = []
    total.value = 0
  }
}

onMounted(async () => {
  try {
    tagList.value = await baseApi.tags()
  } catch {}
  handleTagParam()
  if (!params.tagId) load()
})

watch(() => route.query.tag, () => {
  unmatchedTagName.value = ''
  params.tagId = 0
  handleTagParam()
  if (!route.query.tag) load()
})
</script>

<template>
  <div class="notes-page">
    <section class="notes-hero">
      <div class="container">
        <span class="eyebrow">TRAVEL COMMUNITY</span>
        <h1>在真实故事里，遇见下一站</h1>
        <p>旅行者分享的路线、味道与那些计划之外的惊喜。</p>
        <div class="tab-switch">
          <button :class="{ active: tab === 'discover' }" @click="switchTab('discover')">发现</button>
          <button :class="{ active: tab === 'mine' }" @click="switchTab('mine')">我的</button>
        </div>
        <div v-if="tab === 'discover'" class="note-search">
          <el-input v-model="params.keyword" :prefix-icon="Search" size="large"
            placeholder="搜索目的地、游记标题" @keyup.enter="load" />
          <el-button class="gradient-button" type="primary" size="large" @click="load">搜索灵感</el-button>
        </div>
      </div>
    </section>

    <div class="container note-content">
      <div class="note-toolbar">
        <template v-if="tab === 'discover'">
          <div class="tag-filters">
            <button :class="{ active: !params.tagId }" @click="chooseTag(0)">全部</button>
            <button v-for="tag in tagList" :key="tag.id" :class="{ active: params.tagId === tag.id }"
              @click="chooseTag(tag.id)">{{ tag.name }}</button>
          </div>
          <div>
            <el-radio-group v-model="params.sort" @change="load">
              <el-radio-button label="latest">最新</el-radio-button>
              <el-radio-button label="hot">热门</el-radio-button>
            </el-radio-group>
          </div>
        </template>
        <template v-else>
          <div class="status-filters">
            <button :class="{ active: mineParams.status === undefined }" @click="chooseStatus(undefined)">全部</button>
            <button :class="{ active: mineParams.status === 0 }" @click="chooseStatus(0)">草稿</button>
            <button :class="{ active: mineParams.status === 1 }" @click="chooseStatus(1)">已发布</button>
          </div>
        </template>
        <el-button type="primary" :icon="EditPen" @click="router.push('/notes/create')">写游记</el-button>
      </div>

      <!-- 列表 -->
      <div v-loading="loading" class="notes-grid" v-if="items.length">
        <article v-for="note in items" :key="note.id" class="note-card card" @click="goNote(note)">
          <div class="cover">
            <img :src="note.coverUrl">
            <span class="cover-badge" :class="{ draft: note.status === 0 }">
              {{ statusText(note.status) || note.destination }}
            </span>
          </div>
          <div class="note-body">
            <div class="note-date">{{ note.createTime }}</div>
            <h2>{{ note.title || '(未命名游记)' }}</h2>
            <p>{{ note.summary || '还没有摘要' }}</p>
            <div class="note-tags">
              <el-tag v-for="tag in note.tags" :key="tag" size="small" effect="light">{{ tag }}</el-tag>
            </div>
            <div class="note-meta">
              <el-avatar :size="30" :src="note.authorAvatarUrl" />
              <b>{{ note.authorNickname }}</b>
              <span><el-icon><Star /></el-icon>{{ note.likeCount }}</span>
              <span><el-icon><Collection /></el-icon>{{ note.favoriteCount }}</span>
              <span><el-icon><ChatDotRound /></el-icon>{{ note.commentCount }}</span>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-wrap card">
        <el-empty :description="unmatchedTagName ? `暂无“${unmatchedTagName}”标签，请先在后台标签表中维护` : (tab === 'discover' ? '暂无符合条件的游记' : '还没有写过游记，快去发布一篇吧')">
          <el-button v-if="tab === 'mine'" type="primary" @click="router.push('/notes/create')">写一篇游记</el-button>
        </el-empty>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="total > 9">
        <el-pagination :current-page="curPage(tab)" :page-size="9" :total="total"
          layout="prev, pager, next" @current-change="onPageChange" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-hero{text-align:center;padding:60px 0 85px;background:linear-gradient(120deg,#edf8ff,#e7f8f1)}
.notes-hero h1{font-size:42px;margin:10px}.notes-hero p{color:#6e7b8d}
.tab-switch{display:inline-flex;background:#e2e9f2;border-radius:99px;padding:4px;margin-top:20px}
.tab-switch button{border:0;background:transparent;padding:9px 28px;border-radius:99px;font-size:15px;color:#556375;cursor:pointer;transition:.2s}
.tab-switch button.active{background:#fff;color:#2f5b9c;box-shadow:0 4px 12px #22446618;font-weight:600}
.note-search{display:flex;width:620px;margin:28px auto 0;padding:8px;background:#fff;border-radius:16px;box-shadow:0 14px 38px #3568891c}
.note-search :deep(.el-input__wrapper){box-shadow:none}
.note-content{margin-top:-35px}
.note-toolbar{display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 10px 30px #3d5d7c12;margin-bottom:24px}
.tag-filters,.status-filters{display:flex;gap:7px}
.tag-filters button,.status-filters button{border:0;background:transparent;padding:9px 13px;border-radius:99px;color:#667487;cursor:pointer}
.tag-filters button.active,.status-filters button.active{color:#fff;background:var(--gradient)}
.note-toolbar>div:last-child{display:flex;gap:10px}
.notes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;min-height:300px}
.note-card{overflow:hidden;cursor:pointer;transition:.25s}
.note-card:hover{transform:translateY(-5px);box-shadow:0 18px 45px #31506d20}
.cover{height:220px;position:relative;overflow:hidden}
.cover img{width:100%;height:100%;object-fit:cover;transition:.4s}
.note-card:hover img{transform:scale(1.04)}
.cover-badge{position:absolute;left:15px;top:15px;background:#17293ca8;color:#fff;padding:6px 10px;border-radius:99px;font-size:11px}
.cover-badge.draft{background:#e6a23cb8}
.note-body{padding:20px}
.note-date{font-size:10px;color:#9aa2ae}
.note-body h2{font-size:18px;line-height:1.4;margin:8px 0}
.note-body>p{color:#778293;font-size:13px;line-height:1.65;height:42px}
.note-tags .el-tag{border:0;margin-right:6px}
.note-meta{display:flex;align-items:center;gap:7px;padding-top:15px;margin-top:16px;border-top:1px solid #edf0f4;font-size:11px;color:#7f8997}
.note-meta b{margin-right:auto;color:#475366}
.note-meta span{display:flex;align-items:center;gap:3px}
.pagination{display:flex;justify-content:center;margin-top:30px}
</style>
