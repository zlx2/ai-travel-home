<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, Collection, Compass, MagicStick, MapLocation } from '@element-plus/icons-vue'
import { homeApi } from '../../api'
import type { Destination, Note } from '../../types'
import {
  cssImage,
  destinationImageCandidates,
  homeCosImage,
  setNextHomeImage,
} from '../../utils/homeImages'

const router = useRouter()
const homeLoading = ref(true)
const isAiPlanningEntering = ref(false)
const isTravelNoteEntering = ref(false)
const isAiPlanningRippling = ref(false)
const isTravelNoteRippling = ref(false)
const destinations = ref<Destination[]>([])
const notes = ref<Note[]>([])
const routes = ref<any[]>([])
const tags = ref<any[]>([])
const heroCosImage = cssImage(homeCosImage('hero-chongqing-v2.png'))
const mapCosImage = cssImage(homeCosImage('map-card.jpg'))
const defaultRoutes = [
  { destination: '重庆', days: 3, preferences: ['美食', '夜景'] },
  { destination: '成都', days: 4, preferences: ['美食', '轻松游'] },
  { destination: '西安', days: 3, preferences: ['历史文化', '拍照打卡'] },
  { destination: '厦门', days: 3, preferences: ['海岛', '轻松游'] },
]
const fallbackHotTags = [
  { name: '美食', style: { '--tag-bg': '#fff2df', '--tag-fg': '#b65712', '--tag-dot': '#ff9f1c', '--tag-shadow': 'rgba(246, 141, 35, .16)' } },
  { name: '夜景', style: { '--tag-bg': '#eef1ff', '--tag-fg': '#4256bc', '--tag-dot': '#6574ff', '--tag-shadow': 'rgba(86, 104, 224, .16)' } },
  { name: '亲子', style: { '--tag-bg': '#fff0f6', '--tag-fg': '#bf3f74', '--tag-dot': '#f472b6', '--tag-shadow': 'rgba(244, 114, 182, .16)' } },
  { name: '轻松游', style: { '--tag-bg': '#eaf8ef', '--tag-fg': '#16784a', '--tag-dot': '#27c276', '--tag-shadow': 'rgba(39, 194, 118, .16)' } },
  { name: '拍照打卡', style: { '--tag-bg': '#eef8ff', '--tag-fg': '#1768a8', '--tag-dot': '#2f9bea', '--tag-shadow': 'rgba(47, 155, 234, .16)' } },
  { name: '文化历史', style: { '--tag-bg': '#f7f0e4', '--tag-fg': '#8a5a1f', '--tag-dot': '#c48a39', '--tag-shadow': 'rgba(196, 138, 57, .16)' } },
  { name: '海岛', style: { '--tag-bg': '#e6fbfb', '--tag-fg': '#08787d', '--tag-dot': '#12b8bd', '--tag-shadow': 'rgba(18, 184, 189, .16)' } },
  { name: '徒步', style: { '--tag-bg': '#eef7e6', '--tag-fg': '#4c7a1f', '--tag-dot': '#83bd3f', '--tag-shadow': 'rgba(131, 189, 63, .16)' } },
  { name: '自驾', style: { '--tag-bg': '#fff6e8', '--tag-fg': '#a0491d', '--tag-dot': '#f97316', '--tag-shadow': 'rgba(249, 115, 22, .16)' } },
]
const defaultTagStyle = { '--tag-bg': '#eef6ff', '--tag-fg': '#176ff1', '--tag-shadow': 'rgba(47,128,237,.16)' }
const displayedHotTags = computed(() => {
  const names = tags.value.length ? tags.value.map((tag) => tag.name) : fallbackHotTags.map((tag) => tag.name)
  return names.map((name) => fallbackHotTags.find((tag) => tag.name === name) || { name, style: defaultTagStyle })
})
routes.value = defaultRoutes
const feedbackTimers: number[] = []

onMounted(async () => {
  try {
    const data = await homeApi.getHome()
    destinations.value = data.hotDestinations || []
    notes.value = data.hotNotes || []
    tags.value = data.hotTags || []
    routes.value = data.recommendedTrips || defaultRoutes
  } catch {
    routes.value = defaultRoutes
  } finally {
    homeLoading.value = false
  }
})

onUnmounted(() => {
  feedbackTimers.forEach((timer) => window.clearTimeout(timer))
})

const setFeedbackTimer = (callback: () => void, delay = 650) => {
  const timer = window.setTimeout(callback, delay)
  feedbackTimers.push(timer)
}

const triggerRipple = (state: Ref<boolean>) => {
  state.value = false
  requestAnimationFrame(() => {
    state.value = true
    setFeedbackTimer(() => {
      state.value = false
    }, 520)
  })
}

const enterAiPlanning = () => {
  if (isAiPlanningEntering.value) return
  triggerRipple(isAiPlanningRippling)
  isAiPlanningEntering.value = true
  setFeedbackTimer(async () => {
    try {
      await router.push('/ai-trip')
    } finally {
      isAiPlanningEntering.value = false
    }
  })
}

const enterTravelNotes = () => {
  if (isTravelNoteEntering.value) return
  triggerRipple(isTravelNoteRippling)
  isTravelNoteEntering.value = true
  setFeedbackTimer(async () => {
    try {
      await router.push('/notes')
    } finally {
      isTravelNoteEntering.value = false
    }
  })
}

const useRoute = (item: any) => router.push({
  path: '/ai-trip',
  query: { destination: item.destination, days: item.days, preferences: item.preferences.join(',') },
})

const useDestination = (item: Destination) => router.push({
  path: '/ai-trip',
  query: { destination: item.name, preferences: item.tags?.slice(0, 3).join(',') },
})

const goToNotesWithTag = (tag: string) => {
  const tagAlias: Record<string, string> = { 文化历史: '历史文化' }
  router.push({ path: '/notes', query: { tag: encodeURIComponent(tagAlias[tag] || tag) } })
}

const imageOfDestination = (item?: Pick<Destination, 'name' | 'coverUrl'>) =>
  destinationImageCandidates(item?.name, item?.coverUrl)

const imageOfRoute = (item: any, index: number) =>
  destinationImageCandidates(item.destination, destinations.value[index]?.coverUrl)

const imageOfNote = (note: Note) =>
  destinationImageCandidates(note.destination, note.coverUrl)

</script>

<template>
  <div class="compact-home">
    <section class="reference-hero" :style="{ '--hero-cos-image': heroCosImage }">
      <div class="container hero-grid">
        <div class="hero-copy">
          <h1>用 AI 轻松规划<br><span>你的下一次旅行</span></h1>
          <p>智能生成个性化行程，推荐地道玩法与美食，<br>让每一次出发都更省心、更精彩。</p>
          <div class="hero-actions">
            <el-button
              class="hero-action-button gradient-button"
              :class="{ 'is-rippling': isAiPlanningRippling }"
              type="primary"
              size="large"
              :loading="isAiPlanningEntering"
              :disabled="isAiPlanningEntering"
              @click="enterAiPlanning"
            >
              <el-icon v-if="!isAiPlanningEntering"><Compass /></el-icon>
              {{ isAiPlanningEntering ? '正在进入 AI 规划...' : '立即开始 AI 规划' }}
            </el-button>
            <el-button
              class="hero-action-button notes-action-button"
              :class="{ 'is-rippling': isTravelNoteRippling }"
              size="large"
              :loading="isTravelNoteEntering"
              :disabled="isTravelNoteEntering"
              @click="enterTravelNotes"
            >
              <el-icon v-if="!isTravelNoteEntering"><Collection /></el-icon>
              {{ isTravelNoteEntering ? '正在打开热门游记...' : '查看热门游记' }}
            </el-button>
          </div>
          <div class="hero-proof">
            <span><b>10万+</b>次智能规划</span>
            <span><b>3分钟</b>生成行程</span>
            <span><b>城市玩法</b>持续更新</span>
          </div>
        </div>

        <div class="planner-mock">
          <div class="mock-title"><el-icon><MagicStick /></el-icon><b>为你生成的行程</b><small>（示例）</small></div>
          <div class="mock-content">
            <aside><b><el-icon><MapLocation /></el-icon>行程概览</b><span><el-icon><Calendar /></el-icon>每日行程</span><span>✦ 景点推荐</span><span>♨ 美食推荐</span><span>▣ 交通建议</span></aside>
            <div class="mock-main">
              <h2>重庆 3 日 2 夜</h2>
              <div class="chips"><i>美食之旅</i><i>城市夜景</i><i>轻松游</i></div>
              <p>2026/06/22 - 06/24　·　2 人出行</p>
              <div class="mock-route"><h3>行程概览</h3><div><em></em><b>洪崖洞夜景</b><small>璀璨夜色，重庆地标打卡</small></div><div><em class="green"></em><b>长江索道</b><small>横跨长江，俯瞰山城风光</small></div><div><em class="orange"></em><b>磁器口古镇</b><small>老街古镇，体验传统文化</small></div><a>查看完整行程 ›</a></div>
            </div>
            <div class="mock-side"><div class="map-card" :style="{ '--map-cos-image': mapCosImage }"></div><div class="ai-tip"><b>AI 小贴士</b><p>重庆夏季多雨，建议携带轻便雨具与舒适步行鞋。</p><span>✦</span></div></div>
          </div>
        </div>
      </div>
      <div class="hero-dots"><i class="active"></i><i></i><i></i><i></i></div>
    </section>

    <div class="home-body">
      <section class="container compact-dashboard">
        <article class="dash-panel destination-panel"><div class="panel-head"><h3>热门目的地</h3></div><el-skeleton v-if="homeLoading && !destinations.length" class="home-skeleton grid-skeleton" :rows="3" animated /><div v-else class="mini-destinations"><button v-for="item in destinations" :key="item.id" @click="useDestination(item)"><img :src="imageOfDestination(item)[0]" @error="setNextHomeImage($event, imageOfDestination(item))"><span>{{ item.name }}</span></button></div></article>
        <div class="dash-middle">
          <article class="dash-panel tag-panel"><h3>热门标签</h3><div class="hot-tag-row"><button v-for="tag in displayedHotTags" :key="tag.name" class="hot-tag" :style="tag.style" @click="goToNotesWithTag(tag.name)">{{ tag.name }}</button></div></article>
          <article class="dash-panel route-panel"><div class="panel-head"><h3>推荐行程</h3></div><div class="mini-routes"><button v-for="(item, i) in routes" :key="item.destination" @click="useRoute(item)"><img :src="imageOfRoute(item, i)[0]" @error="setNextHomeImage($event, imageOfRoute(item, i))"><b>{{ item.destination }} {{ item.days }} 日游</b><span>{{ item.preferences.join(' · ') }}</span></button></div></article>
        </div>
        <article class="dash-panel note-panel"><div class="panel-head"><h3>热门游记</h3><a @click="router.push('/notes')">查看更多 ›</a></div><el-skeleton v-if="homeLoading && !notes.length" class="home-skeleton note-skeleton" :rows="4" animated /><div v-else class="mini-notes"><button v-for="note in notes" :key="note.id" @click="router.push(`/notes/${note.id}`)"><img :src="imageOfNote(note)[0]" @error="setNextHomeImage($event, imageOfNote(note))"><b>{{ note.title }}</b><p>{{ note.summary }}</p><div><span>{{ note.authorNickname }}</span><small>♥ {{ note.likeCount }}</small></div></button></div></article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.compact-home {
  --page-width: min(1680px, calc(100vw - clamp(48px, 6vw, 120px)));
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f7faff 0%, #f8fbff 100%);
}
.compact-home .container { width: var(--page-width); }
.reference-hero {
  height: clamp(410px, 42vh, 485px);
  min-height: 410px;
  position: relative;
  overflow: hidden;
  background-image: linear-gradient(90deg, rgba(242,250,255,.97) 0%, rgba(230,246,255,.85) 32%, rgba(213,239,251,.16) 60%), var(--hero-cos-image);
  background-position: center;
  background-size: cover;
}
.hero-grid {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(430px, .9fr) minmax(650px, 1.25fr);
  gap: clamp(44px, 5vw, 90px);
  align-items: center;
}
.hero-copy { padding-left: clamp(0px, 1vw, 18px); }
.hero-copy h1 { font-size: clamp(48px, 3vw, 62px); line-height: 1.12; letter-spacing: -1.5px; margin: 0 0 16px; color: #162033; }
.hero-copy h1 span { font-size: 1.04em; background: linear-gradient(90deg,#1874d1,#0c9f7c 62%,#c67a22); -webkit-background-clip: text; color: transparent; }
.hero-copy>p { font-size: clamp(15px, 1vw, 18px); line-height: 1.75; color: #5f6b7c; margin: 0 0 21px; }
.hero-actions { display: flex; gap: 16px; }
.hero-actions .el-button { height: 48px; border-radius: 9px; padding: 0 26px; font-size: 15px; }
.hero-actions .hero-action-button {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transform: translateY(0) scale(1);
  transition: transform .18s ease, box-shadow .22s ease, background .22s ease, border-color .22s ease;
  will-change: transform;
}
.hero-actions .gradient-button.hero-action-button {
  border: 0;
  background: linear-gradient(135deg, #1675d1 0%, #0aa47f 100%) !important;
  box-shadow: 0 12px 24px rgba(17,126,124,.22);
}
.hero-actions .notes-action-button {
  color: #1b6aa8;
  border-color: rgba(27,106,168,.5);
  background: rgba(255,255,255,.76);
  box-shadow: 0 8px 18px rgba(85,98,112,.1);
  backdrop-filter: blur(10px);
}
.hero-actions .hero-action-button:hover:not(.is-disabled) {
  transform: translateY(-2px);
}
.hero-actions .gradient-button.hero-action-button:hover:not(.is-disabled) {
  background: linear-gradient(135deg, #0f82df 0%, #0bb18a 100%) !important;
  box-shadow: 0 16px 32px rgba(17,126,124,.3);
}
.hero-actions .notes-action-button:hover:not(.is-disabled) {
  color: #0f5d98;
  border-color: rgba(12,159,124,.62);
  background: rgba(255,255,255,.92);
  box-shadow: 0 14px 28px rgba(85,98,112,.16);
}
.hero-actions .hero-action-button:active:not(.is-disabled) {
  transform: translateY(0) scale(.96);
}
.hero-actions .hero-action-button::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: -1;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255,255,255,.42);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
}
.hero-actions .notes-action-button::after {
  background: rgba(23,111,241,.16);
}
.hero-actions .hero-action-button.is-rippling::after {
  animation: hero-button-ripple .52s ease-out;
}
.hero-actions .hero-action-button :deep(.el-icon) {
  transition: transform .2s ease;
}
.hero-actions .hero-action-button:hover:not(.is-disabled) :deep(.el-icon:not(.is-loading)) { transform: translateX(2px); }

@keyframes hero-button-ripple {
  0% { opacity: .55; transform: translate(-50%, -50%) scale(0); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(18); }
}
.hero-proof { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-top: 18px; font-size: 12px; color: #667387; }
.hero-proof span {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 999px;
  background: rgba(255,255,255,.62);
  box-shadow: 0 8px 18px rgba(80,91,105,.08);
  backdrop-filter: blur(12px);
}
.hero-proof b { color: #1c2a3f; font-size: 14px; }
.planner-mock {
  height: min(390px, calc(45vh - 55px));
  min-height: 350px;
  background: #ffffffed;
  border: 1px solid #ffffffd9;
  border-radius: 18px;
  box-shadow: 0 18px 55px rgba(44,92,132,.18);
  overflow: hidden;
  backdrop-filter: blur(15px);
}
.mock-title { height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 19px; border-bottom: 1px solid #e8edf3; font-size: 13px; }
.mock-title .el-icon { color: #0c9f7c; }
.mock-title small { color: #8c96a5; }
.mock-content { display: grid; grid-template-columns: 112px minmax(300px, 1fr) 205px; height: calc(100% - 48px); }
.mock-content aside { padding: 14px 9px; border-right: 1px solid #edf1f5; display: flex; flex-direction: column; gap: 5px; color: #667286; font-size: 11px; }
.mock-content aside>* { height: 36px; border-radius: 7px; padding: 0 9px; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.mock-content aside b { background: #eaf3ff; color: #176ff1; border-left: 3px solid #176ff1; }
.mock-main { padding: 14px; }
.mock-main h2 { font-size: 22px; margin: 0 0 6px; }
.chips { display: flex; gap: 6px; }
.chips i { font-style: normal; font-size: 10px; border-radius: 10px; padding: 3px 9px; background: #dceeff; color: #4184c6; }
.chips i:nth-child(2) { background: #ffe9ce; color: #db8a28; }
.chips i:nth-child(3) { background: #dff5e4; color: #43a25d; }
.mock-main>p { font-size: 10px; color: #758092; margin: 7px 0; }
.mock-route { background: #fff; border: 1px solid #e7ecf1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 5px 14px #7890a010; }
.mock-route h3 { font-size: 12px; margin: 0 0 3px; }
.mock-route>div { padding: 5px 0 5px 17px; position: relative; }
.mock-route em { position: absolute; left: 0; top: 10px; width: 9px; height: 9px; border-radius: 50%; border: 2px solid #2686ff; }
.mock-route em.green { border-color: #39c76e; }
.mock-route em.orange { border-color: #ffa81c; }
.mock-route b,.mock-route small { display: block; }
.mock-route b { font-size: 11px; }
.mock-route small { font-size: 9px; color: #7c8797; }
.mock-route a { display: block; color: #176ff1; font-size: 10px; margin-top: 3px; }
.mock-side { padding: 15px 11px 9px 2px; }
.map-card { height: 56%; border: 5px solid #fff; border-radius: 14px; background-image: var(--map-cos-image); background-position: center; background-size: cover; box-shadow: 0 4px 14px #647c8f42; }
.ai-tip { min-height: 94px; margin-top: 9px; border-radius: 11px; background: #fff; padding: 11px; box-shadow: 0 4px 14px #647c8f22; position: relative; }
.ai-tip b { font-size: 11px; color: #176ff1; }
.ai-tip p { font-size: 9px; line-height: 1.55; width: 135px; color: #5e6a7b; }
.ai-tip span { position: absolute; right: 10px; bottom: 9px; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--gradient); color: #fff; }
.hero-dots { position: absolute; left: 50%; bottom: 12px; display: flex; gap: 10px; }
.hero-dots i { width: 8px; height: 8px; border-radius: 50%; background: #8d98a8; }
.hero-dots i.active { background: #4d8eea; }
.home-body { padding: clamp(14px, 1.6vh, 20px) 0 clamp(18px, 2vh, 26px); }
.compact-dashboard { width: min(1840px, calc(100vw - 48px)) !important; margin-top: clamp(12px, 1.4vh, 16px); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 1.4fr); gap: clamp(10px, .8vw, 16px); align-items: stretch; }
.compact-dashboard>* { min-height: 0; }
.dash-panel { min-height: 0; background: #fff; border: 1px solid #e9eef3; border-radius: 13px; padding: 14px 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(53,78,110,.045); }
.home-skeleton { min-height: 118px; }
.note-skeleton { min-height: 142px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; height: 25px; margin-bottom: 10px; }
.panel-head h3,.tag-panel h3 { font-size: 17px; margin: 0; }
.panel-head a { font-size: 12px; color: #7f8998; cursor: pointer; transition: color .2s ease, transform .2s ease; }
.panel-head a:hover { color: #176ff1; transform: translateX(2px); }
.mini-destinations { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(7px, .5vw, 10px); }
.mini-destinations button { aspect-ratio: 16 / 9; min-width: 0; border: 0; border-radius: 8px; overflow: hidden; position: relative; padding: 0; cursor: pointer; background: #ddd; transition: transform .24s ease, box-shadow .24s ease; }
.mini-destinations button:hover { transform: translateY(-5px) rotate(-.4deg); box-shadow: 0 15px 28px rgba(31,57,86,.2); }
.mini-destinations button:active { transform: translateY(-1px) scale(.97); }
.mini-destinations img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .42s ease, filter .42s ease; }
.mini-destinations button:hover img { transform: scale(1.08); filter: saturate(1.08); }
.mini-destinations button:after { content: ''; position: absolute; inset: 40% 0 0; background: linear-gradient(transparent,#0b1424bb); }
.mini-destinations span { position: absolute; z-index: 1; left: 10px; bottom: 7px; color: #fff; font-size: clamp(15px, 1vw, 18px); font-weight: 800; text-shadow: 0 1px 3px #000; }
.dash-middle { display: grid; grid-template-rows: auto auto; gap: clamp(9px, .7vw, 12px); align-content: start; min-height: 0; }
.tag-panel { padding-top: 10px; }
.tag-panel h3 { margin-bottom: 7px; }
.hot-tag-row { display: flex; flex-wrap: wrap; gap: 8px 10px; }
.hot-tag {
  --tag-bg: #eef6ff;
  --tag-fg: #176ff1;
  --tag-shadow: rgba(47,128,237,.16);
  height: 32px;
  border: 0;
  border-radius: 999px;
  padding: 0 13px;
  background: var(--tag-bg);
  color: var(--tag-fg);
  font-size: 14px;
  font-weight: 500;
  line-height: 32px;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
  transition: transform .18s ease, box-shadow .2s ease, filter .2s ease;
}
.hot-tag:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px var(--tag-shadow), inset 0 1px 0 rgba(255,255,255,.86);
  filter: saturate(1.08);
}
.hot-tag:active { transform: translateY(0) scale(.96); }
.route-panel { min-height: 0; padding-top: 12px; }
.mini-routes { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: clamp(7px, .5vw, 10px); }
.mini-routes button { border: 1px solid transparent; background: transparent; text-align: left; padding: 0 0 6px; min-width: 0; min-height: 0; cursor: pointer; border-radius: 9px; overflow: hidden; transition: transform .22s ease, background .22s ease, border-color .22s ease; }
.mini-routes button:hover { transform: translateY(-4px); background: #f8fbff; border-color: #dbe9f5; }
.mini-routes button:active { transform: translateY(-1px) scale(.97); }
.mini-routes img { width: 100%; height: auto; aspect-ratio: 16 / 9; display: block; object-fit: cover; border-radius: 7px; transition: transform .32s ease; }
.mini-routes button:hover img { transform: scale(1.035); }
.mini-routes b,.mini-routes span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-routes b { font-size: 13px; margin: 4px 0; }
.mini-routes span { font-size: 11px; color: #6d80a1; }
.mini-notes { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(8px, .6vw, 12px); }
.mini-notes button { border: 0; background: transparent; text-align: left; padding: 0; min-width: 0; min-height: 0; cursor: pointer; border-radius: 10px; transition: transform .25s ease; }
.mini-notes button:hover { transform: translateY(-5px); }
.mini-notes button:active { transform: translateY(-1px) scale(.98); }
.mini-notes img { width: 100%; height: auto; aspect-ratio: 16 / 9; display: block; object-fit: cover; border-radius: 8px; box-shadow: 0 8px 18px rgba(31,57,86,.12); transition: transform .35s ease, box-shadow .35s ease; }
.mini-notes button:hover img { transform: translateY(-2px); box-shadow: 0 16px 28px rgba(31,57,86,.22); }
.mini-notes b { display: block; font-size: 13px; margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-notes p { font-size: 11px; color: #6e7989; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-notes div { display: flex; justify-content: space-between; color: #7e8998; font-size: 11px; margin-top: 5px; }

@media (max-width: 1450px) {
  .compact-home { --page-width: min(1320px, calc(100vw - 48px)); }
  .hero-grid { grid-template-columns: minmax(400px,.85fr) minmax(600px,1.2fr); gap: 34px; }
  .hero-copy h1 { font-size: clamp(43px, 3.35vw, 52px); }
}
@media (max-height: 850px) {
  .reference-hero { height: 410px; }
}
</style>
