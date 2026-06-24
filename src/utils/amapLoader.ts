import AMapLoader from '@amap/amap-jsapi-loader'

let amapPromise: Promise<any> | null = null

export const loadAMap = () => {
  if (amapPromise) return amapPromise

  const key = import.meta.env.VITE_AMAP_KEY || import.meta.env.AMAP_API_KEY
  const securityJsCode =
    import.meta.env.VITE_AMAP_SECURITY_CODE || import.meta.env.AMAP_SECURITY_JS_CODE
  if (!key) return Promise.reject(new Error('地图暂不可用，请检查高德地图配置'))

  if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode }
  }

  amapPromise = AMapLoader.load({
    key,
    version: '2.0',
    plugins: ['AMap.Scale', 'AMap.ToolBar'],
  })

  return amapPromise
}
