import requestClient from '../utils/request'
import { TOKEN_KEY } from '../utils/auth'
import type {
  AnalyzeResult,
  Comment,
  GenerateProgressEvent,
  GenerateResult,
  Note,
  PageResult,
  Requirement,
  Trip,
  TripDay,
  TripPlan,
  UserInfo,
} from '../types'
import { normalizeTripDays } from '../utils/tripLimits'

const request: any = requestClient
const AI_GENERATE_TIMEOUT_MS = 240000
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const withNormalizedRequirementDays = (requirement: Requirement): Requirement => ({
  ...requirement,
  days: normalizeTripDays(requirement.days),
})

export interface UserProfileStats {
  tripCount: number
  noteCount: number
  likeCount: number
  favoriteCount: number
}

export const authApi = {
  login(payload: { account: string; password: string }) {
    return request.post('/auth/login', payload) as Promise<{ token: string; user: UserInfo }>
  },
  register(payload: { username: string; email: string; password: string; emailCode: string }) {
    return request.post('/auth/register', payload) as Promise<{ id: number }>
  },
  sendCode(email: string, scene: string = 'register') {
    return request.post('/auth/email-code', { email, scene }) as Promise<void>
  },
  logout() {
    return request.post('/auth/logout') as Promise<void>
  },
  sendResetCode(email: string) {
    return request.post('/auth/email-code', { email, scene: 'reset_password' }) as Promise<void>
  },
  resetPassword(payload: { email: string; emailCode: string; newPassword: string }) {
    return request.post('/auth/password-reset', payload) as Promise<void>
  },
}

export const aiApi = {
  analyze(payload: {
    conversationId?: string | null
    userInput: string
    extraAnswers?: string[]
    requirement?: Partial<Requirement>
  }) {
    return request.post('/ai/trips/analyze', payload) as Promise<AnalyzeResult>
  },
  async generate(
    conversationId: string,
    requirement: Requirement,
    extras?: { selectedQuote?: any; rentalTripContext?: any },
  ): Promise<GenerateResult> {
    const safeRequirement = withNormalizedRequirementDays(requirement)
    const data = await request.post(
      '/ai/trips/generate',
      { conversationId, requirement: safeRequirement, ...extras },
      { timeout: AI_GENERATE_TIMEOUT_MS, suppressError: true },
    )
    return normalizeGenerateResult(data)
  },
  async generateDay(
    sessionId: string,
    dayNo: number,
    options?: {
      requestMode?: 'USER' | 'PREFETCH' | 'ASYNC'
      forceRegenerate?: boolean
      prefetchNext?: boolean
      revisionText?: string
    },
  ): Promise<TripDay> {
    const maxAttempts = 60
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const data = await request.post(`/ai/trips/generate/session/${sessionId}/days/${dayNo}`, null, {
        params: {
          requestMode: options?.requestMode || 'USER',
          forceRegenerate: attempt === 0 ? options?.forceRegenerate ?? false : false,
          prefetchNext: attempt === 0 ? options?.prefetchNext ?? true : false,
          revisionText: options?.revisionText || undefined,
        },
        timeout: AI_GENERATE_TIMEOUT_MS,
        suppressError: true,
      })
      if (data.status === 'FAILED') throw new Error(data.errorMessage || `第 ${dayNo} 天生成失败`)
      if (data.resultJson) {
        const dayJson = typeof data.resultJson === 'string' ? JSON.parse(data.resultJson) : data.resultJson
        const normalized = normalizeTripDay(dayJson, dayNo - 1)
        return { ...normalized, day: dayNo }
      }
      if (['QUEUED', 'GENERATING', 'PENDING'].includes(data.status)) {
        if (attempt < maxAttempts - 1) {
          await sleep(2000)
          continue
        }
        break
      }
      if (data.status === 'GENERATED') throw new Error(`第 ${dayNo} 天生成完成但没有返回结果`)
      if (attempt < maxAttempts - 1) await sleep(2000)
    }
    throw new Error(`第 ${dayNo} 天生成超时，请稍后重试`)
  },
  async generateStream(
    conversationId: string,
    requirement: Requirement,
    onProgress: (event: GenerateProgressEvent) => void,
    extras?: { selectedQuote?: any; rentalTripContext?: any },
  ): Promise<GenerateResult> {
    const safeRequirement = withNormalizedRequirementDays(requirement)
    const token = localStorage.getItem(TOKEN_KEY)
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/ai/trips/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ conversationId, requirement: safeRequirement, ...extras }),
    })
    if (!response.ok || !response.body) throw new Error('无法连接行程生成进度流，请稍后重试')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let result: GenerateResult | undefined
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split(/\r?\n\r?\n/)
      buffer = chunks.pop() || ''
      for (const chunk of chunks) {
        const dataText = chunk
          .split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n')
        if (!dataText) continue
        const event = JSON.parse(dataText) as GenerateProgressEvent
        if (event.type === 'done' && event.data) {
          result = normalizeGenerateResult(event.data)
          onProgress({ ...event, data: result })
        } else {
          onProgress(event)
          if (event.type === 'error') throw new Error(event.message || '行程生成失败，请稍后重试')
        }
      }
    }
    if (!result) throw new Error('行程生成结束但没有返回结果，请稍后重试')
    return result
  },
}

function normalizeGenerateResult(data: any): GenerateResult {
  return {
    schemaVersion: data.schemaVersion,
    conversationId: data.conversationId,
    generationSessionId: data.generationSessionId || data.sessionId,
    requirement: data.requirement,
    recommendationContext: data.recommendationContext,
    tripPlan: normalizeTripPlan(data.tripPlan),
    dayStatuses: data.dayStatuses || [],
  }
}

function normalizeTripPlan(plan: any): TripPlan {
  const dailyPlans = plan.dailyPlans || plan.daysPlan || plan.itineraryDays || plan.dayPlans || []
  return {
    title: plan.title,
    destination: plan.destination,
    days: plan.days || dailyPlans.length,
    summary: plan.summary,
    dailyPlans: dailyPlans.map((day: any, index: number) => normalizeTripDay(day, index)),
    accommodation: plan.accommodation || [plan.accommodationSuggestion?.area, plan.accommodationSuggestion?.reason, plan.accommodationSuggestion?.priceRange].filter(Boolean).join(' · '),
    budgetSummary: {
      transport: plan.budgetSummary?.transport ?? plan.budgetSummary?.transportCost ?? 0,
      hotel: plan.budgetSummary?.hotel ?? plan.budgetSummary?.hotelCost ?? null,
      food: plan.budgetSummary?.food ?? plan.budgetSummary?.foodCost ?? 0,
      tickets: plan.budgetSummary?.tickets ?? plan.budgetSummary?.ticketCost ?? 0,
      total: plan.budgetSummary?.total ?? plan.budgetSummary?.totalEstimatedCost ?? 0,
      excludesUnknownItems: plan.budgetSummary?.excludesUnknownItems,
    },
    tips: plan.tips || [],
  }
}

function normalizeTripDay(day: any, index: number) {
  const activities = day.activities || day.items || day.spots || day.places || day.scenicSpots || []
  const timeline = Array.isArray(day.timeline) ? day.timeline.map((item: any, itemIndex: number) => normalizeTimelineNode(item, itemIndex)) : []
  const routeLegs = day.routeLegs || []
  const estimated = day.estimatedCost || {}
  const rentalDay = String(day.routeSummary || day.route || '').includes('自驾') || routeLegs.some((leg: any) => String(leg.mode || leg.transportMode || '').includes('DRIVING'))
  return {
    day: day.day || day.dayNo || index + 1,
    title: day.title || day.theme || day.dailyTheme || `Day ${index + 1}`,
    city: day.city,
    activities: activities.map((item: any, itemIndex: number) => {
      const routeLeg = routeLegs.find((leg: any) => Number(leg.fromOrder) === Number(item.order || itemIndex + 1))
      return {
        time: item.time || item.startTime || item.arrivalTime || '',
        title: item.title || item.place || item.name || item.spotName || item.poiName || '',
        description: item.description || item.activity || item.summary || item.reason || item.recommendReason || '',
        tags: item.tags || [item.type, item.transport].filter(Boolean),
        cost: Number(item.cost ?? item.ticketCost ?? item.ticketPrice ?? item.estimatedCost ?? 0),
        costText: item.costText || item.ticketCostText,
        suggestedDuration: item.suggestedDuration || item.suggestedDurationText || item.stayDuration || item.duration || item.recommendedStayTime || (item.suggestedDurationMinutes ? `${item.suggestedDurationMinutes} 分钟` : undefined),
        suggestedDurationSource: item.suggestedDurationSource,
        transportSuggestion: cleanTransportSuggestion(item.transportSuggestion || routeLeg?.suggestion, rentalDay || String(routeLeg?.mode || '').includes('DRIVING')),
        reason: item.reason || item.recommendReason || item.recommendationReason || item.tips,
        area: item.area || item.region,
        address: item.address,
        city: item.city,
        lng: Number(item.entranceLng ?? item.lng ?? item.longitude) || undefined,
        lat: Number(item.entranceLat ?? item.lat ?? item.latitude) || undefined,
        openingHours: item.openingHours,
        rating: item.rating == null ? undefined : Number(item.rating),
        averageCost: item.averageCost == null ? undefined : Number(item.averageCost),
        businessArea: item.businessArea,
        imageUrls: item.imageUrls || [],
        type: item.type,
        order: item.order,
      }
    }),
    timeline,
    startAnchor: normalizeAnchor(day.startAnchor),
    endAnchor: normalizeAnchor(day.endAnchor),
    food: day.food || day.foodSuggestions || day.diningSuggestions || day.restaurantSuggestions || [],
    budget: Number(day.budget || estimated.total || 0),
    estimatedCost: {
      tickets: Number(estimated.tickets || 0),
      food: Number(estimated.food || 0),
      transport: Number(estimated.transport || 0),
      total: Number(estimated.total || 0),
      ticketSource: estimated.ticketSource,
      foodSource: estimated.foodSource,
      transportSource: estimated.transportSource,
      excludesUnknownItems: estimated.excludesUnknownItems,
    },
    intensity: day.intensity || day.pace || day.tripIntensity,
    accommodation: day.accommodation || day.accommodationArea || day.hotelArea,
    diningArea: day.diningArea || day.foodArea || day.restaurantArea,
    routeSummary: day.routeSummary || day.route,
    tips: day.tips || day.dayTips || [],
  }
}

function normalizeTimelineNode(item: any, index: number) {
  return {
    time: item.time || item.startTime || '',
    title: item.title || item.name || '',
    subtitle: item.subtitle,
    description: item.description || item.reason || item.subtitle || '',
    tags: item.tags || [item.type].filter(Boolean),
    cost: Number(item.cost ?? item.estimatedCost ?? 0),
    costText: item.costText,
    suggestedDuration: item.suggestedDuration || item.durationText || (item.durationMinutes ? `${item.durationMinutes} 分钟` : undefined),
    transportSuggestion: cleanTransportSuggestion(item.transportSuggestion),
    reason: item.reason || item.description,
    area: item.area,
    address: item.address,
    city: item.city,
    lng: Number(item.lng ?? item.longitude) || undefined,
    lat: Number(item.lat ?? item.latitude) || undefined,
    type: item.type,
    compact: item.compact !== false,
    order: item.order ?? index + 1,
  }
}

function normalizeAnchor(anchor: any) {
  if (!anchor) return undefined
  return {
    type: anchor.type,
    name: anchor.name,
    city: anchor.city,
    area: anchor.area,
    address: anchor.address,
    lng: Number(anchor.lng) || undefined,
    lat: Number(anchor.lat) || undefined,
    coordType: anchor.coordType,
  }
}

function cleanTransportSuggestion(value?: string, rentalDay = false) {
  if (!value) return undefined
  if (rentalDay) {
    return value
      .replace('高德路线暂不可用，前端将重新计算。', '建议自驾衔接，出发前按实时路况和停车条件调整。')
      .replace('坐标不足，路线待前端计算。', '坐标不足，自驾路线待前端地图计算。')
      .replace('建议按当天实际位置灵活选择步行或打车。', '建议自驾衔接，注意停车场与限行规则。')
  }
  return value
    .replace('高德路线暂不可用，前端将重新计算。', '建议打车衔接，出发前按实时路况调整。')
    .replace('坐标不足，路线待前端计算。', '建议按当天实际位置灵活选择步行或打车。')
}

export const tripApi = {
  list(params: { pageNum: number; pageSize: number; keyword?: string }) {
    return request.get('/trips/my', { params }) as Promise<PageResult<Trip>>
  },
  detail(id: number) {
    return request.get(`/trips/${id}`) as Promise<Trip>
  },
  save(value: Omit<Trip, 'id' | 'createTime' | 'status'>) {
    return request.post('/trips', value) as Promise<{ id: number }>
  },
  update(id: number, value: Partial<Trip>) {
    return request.put(`/trips/${id}`, value)
  },
  remove(id: number) {
    return request.delete(`/trips/${id}`)
  },
}

export const noteApi = {
  list(params: { pageNum: number; pageSize: number; keyword?: string; tagId?: number; sort?: string }) {
    return request.get('/notes', { params }) as Promise<PageResult<Note>>
  },
  mine(params: { pageNum: number; pageSize: number; status?: number }) {
    return request.get('/notes/my', { params }) as Promise<PageResult<Note>>
  },
  detail(id: number) {
    return request.get(`/notes/${id}`) as Promise<Note>
  },
  save(value: Partial<Note>, id?: number) {
    return id ? request.put(`/notes/${id}`, value) : request.post('/notes', value)
  },
  remove(id: number) {
    return request.delete(`/notes/${id}`)
  },
  toggleLike(id: number, value: boolean) {
    return value ? request.post(`/notes/${id}/like`) : request.delete(`/notes/${id}/like`)
  },
  toggleFavorite(id: number, value: boolean) {
    return value ? request.post(`/notes/${id}/favorite`) : request.delete(`/notes/${id}/favorite`)
  },
  async getComments(noteId: number, pageNum = 1, pageSize = 50) {
    const result = await request.get(`/notes/${noteId}/comments`, { params: { pageNum, pageSize } }) as PageResult<Comment>
    return result.list
  },
  addComment(noteId: number, content: string) {
    return request.post(`/notes/${noteId}/comments`, { content })
  },
}

export const baseApi = {
  tags() {
    return request.get('/tags')
  },
  destinations() {
    return request.get('/destinations')
  },
}

export interface RentalQuotePreviewRequest { requirement: any }
export interface RentalQuotePreviewResponse { routeMode?: string; rentalCity?: string; citycode?: string; quoteOptions: any[] }
export const rentalApi = {
  previewContext(payload: { requirement: any; arrivalText?: string }) {
    return request.post('/rental/context/preview', payload, { suppressError: true }) as Promise<any>
  },
  previewQuotes(payload: RentalQuotePreviewRequest) {
    return request.post('/rental/quotes/preview', payload, { suppressError: true }) as Promise<RentalQuotePreviewResponse>
  },
  latestOrderedQuotes() {
    return request.get('/rental/quotes/latest-ordered', { suppressError: true }) as Promise<any[]>
  },
  createOrder(payload: any) {
    return request.post('/rental/orders', payload) as Promise<{ id: number }>
  },
  payOrder(id: number, payload?: { success?: boolean }) {
    return request.post(`/rental/orders/${id}/pay`, payload || {}) as Promise<void>
  },
  alipayPagePay(id: number) {
    return request.post(`/rental/orders/${id}/alipay/page-pay`) as Promise<{ orderId: number; orderNo: string; formHtml: string }>
  },
  listMyOrders() {
    return request.get('/rental/orders/my') as Promise<any[]>
  },
  getOrder(id: number) {
    return request.get(`/rental/orders/${id}`) as Promise<any>
  },
  cancelOrder(id: number) {
    return request.post(`/rental/orders/${id}/cancel`) as Promise<void>
  },
}

export const userApi = {
  me() {
    return request.get('/users/me') as Promise<UserInfo>
  },
  update(value: Partial<UserInfo>) {
    return request.put('/users/me', value)
  },
  stats() {
    return request.get('/users/me/stats') as Promise<UserProfileStats>
  },
  sendChangeEmailCode(newEmail: string) {
    return request.post('/users/me/email-code', { newEmail }) as Promise<void>
  },
  updateEmail(payload: { newEmail: string; emailCode: string }) {
    return request.put('/users/me/email', payload) as Promise<void>
  },
}

export interface FileUploadResponse { url: string; objectKey: string; fileName: string; size: number }
export const fileApi = {
  upload(file: File, bizType = 'avatar') {
    const fd = new FormData()
    fd.append('file', file)
    return request.post('/files/upload', fd, { params: { bizType } }) as Promise<FileUploadResponse>
  },
}
