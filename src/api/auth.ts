import requestClient from '../utils/request'
import type { UserInfo } from '../types'

const request: any = requestClient

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
