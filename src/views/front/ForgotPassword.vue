<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, Lock } from '@element-plus/icons-vue'
import { authApi } from '../../api'
import { cssImage, homeCosImage } from '../../utils/homeImages'

const router = useRouter()

const step = ref<'email' | 'reset'>('email')
const sending = ref(false)
const submitting = ref(false)
const countdown = ref(0)
let timer: number | undefined

const form = reactive({
  email: '',
  emailCode: '',
  newPassword: '',
  confirmPassword: '',
})

const sceneImage = cssImage(homeCosImage('hero-chongqing-v2.png'))

const startCountdown = () => {
  countdown.value = 60
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}

const sendCode = async () => {
  if (!form.email.trim()) return ElMessage.warning('请输入邮箱地址')
  sending.value = true
  try {
    await authApi.sendResetCode(form.email.trim())
    ElMessage.success('验证码已发送到您的邮箱')
    step.value = 'reset'
    startCountdown()
  } catch (e: any) {
    const msg = e?.response?.data?.message || ''
    if (msg.includes('未注册')) {
      ElMessage.error('该邮箱未注册，请检查后重试')
    } else if (msg.includes('过于频繁')) {
      ElMessage.warning('发送过于频繁，请稍后再试')
    } else {
      ElMessage.error('发送失败，请稍后重试')
    }
  } finally {
    sending.value = false
  }
}

const resendCode = async () => {
  if (countdown.value > 0) return
  await sendCode()
}

const submitReset = async () => {
  if (!form.emailCode.trim()) return ElMessage.warning('请输入验证码')
  if (!form.newPassword) return ElMessage.warning('请输入新密码')
  if (form.newPassword.length < 6) return ElMessage.warning('密码至少 6 位')
  if (form.newPassword !== form.confirmPassword) return ElMessage.warning('两次密码输入不一致')

  submitting.value = true
  try {
    await authApi.resetPassword({
      email: form.email.trim(),
      emailCode: form.emailCode.trim(),
      newPassword: form.newPassword,
    })
    ElMessage.success('密码重置成功，请重新登录')
    router.push('/login')
  } catch (e: any) {
    const msg = e?.response?.data?.message || ''
    if (msg.includes('验证码错误')) {
      ElMessage.warning('验证码错误，请检查后重新输入')
    } else if (msg.includes('已过期')) {
      ElMessage.warning('验证码已过期，请重新获取')
    } else {
      ElMessage.error('重置失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- Left: Scene -->
    <div class="auth-scene" :style="{ '--auth-scene-image': sceneImage }">
      <router-link class="logo light" to="/">
        <span class="logo-symbol">✈</span>
        <span>PlanGo</span>
      </router-link>
      <div>
        <span class="eyebrow">RESET PASSWORD</span>
        <h1>找回密码</h1>
        <p>请输入注册时使用的邮箱，<br>我们将发送验证码帮助您重置密码。</p>
      </div>
      <div class="scene-quote">“最好的旅行，是出发时满怀期待，归来时满载回忆。”</div>
    </div>

    <!-- Right: Form -->
    <div class="auth-panel">
      <div class="auth-card">
        <template v-if="step === 'email'">
          <h2>输入邮箱</h2>
          <p>请输入您注册时使用的邮箱地址</p>
          <el-form label-position="top" size="large" @submit.prevent="sendCode">
            <el-form-item label="邮箱地址">
              <el-input
                v-model="form.email"
                :prefix-icon="Message"
                placeholder="请输入邮箱地址"
                type="email"
                autocomplete="email"
              />
            </el-form-item>
            <el-button class="gradient-button auth-submit" type="primary" :loading="sending" @click="sendCode">
              发送验证码
            </el-button>
          </el-form>
          <p class="auth-switch">
            <router-link to="/login">返回登录</router-link>
          </p>
        </template>

        <template v-else>
          <h2>重置密码</h2>
          <p>验证码已发送至 {{ form.email }}</p>
          <el-form label-position="top" size="large" @submit.prevent="submitReset">
            <el-form-item label="验证码">
              <el-input
                v-model="form.emailCode"
                :prefix-icon="Message"
                placeholder="请输入 6 位验证码"
                maxlength="6"
                autocomplete="one-time-code"
              />
              <div class="code-hint">
                <el-button text type="primary" :disabled="countdown > 0" @click="resendCode">
                  {{ countdown > 0 ? `${countdown}s 后重发` : '重新发送' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="新密码">
              <el-input
                v-model="form.newPassword"
                :prefix-icon="Lock"
                type="password"
                show-password
                placeholder="至少 6 位"
                autocomplete="new-password"
              />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input
                v-model="form.confirmPassword"
                :prefix-icon="Lock"
                type="password"
                show-password
                placeholder="请再次输入新密码"
                autocomplete="new-password"
              />
            </el-form-item>
            <el-button class="gradient-button auth-submit" type="primary" :loading="submitting" @click="submitReset">
              重置密码
            </el-button>
          </el-form>
          <p class="auth-switch">
            <router-link to="/login">返回登录</router-link>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page{min-height:100vh;display:grid;grid-template-columns:1.08fr .92fr;background:#fff}
.auth-scene{padding:45px 9%;display:flex;flex-direction:column;justify-content:space-between;color:#fff;background:linear-gradient(135deg,rgba(21,55,98,.92),rgba(14,133,143,.72)),var(--auth-scene-image) center/cover}
.light{color:#fff}.auth-scene h1{font-size:48px;line-height:1.25;margin:14px 0}
.auth-scene p{color:#dbe8ef;font-size:16px;line-height:1.8;max-width:500px}
.scene-quote{font-size:13px;color:#d8e7ed;border-left:3px solid #6ee7d8;padding-left:14px}
.auth-panel{display:grid;place-items:center;padding:50px}
.auth-card{width:430px}
.auth-card h2{font-size:30px;margin:0 0 8px;color:#172033}
.auth-card>p{color:#8992a0;margin-bottom:30px}
.auth-submit{width:100%;height:48px;margin-top:4px}
.auth-switch{text-align:center!important;font-size:13px;margin-top:20px}
.auth-switch a{color:var(--blue);text-decoration:none}
.code-hint{display:flex;justify-content:flex-end;margin-top:6px}
.auth-card :deep(.el-form-item){margin-bottom:22px}
</style>
