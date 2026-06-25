import AMapLoader from '@amap/amap-jsapi-loader'

let amapPromise: Promise<any> | null = null

export const loadAMap = () => {
  if (amapPromise) return amapPromise

  const key = import.meta.env.VITE_AMAP_KEY
  const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE

  if (!key) return Promise.reject(new Error('地图暂不可用，请配置 VITE_AMAP_KEY（高德 Web端 JS API Key）'))

  if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode }
  }

  amapPromise = AMapLoader.load({
    key,
    version: '2.0',
    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Driving', 'AMap.PlaceSearch'],
  })

  return amapPromise
}
