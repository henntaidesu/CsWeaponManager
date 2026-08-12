import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'

export function useLayout() {
  const router = useRouter()
  const route = useRoute()

  const isCollapsed = ref(false) // 默认展开状态
  const isLoggedIn = ref(false)
  const username = ref('')
  const menuItems = ref([
    {
      path: '/home',
      title: '主页',
      icon: '/icons/new_home.png'
    },
    {
      path: '/item-search',
      title: '饰品搜索',
      icon: '/icons/new_search.png'
    },
    {
      path: '/buy',
      title: '购入列表',
      icon: '/icons/buy_off.png'
    },
    {
      path: '/sell',
      title: '出售列表',
      icon: '/icons/sell_off.png'
    },
    {
      path: '/rental',
      title: '借贷列表',
      icon: '/icons/rental.png'
    },
    {
      path: '/rent',
      title: '出租列表',
      icon: '/icons/rent.png'
    },
    {
      path: '/pnl',
      title: '盈亏统计',
      icon: '/icons/_日历.png'
    },
    {
      path: '/on-sale',
      title: '正在出售',
      icon: '/icons/OnSale.png'
    },
    {
      path: '/inventory',
      title: 'Steam库存',
      icon: '/icons/inventory.png'
    },
    // {
    //   path: '/sublet',
    //   title: '正在转租',
    //   icon: '/icons/Sublet.png'
    // },
    // {
    //   path: '/rental-records',
    //   title: '出租记录',
    //   icon: '/icons/Rental_records.png'
    // },
    {
      path: '/stock-components',
      title: '库存组件',
      icon: '/icons/stock-components.png'
    },
    // 已屏蔽：/data-website 入口（仅前端隐藏，代码保留）
    // {
    //   path: '/data-website',
    //   title: '第三方数据',
    //   icon: '/icons/data-website.png'
    // },
    {
      path: '/data-spider',
      title: '数据挖掘',
      icon: '/icons/data-spider.png'
    },
    {
      path: '/settings',
      title: '其他功能',
      icon: '/icons/settings.png'
    }
    // {
    //   path: '/setting',
    //   title: '设置',
    //   icon: '/icons/setting.png'
    // }
  ])

  let unwatchDevice = null

  onMounted(() => {
    const deviceType = applyDeviceClass()

    unwatchDevice = watchDeviceType((newDeviceType) => {
    })

    // 检查登录状态
    isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
    username.value = localStorage.getItem('username') || '用户'
  })

  onUnmounted(() => {
    if (unwatchDevice) {
      unwatchDevice()
    }
  })

  // 监听路由变化，切换页面时自动收缩侧边栏
  watch(route, () => {
    isCollapsed.value = true
  })

  const handleMenuClick = (path) => {
    router.push(path)
  }

  const handleSidebarClick = (event) => {
    // 点击侧边栏空白区域切换展开/收缩状态
    isCollapsed.value = !isCollapsed.value
  }

  const handleContainerClick = () => {
    // 点击主内容区域时，只在展开状态下才收缩侧边栏
    if (!isCollapsed.value) {
      isCollapsed.value = true
    }
  }

  const handleLogout = () => {
    ElMessageBox.confirm(
      '确定要退出登录吗？',
      '确认退出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      // 清除登录状态
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('username')
      localStorage.removeItem('loginTime')

      ElMessage.success('已退出登录')

      // 跳转到登录页
      router.push('/login')
    }).catch(() => {
      // 取消退出
    })
  }

  // 判断菜单项是否激活
  const isMenuItemActive = (menuPath) => {
    const currentPath = route.path

    // 精确匹配：当前路径等于菜单路径
    if (currentPath === menuPath) {
      return true
    }

    // 子路径匹配：当前路径以菜单路径开头，且下一个字符是 '/'
    // 这样可以避免 /rental 匹配到 /rent 的问题
    if (currentPath.startsWith(menuPath + '/')) {
      return true
    }

    return false
  }

  return {
    isCollapsed,
    isLoggedIn,
    username,
    menuItems,
    handleMenuClick,
    handleSidebarClick,
    handleContainerClick,
    handleLogout,
    isMenuItemActive
  }
}
