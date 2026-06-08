<template>
  <div class="on-sale-container" :class="{ 'main-sidebar-collapsed': isMainSidebarCollapsed }">
    <!-- 二级左侧栏 -->
    <aside class="secondary-sidebar" :class="{ collapsed: sidebarCollapsed, 'no-transition': !isMounted }">
      <div class="sidebar-content">
        <div class="sidebar-header">
          <!-- 保留标题空位，用于间距 -->
        </div>
        
        <ul class="category-list">
          <li 
            :class="{ active: $route.name === 'OnSaleYYYP' }"
            @click="navigateTo('/on-sale/yyyp')"
          >
            <el-icon :size="18">
              <ShoppingCart />
            </el-icon>
            <span>悠悠有品</span>
          </li>
          <li 
            :class="{ active: $route.name === 'OnSaleBuff' }"
            @click="navigateTo('/on-sale/buff')"
          >
            <el-icon :size="18">
              <ShoppingBag />
            </el-icon>
            <span>BUFF</span>
          </li>
          <!-- IGXE 暂时隐藏
          <li 
            :class="{ active: $route.name === 'OnSaleIGXE' }"
            @click="navigateTo('/on-sale/igxe')"
          >
            <el-icon :size="18">
              <Shop />
            </el-icon>
            <span>IGXE</span>
          </li>
          -->
        </ul>
      </div>
    </aside>

    <!-- 折叠/展开按钮 -->
    <div class="toggle-button" :class="{ collapsed: sidebarCollapsed, 'no-transition': !isMounted }" @click="toggleSidebar">
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
import { useOnSaleContainer } from './useOnSaleContainer.js'
import { ShoppingCart, ShoppingBag, Shop, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const {
  sidebarCollapsed,
  isMainSidebarCollapsed,
  isMounted,
  navigateTo,
  toggleSidebar,
  handleContentClick
} = useOnSaleContainer()
</script>

<style scoped src="./styles.css"></style>
