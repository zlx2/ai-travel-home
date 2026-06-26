const DEFAULT_HOME_IMAGE_BASE_URL =
  'https://ai-education-1428653062.cos.ap-shanghai.myqcloud.com/plango/home'

const HOME_IMAGE_BASE_URL = (import.meta.env.VITE_HOME_IMAGE_BASE_URL || DEFAULT_HOME_IMAGE_BASE_URL)
  .replace(/\/+$/, '')

const destinationFiles: Record<string, string> = {
  重庆: 'chongqing.jpg',
  成都: 'chengdu.jpg',
  西安: 'xian.jpg',
  杭州: 'hangzhou.jpg',
  厦门: 'xiamen.jpg',
  云南: 'yunnan.jpg',
}

const destinationAliases: Array<[string, string]> = [
  ['重庆', '重庆'],
  ['成都', '成都'],
  ['西安', '西安'],
  ['杭州', '杭州'],
  ['厦门', '厦门'],
  ['云南', '云南'],
  ['丽江', '云南'],
  ['大理', '云南'],
]

const unique = (items: Array<string | undefined>) => {
  const seen = new Set<string>()
  return items.filter((item): item is string => {
    if (!item || seen.has(item)) return false
    seen.add(item)
    return true
  })
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value)

export const homeCosImage = (fileName: string, highQuality = false) =>
  HOME_IMAGE_BASE_URL ? `${HOME_IMAGE_BASE_URL}/${highQuality ? 'hq/' : ''}${fileName}` : undefined

export const cssImage = (url?: string) => (url ? `url("${url}")` : 'none')

export const homeImageCandidates = (fileName: string, preferredUrl?: string, highQuality = false) =>
  unique([preferredUrl, homeCosImage(fileName, highQuality)])

export const homeImage = (fileName: string, highQuality = false) =>
  homeImageCandidates(fileName, undefined, highQuality)[0]

export const destinationImageFile = (destination?: string) => {
  const name = destination?.trim()
  if (!name) return destinationFiles.重庆
  const exact = destinationFiles[name]
  if (exact) return exact
  const matched = destinationAliases.find(([alias]) => name.includes(alias))
  return matched ? destinationFiles[matched[1]] : destinationFiles.重庆
}

export const destinationImageCandidates = (destination?: string, preferredUrl?: string) => {
  const normalizedPreferred =
    preferredUrl && (isHttpUrl(preferredUrl) || preferredUrl.startsWith('/')) ? preferredUrl : undefined
  return homeImageCandidates(destinationImageFile(destination), normalizedPreferred, true)
}

export const setNextHomeImage = (event: Event, candidates: string[]) => {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  const currentIndex = Number(target.dataset.homeImageIndex || 0)
  const nextIndex = currentIndex + 1
  const next = candidates[nextIndex]
  target.dataset.homeImageIndex = String(nextIndex)
  if (next) target.src = next
}
