import axios from 'axios'
import { ElMessage } from 'element-plus'
import { clearAuthStorage, TOKEN_KEY } from './auth'

const request=axios.create({baseURL:import.meta.env.VITE_API_BASE_URL||'/api',timeout:120000})
const showRequestError=(message:string)=>{
  ElMessage.closeAll()
  ElMessage.error({message,duration:2500,showClose:true})
}
const shouldSuppressError=(config:any)=>Boolean(config?.suppressError)
request.interceptors.request.use(config=>{const token=localStorage.getItem(TOKEN_KEY);if(token)config.headers.Authorization=`Bearer ${token}`;return config})
request.interceptors.response.use(response=>{
  const body=response.data
  if(body?.code===200)return body.data
  if([401,10007,10008].includes(body?.code)){
    clearAuthStorage()
    if(!location.pathname.startsWith('/login'))location.href=`/login?redirect=${encodeURIComponent(location.pathname+location.search)}`
  }
  if(!shouldSuppressError(response.config))showRequestError(body?.message||'请求失败')
  return Promise.reject(new Error(body?.message||'请求失败'))
},error=>{
  if(error.response?.status===401){clearAuthStorage();location.href='/login'}
  const message=error.code==='ECONNABORTED'||String(error.message||'').includes('timeout')?'生成时间较长，请稍后重试或减少天数/景点数量':error.response?.data?.message||'网络异常，请稍后重试'
  if(!shouldSuppressError(error.config))showRequestError(message)
  return Promise.reject(new Error(message))
})
export default request
