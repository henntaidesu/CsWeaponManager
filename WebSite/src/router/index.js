import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/Layout/index/index.vue'
import Home from '@/views/Home/index.vue'
import ItemSearch from '@/views/ItemSearch/index/index.vue'
import Buy from '@/views/Buy/index.vue'
import Sell from '@/views/Sell/index/index.vue'
import Pnl from '@/views/Pnl/index/index.vue'
import OnSaleContainer from '@/views/on_sale/OnSaleContainer/index.vue'
import Rental from '@/views/Rental/index/index.vue'
import Lent from '@/views/Lent/index/index.vue'
import Inventory from '@/views/Inventory/index/index.vue'
import StockComponents from '@/views/StockComponents/index/index.vue'
import Settings from '@/views/settings/index/index.vue'
import DataWebsite from '@/views/data_website/DataWebsite/index.vue'
import DataSpider from '@/views/data_spider/DataSpider/index.vue'
import Login from '@/views/Login/index/index.vue'
import axios from 'axios'
import { apiUrls } from '@/config/api'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: '/home',
        name: 'Home',
        component: Home,
        meta: { title: '主页' }
      },
      {
        path: '/item-search',
        name: 'ItemSearch',
        component: ItemSearch,
        meta: { title: '饰品搜索' }
      },
      {
        path: '/buy',
        name: 'Buy',
        component: Buy,
        meta: { title: '已购入' }
      },
      {
        path: '/sell',
        name: 'Sell',
        component: Sell,
        meta: { title: '已出售' }
      },
      {
        path: '/pnl',
        name: 'Pnl',
        component: Pnl,
        meta: { title: '盈亏统计' }
      },
      {
        path: '/on-sale',
        name: 'OnSale',
        component: OnSaleContainer,
        meta: { title: '正在出售' },
        redirect: '/on-sale/yyyp',
        children: [
          {
            path: 'yyyp',
            redirect: () => {
              const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('yyyp_selected_trade_type') : null
              const valid = saved && /^(sale|lease|sublease|presale|transfer|purchase_request|offer|favorite|rented_out|instant)$/.test(saved)
              return '/on-sale/yyyp/' + (valid ? saved : 'sale')
            }
          },
          {
            path: 'yyyp/:subType',
            name: 'OnSaleYYYP',
            component: () => import('@/views/on_sale/OnSaleYYYP/index.vue'),
            meta: { title: '悠悠有品' }
          },
          {
            path: 'buff',
            name: 'OnSaleBuff',
            component: () => import('@/views/on_sale/OnSaleBuff/index.vue'),
            meta: { title: 'BUFF' }
          },
          {
            path: 'igxe',
            name: 'OnSaleIGXE',
            component: () => import('@/views/on_sale/OnSaleIGXE/index.vue'),
            meta: { title: 'IGXE' }
          }
        ]
      },
      {
        path: '/rental',
        name: 'Rental',
        component: Rental,
        meta: { title: '借贷列表' }
      },
      {
        path: '/rent',
        name: 'Lent',
        component: Lent,
        meta: { title: '出租记录' }
      },
      {
        path: '/inventory',
        name: 'Inventory',
        component: Inventory,
        meta: { title: 'Steam库存' }
      },
      {
        path: '/stock-components',
        name: 'StockComponents',
        component: StockComponents,
        meta: { title: '库存组件' }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: Settings,
        meta: { title: '系统设置' },
        redirect: '/settings/data-source',
        children: [
          {
            path: 'data-source',
            name: 'DataSource',
            component: () => import('@/views/settings/DataSource/index.vue'),
            meta: { title: '数据来源' }
          },
          {
            path: 'auto-manager',
            name: 'AutoManager',
            component: () => import('@/views/settings/Automate_management/index.vue'),
            meta: { title: '自动化管理' }
          },
          {
            path: 'steam-inventory-history',
            name: 'SteamInventoryHistory',
            component: () => import('@/views/settings/SteamInventoryHistory/index.vue'),
            meta: { title: 'Steam交易历史' }
          },
          {
            path: 'system-settings',
            name: 'SystemSettings',
            component: () => import('@/views/settings/SystemSettings/index.vue'),
            meta: { title: '登录设置' }
          },
          {
            path: 'database-manager',
            name: 'DatabaseManager',
            component: () => import('@/views/settings/DatabaseManager/index.vue'),
            meta: { title: '数据库管理' }
          },
          {
            path: 'yyyp-message-box',
            name: 'MessageBox',
            component: () => import('@/views/settings/yyyp_messagebox/index.vue'),
            meta: { title: '悠悠有品消息' }
          },
          {
            path: 'buff-message-box',
            name: 'BuffMessageBox',
            component: () => import('@/views/settings/buff_messagebox/index.vue'),
            meta: { title: 'BUFF消息' }
          },
          {
            path: 'version-update',
            name: 'VersionUpdate',
            component: () => import('@/views/settings/VersionUpdate/index.vue'),
            meta: { title: '系统更新' }
          },
          {
            path: 'dev-tools',
            name: 'DevTools',
            component: () => import('@/views/settings/DevTool/index.vue'),
            meta: { title: '开荒工具' }
          },
          {
            path: 'sys-message',
            name: 'SysMessage',
            component: () => import('@/views/settings/SysMessage/index.vue'),
            meta: { title: '系统消息' }
          },
          {
            path: 'aes-decrypt',
            name: 'AESDecrypt',
            component: () => import('@/views/settings/AESDecrypt/index.vue'),
            meta: { title: 'AES解密工具' }
          }
        ]
      },
      // 已屏蔽：/data-website 第三方数据页面（仅前端隐藏，代码保留）
      // {
      //   path: '/data-website',
      //   name: 'DataWebsite',
      //   component: DataWebsite,
      //   meta: { title: '第三方数据' },
      //   redirect: '/data-website/market-overview',
      //   children: [
      //     {
      //       path: 'market-overview',
      //       name: 'MarketOverview',
      //       component: () => import('@/views/data_website/MarketOverview/index.vue'),
      //       meta: { title: '市场大盘' }
      //     },
      //     {
      //       path: 'item-search',
      //       name: 'DataWebsiteItemSearch',
      //       component: () => import('@/views/data_website/ItemSearch/index.vue'),
      //       meta: { title: '饰品搜索' }
      //     }
      //   ]
      // },
      {
        path: '/data-spider',
        name: 'DataSpider',
        component: DataSpider,
        meta: { title: '数据挖掘' },
        redirect: '/data-spider/search-rename',
        children: [
          {
            path: 'search-rename',
            name: 'DataSpiderSearchRename',
            component: () => import('@/views/data_spider/SearchWeaponRename/index.vue'),
            meta: { title: '爬取改名' }
          },
          {
            path: 'search-pendant',
            name: 'DataSpiderSearchPendant',
            component: () => import('@/views/data_spider/SearchPendant/index.vue'),
            meta: { title: '爬取挂件' }
          },
          {
            path: 'inventory-mining',
            name: 'DataSpiderInventoryMining',
            component: () => import('@/views/data_spider/InventoryMining/index.vue'),
            meta: { title: '库存挖掘' }
          }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 检查登录状态
async function checkLoginRequired() {
  try {
    const response = await axios.get(apiUrls.loginSettings())
    if (response.data.success) {
      return response.data.data.enableLogin || false
    }
    return false
  } catch (error) {
    console.error('检查登录状态失败:', error)
    return false
  }
}

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  // 如果是登录页面，直接通过
  if (to.path === '/login') {
    next()
    return
  }
  
  // 检查是否需要登录验证
  const loginRequired = await checkLoginRequired()
  
  if (!loginRequired) {
    // 不需要登录，直接通过
    next()
    return
  }
  
  // 需要登录，检查是否已登录
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const loginTime = localStorage.getItem('loginTime')
  
  // 检查登录是否过期（24小时）
  if (isLoggedIn && loginTime) {
    const now = new Date().getTime()
    const elapsed = now - parseInt(loginTime)
    const maxAge = 24 * 60 * 60 * 1000 // 24小时
    
    if (elapsed > maxAge) {
      // 登录已过期
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('username')
      localStorage.removeItem('loginTime')
      next('/login')
      return
    }
  }
  
  if (isLoggedIn) {
    // 已登录，允许访问
    next()
  } else {
    // 未登录，跳转到登录页
    next('/login')
  }
})

export default router