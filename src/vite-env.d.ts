/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string
  readonly VITE_AMAP_SECURITY_CODE?: string
  readonly AMAP_API_KEY?: string
  readonly AMAP_SECURITY_JS_CODE?: string
}

interface Window {
  _AMapSecurityConfig?: {
    securityJsCode?: string
  }
}
