<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Calendar, Camera, Collection, Document, EditPen, Lock, Star, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { userApi, fileApi, tripApi, noteApi } from '../../api'
import { useUserStore } from '../../stores/user'
import { cssImage, homeCosImage } from '../../utils/homeImages'
const store=useUserStore(),router=useRouter(),loading=ref(true),saving=ref(false),uploading=ref(false),fileInputRef=ref<HTMLInputElement|null>(null),form=reactive({nickname:'',avatarUrl:'',username:'',email:'',createTime:''})
const stats=reactive({trips:0,notes:0,likes:0,favorites:0})
const profileBannerImage=cssImage(homeCosImage('profile-lake-banner.png'))
// 修改邮箱相关状态
const emailDialogVisible=ref(false),emailChanging=ref(false),emailCodeSending=ref(false),emailCodeSeconds=ref(0);let emailCodeTimer:number|null=null
const emailForm=reactive({newEmail:'',emailCode:''})
onMounted(async()=>{try{const data=await userApi.me();Object.assign(form,data);const [tripData,noteData]=await Promise.all([tripApi.list({pageNum:1,pageSize:1}),noteApi.mine({pageNum:1,pageSize:1000})]);stats.trips=tripData.total;stats.notes=noteData.total;stats.likes=noteData.list.reduce((sum,n)=>sum+(n.likeCount||0),0);stats.favorites=noteData.list.reduce((sum,n)=>sum+(n.favoriteCount||0),0)}finally{loading.value=false}})
onUnmounted(()=>{if(emailCodeTimer!==null){clearInterval(emailCodeTimer);emailCodeTimer=null}})
const save=async()=>{saving.value=true;try{await userApi.update({nickname:form.nickname,avatarUrl:form.avatarUrl});const data=await userApi.me();Object.assign(form,data);store.updateUser(data);ElMessage.success('个人资料已更新')}catch{/* 请求层统一展示后端错误。 */}finally{saving.value=false}}
const triggerUpload=()=>fileInputRef.value?.click()
const onFileSelected=async()=>{const input=fileInputRef.value;if(!input?.files?.length)return;const file=input.files[0];const allowed=['image/jpeg','image/png','image/webp'];if(!allowed.includes(file.type)){ElMessage.warning('仅支持 JPG、PNG、WebP 格式');input.value='';return}if(file.size>5*1024*1024){ElMessage.warning('文件大小不能超过 5MB');input.value='';return}uploading.value=true;try{const res=await fileApi.upload(file,'avatar');form.avatarUrl=res.url;ElMessage.success('头像上传成功，请点击保存资料生效')}catch{/* 请求层统一展示后端错误。 */}finally{uploading.value=false;input.value=''}}
// 修改邮箱
const openEmailDialog=()=>{emailForm.newEmail='';emailForm.emailCode='';if(emailCodeTimer!==null){clearInterval(emailCodeTimer);emailCodeTimer=null}emailCodeSeconds.value=0;emailDialogVisible.value=true}
const closeEmailDialog=()=>{if(emailCodeTimer!==null){clearInterval(emailCodeTimer);emailCodeTimer=null}emailCodeSeconds.value=0;emailForm.newEmail='';emailForm.emailCode='';emailDialogVisible.value=false}
const sendEmailCode=async()=>{const re=/^\S+@\S+\.\S+$/;if(!emailForm.newEmail.trim())return ElMessage.warning('请输入新邮箱');if(!re.test(emailForm.newEmail.trim()))return ElMessage.warning('邮箱格式不正确');if(emailForm.newEmail.trim().toLowerCase()===form.email?.trim().toLowerCase())return ElMessage.warning('新邮箱不能与当前邮箱相同');emailCodeSending.value=true;try{await userApi.sendChangeEmailCode(emailForm.newEmail.trim());ElMessage.success('验证码已发送，请查收新邮箱');emailCodeSeconds.value=60;emailCodeTimer=window.setInterval(()=>{emailCodeSeconds.value--;if(!emailCodeSeconds.value&&emailCodeTimer!==null){clearInterval(emailCodeTimer);emailCodeTimer=null}},1000)}catch{/* 请求层统一展示后端错误。 */}finally{emailCodeSending.value=false}}
const confirmChangeEmail=async()=>{const re=/^\S+@\S+\.\S+$/;if(!emailForm.newEmail.trim()||!re.test(emailForm.newEmail.trim()))return ElMessage.warning('请输入正确的新邮箱');if(!emailForm.emailCode.trim()||emailForm.emailCode.trim().length!==6)return ElMessage.warning('请输入 6 位验证码');emailChanging.value=true;try{await userApi.updateEmail({newEmail:emailForm.newEmail.trim(),emailCode:emailForm.emailCode.trim()});ElMessage.success('邮箱修改成功');closeEmailDialog();const data=await userApi.me();Object.assign(form,data);store.updateUser(data)}catch{/* 请求层统一展示后端错误。 */}finally{emailChanging.value=false}}
</script>
<template>
  <div class="page profile-page">
    <div class="container profile-container" v-loading="loading">
      <section class="profile-hero" :style="{ '--profile-banner-image': profileBannerImage }">
        <div class="profile-cover"></div>
        <div class="profile-summary">
          <div class="hero-avatar-wrap">
            <el-avatar :size="104" :src="form.avatarUrl" class="hero-avatar"><User /></el-avatar>
            <button class="avatar-camera" type="button" :disabled="uploading || saving" title="更换头像" aria-label="更换头像" @click="triggerUpload"><el-icon><Camera /></el-icon></button>
            <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp" style="display:none" @change="onFileSelected" />
          </div>
          <div class="profile-title">
            <div class="title-line">
              <h1>{{ form.nickname || '旅行者' }}</h1>
              <el-tag type="success" effect="light">普通用户</el-tag>
            </div>
            <p>@{{ form.username || '未设置' }} · 从 {{ form.createTime?.slice(0, 10) || '今天' }} 开始探索</p>
          </div>
          <div class="profile-stats" aria-label="个人数据概览">
            <div><el-icon><Calendar /></el-icon><b>{{ stats.trips }}</b><span>行程</span></div>
            <div><el-icon><Document /></el-icon><b>{{ stats.notes }}</b><span>游记</span></div>
            <div><el-icon><Star /></el-icon><b>{{ stats.likes }}</b><span>获赞</span></div>
            <div><el-icon><Collection /></el-icon><b>{{ stats.favorites }}</b><span>收藏</span></div>
          </div>
        </div>
      </section>

      <div class="profile-grid">
        <section class="profile-form panel">
          <div class="form-head">
            <span class="form-head-icon"><el-icon><User /></el-icon></span>
            <div>
              <h2>个人资料</h2>
              <p>修改你的公开昵称和头像等信息</p>
            </div>
          </div>

          <el-form class="profile-edit-form">
            <div class="setting-row">
              <label>用户名</label>
              <el-input v-model="form.username" disabled>
                <template #suffix><el-icon><Lock /></el-icon></template>
              </el-input>
            </div>

            <div class="setting-row">
              <label>邮箱</label>
              <div class="email-row">
                <span class="email-text">{{ form.email || '未设置' }}</span>
                <el-button link type="primary" @click="openEmailDialog">修改邮箱</el-button>
              </div>
            </div>

            <div class="setting-row">
              <label>昵称</label>
              <el-input v-model="form.nickname" maxlength="20" placeholder="请输入昵称">
                <template #suffix>{{ form.nickname.length }} / 20</template>
              </el-input>
            </div>

            <div class="form-actions">
              <el-button type="primary" :loading="saving" @click="save">保存资料</el-button>
            </div>
          </el-form>
        </section>

        <aside class="profile-aside">
          <section class="account-panel panel">
            <h3><el-icon><Lock /></el-icon>账户状态</h3>
            <div class="account-row">
              <span>账号安全</span>
              <b>{{ form.email && form.avatarUrl ? '安全等级：高' : '待完善' }}</b>
            </div>
            <div class="account-row">
              <span>注册时间</span>
              <b>{{ form.createTime?.slice(0, 10) || '-' }}</b>
            </div>
          </section>

          <article class="shortcut trip-shortcut panel" @click="router.push('/trips')">
            <span class="shortcut-icon"><el-icon><Calendar /></el-icon></span>
            <div>
              <h3>我的行程</h3>
              <p>查看和管理已保存的旅行计划</p>
            </div>
            <button type="button" aria-label="进入我的行程"><el-icon><ArrowRight /></el-icon></button>
          </article>

          <article class="shortcut note-shortcut panel" @click="router.push('/notes/create')">
            <span class="shortcut-icon green"><el-icon><EditPen /></el-icon></span>
            <div>
              <h3>发布游记</h3>
              <p>记录旅途故事，分享给更多人</p>
            </div>
            <button type="button" aria-label="发布游记"><el-icon><ArrowRight /></el-icon></button>
          </article>
        </aside>
      </div>
    </div>
  </div>

  <el-dialog v-model="emailDialogVisible" title="修改邮箱" width="420px" :close-on-click-modal="false" @close="closeEmailDialog">
    <el-form label-position="top">
      <el-form-item label="新邮箱">
        <el-input v-model="emailForm.newEmail" placeholder="请输入新邮箱地址" maxlength="100" />
      </el-form-item>
      <el-form-item label="验证码">
        <div class="code-row">
          <el-input v-model="emailForm.emailCode" placeholder="6 位验证码" maxlength="6" />
          <el-button :loading="emailCodeSending" :disabled="emailCodeSeconds > 0" @click="sendEmailCode">{{ emailCodeSeconds ? `${emailCodeSeconds}s 后重试` : '发送验证码' }}</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeEmailDialog">取消</el-button>
      <el-button type="primary" :loading="emailChanging" @click="confirmChangeEmail">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.profile-page {
  min-height: calc(100vh - 72px);
  padding: 26px 0 18px;
  background: linear-gradient(180deg, #f5faff 0%, #f8fbff 66%, #ffffff 100%);
}

.profile-container {
  width: min(1320px, calc(100% - 56px));
}

.profile-hero,
.panel {
  border: 1px solid #dfe7f2;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(44, 72, 105, .055);
}

.profile-hero {
  overflow: hidden;
}

.profile-cover {
  height: 124px;
  background:
    linear-gradient(90deg, rgba(47, 128, 237, .12), rgba(255, 255, 255, 0) 45%),
    var(--profile-banner-image) center 48% / cover;
}

.profile-summary {
  min-height: 98px;
  display: grid;
  grid-template-columns: 124px minmax(310px, 1fr) 560px;
  gap: 18px;
  align-items: center;
  padding: 0 36px 26px 94px;
  margin-top: -48px;
}

.hero-avatar-wrap {
  position: relative;
  width: 116px;
  height: 116px;
}

.hero-avatar {
  border: 5px solid #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, .13);
}

.avatar-camera {
  position: absolute;
  right: 2px;
  bottom: 13px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #2f80ed;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(47, 128, 237, .26);
}

.profile-title {
  min-width: 0;
  padding-top: 50px;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.title-line h1 {
  margin: 0;
  color: #111b31;
  font-size: 30px;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-line .el-tag {
  height: 26px;
  padding: 0 11px;
  border-color: #cdeccd;
  border-radius: 6px;
  background: #f2fbef;
  color: #43a047;
  font-size: 13px;
  font-weight: 700;
}

.profile-title p {
  margin: 9px 0 0;
  color: #6d7890;
  font-size: 15px;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  padding-top: 48px;
}

.profile-stats div {
  min-width: 0;
  display: grid;
  grid-template-columns: 24px auto;
  grid-template-areas:
    "icon number"
    "icon label";
  column-gap: 10px;
  justify-content: center;
  align-items: center;
  padding: 0 19px;
}

.profile-stats div:not(:last-child) {
  border-right: 1px solid #e5ebf3;
}

.profile-stats .el-icon {
  grid-area: icon;
  color: #2f80ed;
  font-size: 24px;
}

.profile-stats div:nth-child(3) .el-icon {
  color: #ff6b75;
}

.profile-stats b {
  grid-area: number;
  color: #172033;
  font-size: 20px;
  line-height: 1.05;
}

.profile-stats span {
  grid-area: label;
  color: #6d7890;
  font-size: 12px;
  line-height: 1.2;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 18px;
  margin-top: 18px;
  align-items: start;
}

.profile-form {
  min-height: 420px;
  padding: 26px 34px 24px;
}

.form-head {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}

.form-head-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #edf5ff;
  color: #2f80ed;
  font-size: 20px;
}

.form-head h2 {
  margin: 0;
  color: #172033;
  font-size: 21px;
}

.form-head p {
  margin: 5px 0 0;
  color: #7a8492;
  font-size: 13px;
}

.profile-edit-form {
  display: grid;
}

.setting-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 520px);
  gap: 10px 18px;
  align-items: center;
  min-height: 62px;
  padding: 8px 0;
  border-bottom: 1px solid #e8edf3;
}

.setting-row label {
  color: #4a5668;
  font-size: 15px;
  font-weight: 700;
}

.setting-row :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 5px;
  box-shadow: 0 0 0 1px #d9e1eb inset;
}

.setting-row :deep(.el-input.is-disabled .el-input__wrapper) {
  background: #f4f7fb;
}

.setting-row :deep(.el-input__suffix) {
  color: #9aa6b6;
}

.email-row {
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.email-text {
  min-width: 0;
  color: #273246;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 22px;
}

.form-actions .el-button {
  width: 112px;
  height: 40px;
  border-radius: 5px;
  background: #2f80ed;
  border-color: #2f80ed;
}

.profile-aside {
  display: grid;
  gap: 18px;
}

.account-panel {
  min-height: 140px;
  padding: 20px 22px 18px;
}

.account-panel h3 {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 11px;
  padding-bottom: 13px;
  border-bottom: 1px solid #e8edf3;
  color: #172033;
  font-size: 17px;
}

.account-panel h3 .el-icon {
  color: #55667c;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 40px;
  color: #7a8492;
  font-size: 14px;
}

.account-row + .account-row {
  border-top: 1px solid #eef2f6;
}

.account-row b {
  color: #5f6f85;
  font-weight: 700;
}

.account-row:first-of-type b {
  color: #00a57c;
}

.shortcut {
  position: relative;
  min-height: 106px;
  display: flex;
  align-items: center;
  gap: 20px;
  overflow: hidden;
  padding: 22px 22px;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}

.shortcut:before,
.shortcut:after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.shortcut:before {
  right: 0;
  bottom: 0;
  width: 156px;
  height: 70px;
  opacity: .42;
  clip-path: polygon(0 100%, 28% 45%, 43% 72%, 62% 24%, 100% 100%);
}

.shortcut:after {
  right: 52px;
  bottom: 34px;
  width: 14px;
  height: 28px;
  border: 3px solid currentColor;
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  opacity: .25;
}

.trip-shortcut {
  border-color: #bdd8ff;
  background: linear-gradient(110deg, #ffffff 0%, #f8fbff 62%, #eef6ff 100%);
  color: #2f80ed;
}

.trip-shortcut:before {
  background: #b7d7ff;
}

.note-shortcut {
  border-color: #bfeadf;
  background: linear-gradient(110deg, #ffffff 0%, #f8fffc 62%, #eafaf4 100%);
  color: #00a57c;
}

.note-shortcut:before {
  background: #9ce5d1;
}

.shortcut:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 38px rgba(47, 128, 237, .11);
}

.shortcut-icon {
  position: relative;
  z-index: 1;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 14px;
  background: #2f80ed;
  color: #fff;
  font-size: 29px;
  box-shadow: 0 12px 22px rgba(47, 128, 237, .22);
}

.shortcut-icon.green {
  background: #00b894;
  color: #fff;
  box-shadow: 0 12px 22px rgba(0, 184, 148, .2);
}

.shortcut div {
  position: relative;
  z-index: 1;
  min-width: 0;
  flex: 1;
}

.shortcut h3,
.shortcut p {
  margin: 0;
}

.shortcut h3 {
  color: #172033;
  font-size: 21px;
  line-height: 1.2;
}

.shortcut p {
  margin-top: 8px;
  color: #7a8492;
  font-size: 13px;
}

.shortcut button {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid #dce8fb;
  border-radius: 50%;
  background: #fff;
  color: #2f80ed;
  cursor: pointer;
}

.note-shortcut button {
  color: #00a57c;
  border-color: #cfeee6;
}

.code-row {
  display: flex;
  width: 100%;
  gap: 10px;
}

.code-row .el-button {
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .profile-summary {
    grid-template-columns: 118px minmax(0, 1fr);
    padding-left: 44px;
  }

  .profile-stats {
    grid-column: 1 / -1;
    padding-top: 0;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-aside {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .account-panel,
  .shortcut {
    min-height: 146px;
  }
}

@media (max-width: 860px) {
  .profile-container {
    width: calc(100% - 28px);
  }

  .profile-cover {
    height: 112px;
  }

  .profile-summary {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0 18px 20px;
    margin-top: -36px;
  }

  .profile-title {
    padding-top: 0;
  }

  .title-line {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .title-line h1 {
    font-size: 28px;
    white-space: normal;
  }

  .profile-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 0;
  }

  .profile-stats div:nth-child(2) {
    border-right: 0;
  }

  .profile-form {
    padding: 22px 18px;
  }

  .setting-row {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 14px 0;
  }

  .profile-aside {
    grid-template-columns: 1fr;
  }

  .account-panel,
  .shortcut {
    min-height: auto;
  }

  .email-row,
  .code-row {
    align-items: stretch;
    flex-direction: column;
  }

  .email-row .el-button,
  .code-row .el-button {
    width: 100%;
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>
