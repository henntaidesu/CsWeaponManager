<template>
  <div class="settings-container" :class="{ 'main-sidebar-collapsed': isMainSidebarCollapsed }">
    <!-- 二级左侧栏 -->
    <aside class="secondary-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-content">
        <div class="sidebar-header">
          <!-- 保留标题空位，用于间距 -->
        </div>
        
        <ul class="category-list">
          <li 
            :class="{ active: $route.name === 'DataSource' }"
            @click="navigateTo('/settings/data-source')"
          >
            <el-icon :size="18">
              <DataBoard />
            </el-icon>
            <span>数据来源</span>
          </li>
          <li 
            :class="{ active: $route.name === 'AutoManager' }"
            @click="navigateTo('/settings/auto-manager')"
          >
            <el-icon :size="18">
              <Timer />
            </el-icon>
            <span>自动化管理</span>
          </li>
          <li 
            :class="{ active: $route.name === 'SteamInventoryHistory' }"
            @click="navigateTo('/settings/steam-inventory-history')"
          >
            <el-icon :size="18">
              <Box />
            </el-icon>
            <span>Steam交易历史</span>
          </li>
          <li
            :class="{ active: $route.name === 'DevTools' }"
            @click="navigateTo('/settings/dev-tools')"
          >
            <el-icon :size="18">
              <SetUp />
            </el-icon>
            <span>开荒工具</span>
          </li>
          <li
            :class="{ active: $route.name === 'AESDecrypt' }"
            @click="navigateTo('/settings/aes-decrypt')"
          >
            <el-icon :size="18">
              <Lock />
            </el-icon>
            <span>AES解密工具</span>
          </li>
          <li 
            :class="{ active: $route.name === 'SystemSettings' }"
            @click="navigateTo('/settings/system-settings')"
          >
            <el-icon :size="18">
              <Setting />
            </el-icon>
            <span>登录设置</span>
          </li>
          <li 
            :class="{ active: $route.name === 'DatabaseManager' }"
            @click="navigateTo('/settings/database-manager')"
          >
            <img src="/icons/database.png" class="menu-icon" alt="database" />
            <span>数据库管理</span>
          </li>
          <li 
            :class="{ active: $route.name === 'MessageBox' }"
            @click="navigateTo('/settings/yyyp-message-box')"
          >
            <el-icon :size="18">
              <ChatLineRound />
            </el-icon>
            <span>悠悠有品消息</span>
          </li>
          <li
            :class="{ active: $route.name === 'BuffMessageBox' }"
            @click="navigateTo('/settings/buff-message-box')"
          >
            <el-icon :size="18">
              <ChatLineRound />
            </el-icon>
            <span>BUFF消息</span>
          </li>
          <li
            :class="{ active: $route.name === 'IgxeMessageBox' }"
            @click="navigateTo('/settings/igxe-message-box')"
          >
            <el-icon :size="18">
              <ChatLineRound />
            </el-icon>
            <span>IGXE消息</span>
          </li>
          <li
            :class="{ active: $route.name === 'SysMessage' }"
            @click="navigateTo('/settings/sys-message')"
          >
            <el-icon :size="18">
              <BellFilled />
            </el-icon>
            <span>系统消息</span>
          </li>
          <li
            :class="{ active: $route.name === 'VersionUpdate' }"
            @click="navigateTo('/settings/version-update')"
          >
            <el-icon :size="18">
              <Refresh />
            </el-icon>
            <span>系统更新</span>
          </li>
        </ul>
      </div>
    </aside>

    <!-- 折叠/展开按钮 -->
    <div class="toggle-button" :class="{ collapsed: sidebarCollapsed }" @click="toggleSidebar">
      <el-icon :size="20">
        <ArrowLeft v-if="!sidebarCollapsed" />
        <ArrowRight v-else />
      </el-icon>
    </div>

    <!-- 主内容区域 -->
    <div class="main-wrapper" :class="{ expanded: sidebarCollapsed }" @click="handleContentClick">
      <router-view />
    </div>
  </div>
</template>


<script setup>
import { SetUp, Setting, Box, Timer, DataBoard, ArrowLeft, ArrowRight, ChatLineRound, Refresh, BellFilled, Lock } from '@element-plus/icons-vue'
import { useSettings } from './useSettings.js'

const {
  sidebarCollapsed,
  isMainSidebarCollapsed,
  navigateTo,
  toggleSidebar,
  handleContentClick
} = useSettings()
</script>

<style scoped src="./styles.css"></style>
