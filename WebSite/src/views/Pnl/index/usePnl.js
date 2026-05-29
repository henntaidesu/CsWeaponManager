import { ref, reactive, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrls } from '@/config/api'

function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthRange(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const last = new Date(year, monthIndex + 1, 0)
  return { start: ymd(first), end: ymd(last) }
}

function curMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 'YYYY-MM' 字符串(零填充等长,字典序即时间序)
function ym(y, m) {
  return `${y}-${String(m).padStart(2, '0')}`
}

export function usePnl() {
  const activeTab = ref('calendar')
  const loading = ref(false)
  const dataUserList = ref([])
  const dataUserFilter = ref(null)

  // ---- 日历 ----
  const calendarRefDate = ref(new Date())
  const calendarRangeStart = ref('')
  const calendarRangeEnd = ref('')
  const rangeMin = ref('') // 'YYYY-MM' 数据库最老月
  const rangeMax = ref('') // 'YYYY-MM' 最新可选月(至少当前月)
  const selectedYear = ref(null) // number
  const selectedMonthNum = ref(null) // 1-12
  // 可选年份(最新在前)
  const yearOptions = computed(() => {
    if (!rangeMin.value || !rangeMax.value) return []
    const minY = parseInt(rangeMin.value.slice(0, 4), 10)
    const maxY = parseInt(rangeMax.value.slice(0, 4), 10)
    const arr = []
    for (let y = maxY; y >= minY; y -= 1) arr.push(y)
    return arr
  })
  // 选定年份下的可选月份(最新在前),并受数据库最老/最新月约束
  const monthOptionsOfYear = computed(() => {
    const y = selectedYear.value
    if (!y || !rangeMin.value || !rangeMax.value) return []
    const minY = parseInt(rangeMin.value.slice(0, 4), 10)
    const minM = parseInt(rangeMin.value.slice(5, 7), 10)
    const maxY = parseInt(rangeMax.value.slice(0, 4), 10)
    const maxM = parseInt(rangeMax.value.slice(5, 7), 10)
    const start = y === minY ? minM : 1
    const end = y === maxY ? maxM : 12
    const arr = []
    for (let m = end; m >= start; m -= 1) arr.push(m)
    return arr
  })
  const calendarMap = reactive({}) // 'YYYY-MM-DD' -> { profit, pair_count, paired_quantity, excluded_count }
  const overallStats = reactive({
    total_profit: 0,
    paired_quantity: 0,
    pair_count: 0,
    win_profit: 0,
    loss_profit: 0,
    excluded_count: 0,
  })

  // ---- 当日明细抽屉 ----
  const detailDrawerVisible = ref(false)
  const detailDate = ref('')
  const detailRows = ref([])

  // ---- 孤立卖出 ----
  const orphans = reactive({
    list: [],
    total: 0,
    page: 1,
    page_size: 20,
    search: '',
    start_date: '',
    end_date: '',
  })

  // ---- 已剔除（直接从 calendar 累积或单独拉） ----
  const excludedList = ref([])

  // ---- 手动配对对话框 ----
  const pairDialogVisible = ref(false)
  const pairTargetSell = ref(null)
  const pairCandidates = ref([])
  const pairRelaxHash = ref(false)
  const pairRelaxUser = ref(false)

  async function loadDataUserList() {
    try {
      const r = await axios.get(apiUrls.pnlDataUserList())
      if (r.data && r.data.success) {
        dataUserList.value = r.data.data || []
      }
    } catch (e) {
      console.error('加载账号列表失败', e)
    }
  }

  async function loadCalendar(year, monthIndex) {
    const { start, end } = monthRange(year, monthIndex)
    calendarRangeStart.value = start
    calendarRangeEnd.value = end
    loading.value = true
    try {
      const payload = { start_date: start, end_date: end }
      if (dataUserFilter.value) payload.data_user = dataUserFilter.value
      const [calRes, statsRes] = await Promise.all([
        axios.post(apiUrls.pnlCalendar(), payload),
        axios.post(apiUrls.pnlOverallStats(), payload),
      ])
      Object.keys(calendarMap).forEach((k) => delete calendarMap[k])
      if (calRes.data && calRes.data.success) {
        for (const row of calRes.data.data || []) {
          calendarMap[row.date] = row
        }
      }
      if (statsRes.data && statsRes.data.success) {
        Object.assign(overallStats, statsRes.data.data || {})
      }
    } catch (e) {
      console.error('加载日历数据失败', e)
      ElMessage.error('加载日历数据失败')
    } finally {
      loading.value = false
    }
  }

  function onCalendarDateChange(date) {
    const d = new Date(date)
    loadCalendar(d.getFullYear(), d.getMonth())
  }

  // 指定年月是否落在可选范围内
  function isSelectable(y, m) {
    const s = ym(y, m)
    return !!rangeMin.value && !!rangeMax.value && s >= rangeMin.value && s <= rangeMax.value
  }

  // 根据 selectedYear/selectedMonthNum 同步日历并加载
  function applySelectedMonth() {
    const y = selectedYear.value
    const m = selectedMonthNum.value
    if (!y || !m) return
    calendarRefDate.value = new Date(y, m - 1, 1)
    loadCalendar(y, m - 1)
  }

  // 加载可选月份范围:最老不超过数据库最老月,最新到当前月
  async function loadMonthRange() {
    const cur = curMonthStr()
    let minMonth = cur
    let maxMonth = cur
    try {
      const payload = {}
      if (dataUserFilter.value) payload.data_user = dataUserFilter.value
      const r = await axios.post(apiUrls.pnlMonthRange(), payload)
      if (r.data && r.data.success && r.data.data) {
        minMonth = r.data.data.min_month || cur
        maxMonth = r.data.data.max_month || cur
      }
    } catch (e) {
      console.error('加载月份范围失败', e)
    }
    // 始终允许查看到当前月;最老仍以数据库最老月为下限
    if (maxMonth < cur) maxMonth = cur
    if (minMonth > cur) minMonth = cur
    rangeMin.value = minMonth
    rangeMax.value = maxMonth

    // 选中项:保留当前有效选择,否则默认当前月,再不行取最新可选月
    const now = new Date()
    if (selectedYear.value && selectedMonthNum.value
        && isSelectable(selectedYear.value, selectedMonthNum.value)) {
      // 保持不变
    } else if (isSelectable(now.getFullYear(), now.getMonth() + 1)) {
      selectedYear.value = now.getFullYear()
      selectedMonthNum.value = now.getMonth() + 1
    } else {
      selectedYear.value = parseInt(maxMonth.slice(0, 4), 10)
      selectedMonthNum.value = parseInt(maxMonth.slice(5, 7), 10)
    }
  }

  function onYearChange(y) {
    selectedYear.value = y
    // 月份校正到该年可选范围(优先保留当前月份数字,否则取该年最新可选月)
    const months = monthOptionsOfYear.value
    if (!months.includes(selectedMonthNum.value)) {
      selectedMonthNum.value = months[0]
    }
    applySelectedMonth()
  }

  function onMonthNumChange(m) {
    selectedMonthNum.value = m
    applySelectedMonth()
  }

  // 上一月 / 下一月(受可选范围约束)
  function prevMonth() {
    let y = selectedYear.value
    let m = selectedMonthNum.value - 1
    if (m < 1) { m = 12; y -= 1 }
    if (!isSelectable(y, m)) return
    selectedYear.value = y
    selectedMonthNum.value = m
    applySelectedMonth()
  }

  function nextMonth() {
    let y = selectedYear.value
    let m = selectedMonthNum.value + 1
    if (m > 12) { m = 1; y += 1 }
    if (!isSelectable(y, m)) return
    selectedYear.value = y
    selectedMonthNum.value = m
    applySelectedMonth()
  }

  // 是否已到范围边界(用于禁用按钮)
  const canPrevMonth = computed(() => {
    if (!selectedYear.value || !selectedMonthNum.value) return false
    let y = selectedYear.value
    let m = selectedMonthNum.value - 1
    if (m < 1) { m = 12; y -= 1 }
    return isSelectable(y, m)
  })
  const canNextMonth = computed(() => {
    if (!selectedYear.value || !selectedMonthNum.value) return false
    let y = selectedYear.value
    let m = selectedMonthNum.value + 1
    if (m > 12) { m = 1; y += 1 }
    return isSelectable(y, m)
  })

  async function openDayDetail(dateStr) {
    detailDate.value = dateStr
    detailDrawerVisible.value = true
    detailRows.value = []
    try {
      const payload = { date: dateStr }
      if (dataUserFilter.value) payload.data_user = dataUserFilter.value
      const r = await axios.post(apiUrls.pnlDailyDetail(), payload)
      if (r.data && r.data.success) {
        detailRows.value = r.data.data || []
      }
    } catch (e) {
      console.error('加载当日明细失败', e)
      ElMessage.error('加载当日明细失败')
    }
  }

  async function loadOrphans() {
    loading.value = true
    try {
      const payload = {
        page: orphans.page,
        page_size: orphans.page_size,
        search: orphans.search || undefined,
        start_date: orphans.start_date || undefined,
        end_date: orphans.end_date || undefined,
        data_user: dataUserFilter.value || undefined,
      }
      const r = await axios.post(apiUrls.pnlOrphanSells(), payload)
      if (r.data && r.data.success) {
        orphans.list = r.data.data || []
        orphans.total = r.data.total || 0
      }
    } catch (e) {
      console.error('加载孤立卖出失败', e)
      ElMessage.error('加载孤立卖出失败')
    } finally {
      loading.value = false
    }
  }

  async function runAutoPairing() {
    try {
      await ElMessageBox.confirm(
        '将根据 steam_hash_name + 账号(data_user) 自动配对所有已完成的买卖记录(增量,FIFO,跨平台)。继续?',
        '执行自动配对',
        { type: 'info' }
      )
    } catch {
      return
    }
    loading.value = true
    try {
      const payload = {}
      if (dataUserFilter.value) payload.data_user = dataUserFilter.value
      const r = await axios.post(apiUrls.pnlRunAutoPairing(), payload)
      if (r.data && r.data.success) {
        const d = r.data.data || {}
        ElMessage.success(`新增配对 ${d.pairs_created || 0} 对,匹配数量 ${d.paired_quantity || 0} 件`)
        await loadMonthRange()
        applySelectedMonth()
      } else {
        ElMessage.error(r.data?.message || '自动配对失败')
      }
    } catch (e) {
      console.error('自动配对失败', e)
      ElMessage.error('自动配对失败')
    } finally {
      loading.value = false
    }
  }

  async function unpair(pairing_id) {
    try {
      await ElMessageBox.confirm('确认解绑?该买入与出售记录将被释放,可被重新配对。', '解绑配对', { type: 'warning' })
    } catch { return }
    try {
      const r = await axios.post(apiUrls.pnlUnpair(), { pairing_id })
      if (r.data && r.data.success) {
        ElMessage.success('已解绑')
        if (detailDrawerVisible.value && detailDate.value) {
          await openDayDetail(detailDate.value)
        }
        const ref = calendarRefDate.value || new Date()
        await loadCalendar(ref.getFullYear(), ref.getMonth())
      } else {
        ElMessage.error(r.data?.message || '解绑失败')
      }
    } catch (e) {
      ElMessage.error('解绑失败')
    }
  }

  async function setExcluded(pairing_id, excluded) {
    let reason = null
    if (excluded) {
      try {
        const res = await ElMessageBox.prompt('剔除原因(可选,例如:导Steam余额)', '剔除配对', {
          confirmButtonText: '确认剔除',
          cancelButtonText: '取消',
          inputValue: '导Steam余额',
        })
        reason = res.value
      } catch { return }
    }
    try {
      const r = await axios.post(apiUrls.pnlSetExcluded(), { pairing_id, excluded, reason })
      if (r.data && r.data.success) {
        ElMessage.success(excluded ? '已剔除' : '已恢复')
        if (detailDrawerVisible.value && detailDate.value) {
          await openDayDetail(detailDate.value)
        }
        const ref = calendarRefDate.value || new Date()
        await loadCalendar(ref.getFullYear(), ref.getMonth())
      } else {
        ElMessage.error(r.data?.message || '操作失败')
      }
    } catch (e) {
      ElMessage.error('操作失败')
    }
  }

  async function openPairDialog(sell) {
    pairTargetSell.value = sell
    pairCandidates.value = []
    pairRelaxHash.value = false
    pairRelaxUser.value = false
    pairDialogVisible.value = true
    await loadCandidates()
  }

  async function loadCandidates() {
    if (!pairTargetSell.value) return
    try {
      const r = await axios.post(apiUrls.pnlCandidateBuys(), {
        sell_id: pairTargetSell.value.sell_id,
        sell_id_sub: pairTargetSell.value.sell_id_sub,
        relax_hash: pairRelaxHash.value,
        relax_user: pairRelaxUser.value,
      })
      if (r.data && r.data.success) {
        pairCandidates.value = r.data.data || []
      } else {
        pairCandidates.value = []
      }
    } catch (e) {
      console.error('加载候选买入失败', e)
      pairCandidates.value = []
    }
  }

  async function confirmManualPair(buy) {
    if (!pairTargetSell.value || !buy) return
    try {
      const r = await axios.post(apiUrls.pnlManualPair(), {
        buy_id: buy.buy_id,
        buy_from: buy.buy_from,
        buy_id_sub: buy.buy_id_sub,
        sell_id: pairTargetSell.value.sell_id,
        sell_id_sub: pairTargetSell.value.sell_id_sub,
        quantity: 1,
      })
      if (r.data && r.data.success) {
        ElMessage.success('配对成功')
        pairDialogVisible.value = false
        await loadOrphans()
        const ref = calendarRefDate.value || new Date()
        await loadCalendar(ref.getFullYear(), ref.getMonth())
      } else {
        ElMessage.error(r.data?.message || '配对失败')
      }
    } catch (e) {
      ElMessage.error('配对失败')
    }
  }

  function cellColor(cell) {
    const info = calendarMap[cell.day] || calendarMap[cell.text]
    if (!info) return ''
    if (info.profit > 0) return 'pnl-cell-positive'
    if (info.profit < 0) return 'pnl-cell-negative'
    return 'pnl-cell-zero'
  }

  function dayInfo(day) {
    return calendarMap[day] || null
  }

  onMounted(async () => {
    await loadDataUserList()
    await loadMonthRange()
    applySelectedMonth()
  })

  function onTabChange(name) {
    activeTab.value = name
    if (name === 'orphans') {
      orphans.page = 1
      loadOrphans()
    }
  }

  async function onDataUserChange() {
    // 账号变化可能改变可选月份范围
    await loadMonthRange()
    applySelectedMonth()
    if (activeTab.value === 'orphans') {
      orphans.page = 1
      loadOrphans()
    }
  }

  const profitClass = (val) => {
    const n = Number(val) || 0
    if (n > 0) return 'profit-positive'
    if (n < 0) return 'profit-negative'
    return 'profit-zero'
  }

  // ---- 商品图片 / 印花 / 挂件渲染(与 Buy 列表一致) ----
  const sourceLabel = (val) => {
    const map = {
      yyyp: '悠悠有品', buff: 'BUFF', csfloat: 'CsFloat',
      SMK: 'steam市场', ING: '游戏内购',
      c5: 'C5GAME', c5game: 'C5GAME', C5game: 'C5GAME', C5: 'C5GAME', C5GAME: 'C5GAME',
    }
    return map[val] || val
  }

  const getWeaponImage = (steamHashName) => {
    if (!steamHashName) return null
    const imageName = steamHashName
      .replace(/\s*\|\s*/g, '___')
      .replace(/\s/g, '_')
      .replace(/\*/g, '_')
      + '.png'
    return apiUrls.weaponImage(imageName)
  }

  const getItemTitle = (item) => {
    const weaponName = (item.weapon_name || '').trim()
    const itemName = (item.item_name || '').trim()
    const parts = []
    if (weaponName && itemName) {
      if (weaponName === itemName) parts.push(itemName)
      else { parts.push(weaponName); parts.push(itemName) }
    } else if (weaponName) parts.push(weaponName)
    else if (itemName) parts.push(itemName)
    let title = parts.join(' | ')
    if (item.float_range) title += `（${item.float_range}）`
    return title
  }

  const hasExtras = (item) => !!(item.sticker || item.pendant || item.rename)

  const parseStickers = (stickerData) => {
    if (!stickerData) return []
    try {
      const parsed = typeof stickerData === 'string' ? JSON.parse(stickerData) : stickerData
      if (!Array.isArray(parsed)) return []
      return parsed.map((sticker) => {
        const name = sticker.name || '未知贴纸'
        const hashName = sticker.hashName || sticker.steam_hash_name || sticker.steamHashName
        let imageUrl = null
        if (hashName) {
          const fullHashName = hashName.startsWith('Sticker | ') ? hashName : `Sticker | ${hashName}`
          const imageName = fullHashName
            .replace(/\s*\|\s*/g, '___')
            .replace(/\s/g, '_')
            .replace(/\*/g, '_')
            .replace(/™/g, '?')
          imageUrl = apiUrls.weaponImage(`${imageName}.png`)
        }
        return { name, image: imageUrl }
      })
    } catch (e) {
      console.error('解析印花数据失败:', e)
      return []
    }
  }

  const parsePendant = (pendantData) => {
    if (!pendantData) return null
    try {
      const parsed = typeof pendantData === 'string' ? JSON.parse(pendantData) : pendantData
      const pendantObj = Array.isArray(parsed) ? parsed[0] : parsed
      if (!pendantObj || typeof pendantObj !== 'object') return null
      const hashName = pendantObj.hashName || pendantObj.steam_hash_name || pendantObj.steamHashName
      let imageUrl = null
      if (hashName) {
        const fullHashName = hashName.startsWith('Charm | ') ? hashName : `Charm | ${hashName}`
        const imageName = fullHashName
          .replace(/\s*\|\s*/g, '___')
          .replace(/\s/g, '_')
          .replace(/\*/g, '_')
          .replace(/™/g, '?')
          + '.png'
        imageUrl = apiUrls.weaponImage(imageName)
      }
      return { name: pendantObj.name || '挂件', image: imageUrl }
    } catch (e) {
      console.error('解析挂件数据失败:', e)
      return null
    }
  }

  return {
    // 通用
    activeTab, loading, dataUserList, dataUserFilter,
    onTabChange, onDataUserChange, profitClass,
    sourceLabel, getWeaponImage, getItemTitle, hasExtras, parseStickers, parsePendant,
    // 日历
    calendarRefDate, calendarMap, overallStats,
    onCalendarDateChange, openDayDetail,
    cellColor, dayInfo,
    runAutoPairing,
    selectedYear, selectedMonthNum, yearOptions, monthOptionsOfYear,
    onYearChange, onMonthNumChange,
    prevMonth, nextMonth, canPrevMonth, canNextMonth,
    // 当日明细
    detailDrawerVisible, detailDate, detailRows,
    unpair, setExcluded,
    // 孤立卖出
    orphans, loadOrphans, openPairDialog,
    // 手动配对
    pairDialogVisible, pairTargetSell, pairCandidates,
    pairRelaxHash, pairRelaxUser,
    loadCandidates, confirmManualPair,
  }
}
