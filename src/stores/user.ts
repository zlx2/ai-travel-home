import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from '../types'
import { clearAuthStorage, TOKEN_KEY, USER_KEY } from '../utils/auth'

export const useUserStore=defineStore('user',()=>{
  const token=ref(localStorage.getItem(TOKEN_KEY)||'')
  const user=ref<UserInfo|null>(JSON.parse(localStorage.getItem(USER_KEY)||'null'))
  const isLogin=computed(()=>Boolean(token.value&&user.value))
  const isAdmin=computed(()=>user.value?.role===2)
  async function login(account:string,password:string){const {authApi}=await import('../api/auth');const data=await authApi.login({account,password});token.value=data.token;user.value=data.user;localStorage.setItem(TOKEN_KEY,data.token);localStorage.setItem(USER_KEY,JSON.stringify(data.user));return data.user}
  async function logout(){try{const {authApi}=await import('../api/auth');await authApi.logout()}catch{/* 服务端会话失效时也要清理本地登录态。 */}token.value='';user.value=null;clearAuthStorage()}
  function updateUser(value:UserInfo){user.value=value;localStorage.setItem(USER_KEY,JSON.stringify(value))}
  return{token,user,isLogin,isAdmin,login,logout,updateUser}
})
