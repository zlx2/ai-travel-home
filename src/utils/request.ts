import axios from 'axios'
import { ElMessage } from 'element-plus'

const request=axios.create({baseURL:import.meta.env.VITE_API_BASE_URL||'/api',timeout:30000})
request.interceptors.request.use(config=>{const token=localStorage.getItem('ai-travel-token');if(token)config.headers.Authorization=`Bearer ${token}`;return config})
request.interceptors.response.use(response=>{
  const body=response.data
  if(body?.code===200)return body.data
  ElMessage.error(body?.message||'请求失败')
  return Promise.reject(new Error(body?.message||'请求失败'))
},error=>{if(error.response?.status===401){localStorage.removeItem('ai-travel-token');localStorage.removeItem('ai-travel-user');location.href='/login'}ElMessage.error(error.response?.data?.message||'网络异常，请稍后重试');return Promise.reject(error)})
export default request
