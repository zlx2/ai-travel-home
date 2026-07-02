const HOME_TIMEOUT_MS = 3000
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const getJson = async (path: string, timeout: number) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal })
    if (!response.ok) throw new Error('request failed')
    const body = await response.json()
    if (body?.code === 200) return body.data
    throw new Error(body?.message || 'request failed')
  } finally {
    window.clearTimeout(timer)
  }
}

export const homeApi = {
  async getHome() {
    return getJson('/home', HOME_TIMEOUT_MS)
  },
}
