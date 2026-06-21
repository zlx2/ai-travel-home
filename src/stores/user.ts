import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from '../types'
import { authApi } from '../api'

export const useUserStore=defineStore('user',()=>{
  const token=ref(localStorage.getItem('ai-travel-token')||'')
  const user=ref<UserInfo|null>(JSON.parse(localStorage.getItem('ai-travel-user')||'null'))
  const isLogin=computed(()=>Boolean(token.value&&user.value))
  const isAdmin=computed(()=>user.value?.role===2)
  async function login(account:string,password:string){const data=await authApi.login({account,password});token.value=data.token;user.value=data.user;localStorage.setItem('ai-travel-token',data.token);localStorage.setItem('ai-travel-user',JSON.stringify(data.user));return data.user}
  async function logout(){await authApi.logout();token.value='';user.value=null;localStorage.removeItem('ai-travel-token');localStorage.removeItem('ai-travel-user')}
  function updateUser(value:UserInfo){user.value=value;localStorage.setItem('ai-travel-user',JSON.stringify(value))}
  return{token,user,isLogin,isAdmin,login,logout,updateUser}
})
