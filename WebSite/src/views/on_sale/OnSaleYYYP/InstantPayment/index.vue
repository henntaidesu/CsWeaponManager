<template>
  <div class="card-container">
    <!-- 顶部筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="filterGuardStatus"
        placeholder="守护单状态"
        class="type-select"
        clearable
        @change="loadData"
      >
        <el-option label="守护中" :value="1" />
        <el-option label="已完成" :value="2" />
      </el-select>
      <el-select
        v-model="filterFundStatus"
        placeholder="资金状态"
        class="type-select"
        @change="loadData"
      >
        <el-option label="可提取" :value="1" />
        <el-option label="已提取" :value="5" />
        <el-option label="待支付" :value="6" />
        <el-option label="已解冻" :value="8" />
        <el-option label="已退款" :value="9" />
        <el-option label="无法提取" :value="11" />
        <el-option label="核验中" :value="12" />
        <el-option label="部分提取" :value="51" />
      </el-select>
    </div>

    <!-- 底部浮动多选操作栏（选中后弹出） -->
    <transition name="slide-up">
      <div v-if="selectedItems.length > 0" class="multi-select-actions">
        <div class="selected-count">
          已选择 <b>{{ selectedItems.length }}</b> 件
          <span style="color: var(--accent-green); margin-left: 0.5rem;">¥{{ selectedAmount }}</span>
          <span v-if="selectedItems.length >= 10" style="color: var(--accent-red-light); margin-left: 0.5rem;">（已达上限）</span>
        </div>
        <div class="action-buttons">
          <el-button @click="handleSelectAll(true)" :disabled="selectableItems.length <= selectedItems.length || selectedItems.length >= 10">
            前10全选
          </el-button>
          <el-button type="danger" plain @click="handleClearSelection">取消选择</el-button>
          <el-button type="primary" :loading="extracting" @click="handleBatchExtract">
            {{ extracting ? '提取中...' : '提取资金' }}
          </el-button>
        </div>
      </div>
    </transition>

    <!-- 卡片列表 -->
    <div v-loading="loading" class="card-grid">
      <div
        v-for="item in instantPaymentItems"
        :key="item.order_no"
        class="inventory-card"
        :class="{
          'selected': isSelected(item),
          'multi-select-mode': item.fund_status === 1,
          'card-disabled': item.fund_status !== 1,
        }"
        @click="toggleSelect(item)"
      >
        <!-- 选中勾 - 右上角 -->
        <div v-if="item.fund_status === 1" class="check-mark" :class="{ 'is-checked': isSelected(item) }">
          <el-icon v-if="isSelected(item)"><Check /></el-icon>
        </div>

        <div class="card-image">
          <img
            v-if="item.commodity_icon_url"
            :src="item.commodity_icon_url"
            :alt="item.commodity_name"
            class="weapon-image"
            @error="(e) => e.target.style.display = 'none'"
          />
          <div v-else class="image-placeholder">
            <span>无图片</span>
          </div>
          <!-- 状态标签 - 左上角 -->
          <div class="status-overlay" :class="{ 'status-guarding': item.guard_status === 1 }">
            {{ item.guard_status_text || '未知状态' }}
          </div>
          <!-- 贴纸覆盖层 - 左下角 -->
          <div v-if="item.sticker_list && item.sticker_list.length > 0" class="sticker-overlay">
            <div
              v-for="(sticker, index) in item.sticker_list"
              :key="index"
              class="sticker-item-overlay"
              :title="sticker.name || '未知贴纸'"
            >
              <img
                v-if="sticker.imgUrl"
                :src="sticker.imgUrl"
                :alt="sticker.name"
                class="sticker-img-overlay"
                @error="(e) => e.target.style.display = 'none'"
              />
              <div v-else class="sticker-placeholder-overlay">?</div>
            </div>
          </div>
        </div>

        <div class="card-content">
          <div class="card-title" :title="item.commodity_name">
            {{ item.commodity_name }}
          </div>
          <div class="card-info">
            <div class="float-bar-container" v-if="item.abrade">
              <div class="float-bar">
                <div class="float-segment fn" title="崭新出厂 (0.00 - 0.07)"></div>
                <div class="float-segment mw" title="略有磨损 (0.07 - 0.15)"></div>
                <div class="float-segment ft" title="久经沙场 (0.15 - 0.38)"></div>
                <div class="float-segment ww" title="破损不堪 (0.38 - 0.45)"></div>
                <div class="float-segment bs" title="战痕累累 (0.45 - 1.00)"></div>
                <div
                  class="float-pointer"
                  :style="{ left: `${parseFloat(item.abrade) * 100}%` }"
                  :title="`磨损值: ${item.abrade}`"
                ></div>
              </div>
            </div>
            <div class="float-value" v-if="item.abrade">{{ item.abrade }}</div>
          </div>
          <div class="card-prices">
            <div class="price-row">
              <div class="price-group">
                <span class="price-label">可提取:</span>
                <span class="price-value sale-price">¥{{ item.remaining_retrieve_amount }}</span>
              </div>
              <div class="price-group" v-if="item.create_time">
                <span class="price-label">创建:</span>
                <span class="price-value" style="font-size: 0.65rem;">{{ item.create_time }}</span>
              </div>
            </div>
            <div class="price-row">
              <div class="price-group" v-if="item.tradable_balance">
                <span class="price-label">可交易:</span>
                <span class="price-value">¥{{ item.tradable_balance }}</span>
              </div>
              <div class="price-group" v-if="item.unfreeze_amount">
                <span class="price-label">解冻:</span>
                <span class="price-value" style="color: var(--accent-orange);">¥{{ item.unfreeze_amount }}</span>
              </div>
            </div>
          </div>
          <div class="card-footer" v-if="item.tip_content">
            <el-tag type="warning" size="small" class="tip-tag">
              <span class="tag-icon">ℹ️</span>{{ formatTipContent(item.tip_content) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多指示器 -->
    <div class="load-more-bar">
      <el-button
        v-if="hasMore && !loadingMore"
        type="primary"
        plain
        size="small"
        @click="loadMore"
      >
        加载更多
      </el-button>
      <span v-if="loadingMore" class="loading-more-text">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </span>
      <span v-if="!hasMore && instantPaymentItems.length > 0" class="no-more-text">
        已加载全部，共 {{ totalCount }} 条
      </span>
    </div>

    <!-- 底部统计 -->
    <div class="table-footer">
      <span>已显示 {{ instantPaymentItems.length }} / {{ totalCount }} 条</span>
      <span v-if="statistics.totalAmount > 0" style="margin-left: 2rem;">
        总可提取金额: <span style="color: var(--accent-green); font-weight: bold;">¥{{ statistics.totalAmount }}</span>
      </span>
      <span v-if="statistics.tradableBalance > 0" style="margin-left: 2rem;">
        总可交易余额: <span style="color: var(--accent-blue); font-weight: bold;">¥{{ statistics.tradableBalance }}</span>
      </span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Loading } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'

const MAX_SELECT = 10
const PAGE_SIZE = 20

export default {
  name: 'InstantPayment',
  components: { Check, Loading },
  props: {
    steamId: {
      type: String,
      required: true
    }
  },
  emits: ['update:count'],
  setup(props, { emit }) {
    const loading = ref(false)
    const loadingMore = ref(false)
    const extracting = ref(false)
    const instantPaymentItems = ref([])
    const selectedKeys = ref(new Set())

    // 分页状态
    const currentPage = ref(1)
    const hasMore = ref(false)
    const totalCount = ref(0)

    // 筛选条件
    const filterGuardStatus = ref(null)
    const filterFundStatus = ref(1)

    // 仅 fund_status === 1 的可选项
    const selectableItems = computed(() =>
      instantPaymentItems.value.filter(i => i.fund_status === 1)
    )

    const selectedItems = computed(() =>
      selectableItems.value.filter(i => selectedKeys.value.has(i.order_fulfill_guard_no))
    )

    const selectedAmount = computed(() =>
      selectedItems.value.reduce((sum, i) => sum + parseFloat(i.remaining_retrieve_amount || 0), 0).toFixed(2)
    )

    const allSelected = computed(() =>
      selectableItems.value.length > 0 && selectedItems.value.length === Math.min(selectableItems.value.length, MAX_SELECT)
    )
    const isIndeterminate = computed(() =>
      selectedItems.value.length > 0 && !allSelected.value
    )

    const statistics = computed(() => {
      const totalAmount = instantPaymentItems.value.reduce((sum, item) =>
        sum + parseFloat(item.remaining_retrieve_amount || 0), 0)
      const tradableBalance = instantPaymentItems.value.reduce((sum, item) =>
        sum + parseFloat(item.tradable_balance || 0), 0)
      return {
        itemCount: instantPaymentItems.value.length,
        totalAmount: totalAmount.toFixed(2),
        tradableBalance: tradableBalance.toFixed(2)
      }
    })

    const mapItem = (item) => {
      const commodity = item.commodityInfoList?.[0] || {}
      return {
        order_no: item.orderNo,
        order_fulfill_guard_no: item.orderFulfillGuardNo,
        unfreeze_amount: item.unfreezeAmount,
        create_time: item.createTime,
        guard_status: item.guardStatus,
        fund_status: item.fundStatus,
        guard_status_text: item.guardStatusText,
        fund_status_text: item.fundStatusText,
        tip_content: item.tipContent,
        remaining_retrieve_amount: item.remainingRetrieveAmount,
        tradable_balance: item.tradableBalance,
        auto_retrieve: item.autoRetrieve,
        commodity_name: commodity.commodityName,
        commodity_icon_url: commodity.commodityIconUrl,
        abrade: commodity.abrade,
        paint_index: commodity.paintIndex,
        paint_seed: commodity.paintSeed,
        exterior_name: commodity.exteriorName,
        rarity_name: commodity.rarityName,
        sticker_list: commodity.stickerList || []
      }
    }

    const buildPayload = (pageIndex) => {
      const payload = {
        steamId: props.steamId,
        pageIndex,
        pageSize: PAGE_SIZE,
        fundStatus: filterFundStatus.value
      }
      if (filterGuardStatus.value !== null) {
        payload.guardStatus = filterGuardStatus.value
      }
      return payload
    }

    // 首次/筛选变化加载（重置列表）
    const loadData = async () => {
      if (!props.steamId) return
      loading.value = true
      selectedKeys.value = new Set()
      currentPage.value = 1
      try {
        const response = await axios.post(apiUrls.yyypGetInstantPaymentList(), buildPayload(1))
        if (response.data && response.data.success) {
          const data = response.data.data || {}
          instantPaymentItems.value = (data.responseList || []).map(mapItem)
          const pagination = response.data.pagination || {}
          totalCount.value = pagination.totalCount || data.totalCount || 0
          hasMore.value = pagination.hasMore || false
          emit('update:count', instantPaymentItems.value.length)
        } else {
          ElMessage.error(response.data?.message || '加载失败')
          emit('update:count', 0)
        }
      } catch (error) {
        console.error('加载0CD订单失败:', error)
        ElMessage.error('加载失败: ' + (error.response?.data?.message || error.message))
      } finally {
        loading.value = false
      }
    }

    // 加载下一页（追加到列表）
    const loadMore = async () => {
      if (!hasMore.value || loadingMore.value || loading.value) return
      loadingMore.value = true
      const nextPage = currentPage.value + 1
      try {
        const response = await axios.post(apiUrls.yyypGetInstantPaymentList(), buildPayload(nextPage))
        if (response.data && response.data.success) {
          const data = response.data.data || {}
          const newItems = (data.responseList || []).map(mapItem)
          instantPaymentItems.value.push(...newItems)
          currentPage.value = nextPage
          const pagination = response.data.pagination || {}
          hasMore.value = pagination.hasMore || false
          emit('update:count', instantPaymentItems.value.length)
        }
      } catch (error) {
        console.error('加载更多失败:', error)
      } finally {
        loadingMore.value = false
      }
    }

    // 滚动到底部自动加载下一页
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      if (docHeight - scrollTop - windowHeight < 200) {
        loadMore()
      }
    }

    onMounted(() => window.addEventListener('scroll', handleScroll))
    onUnmounted(() => window.removeEventListener('scroll', handleScroll))

    const isSelected = (item) => selectedKeys.value.has(item.order_fulfill_guard_no)

    const toggleSelect = (item) => {
      if (item.fund_status !== 1) return
      const key = item.order_fulfill_guard_no
      const next = new Set(selectedKeys.value)
      if (next.has(key)) {
        next.delete(key)
      } else {
        if (next.size >= MAX_SELECT) {
          ElMessage.warning(`最多只能选择 ${MAX_SELECT} 个`)
          return
        }
        next.add(key)
      }
      selectedKeys.value = next
    }

    const handleSelectAll = (val) => {
      if (val) {
        const keys = selectableItems.value.slice(0, MAX_SELECT).map(i => i.order_fulfill_guard_no)
        selectedKeys.value = new Set(keys)
      } else {
        selectedKeys.value = new Set()
      }
    }

    const handleClearSelection = () => {
      selectedKeys.value = new Set()
    }

    const formatTipContent = (content) => {
      if (!content) return ''
      const match = content.match(/(\d{4}\.\d{2}\.\d{2})/)
      if (match) return `${match[1]}解冻`
      return content.length > 20 ? content.substring(0, 20) + '...' : content
    }

    const handleBatchExtract = async () => {
      if (selectedItems.value.length === 0) return
      extracting.value = true
      try {
        const fullGradNoList = selectedItems.value.map(i => i.order_fulfill_guard_no)
        const response = await axios.post(apiUrls.yyypRetrieveRecord(), {
          steamId: props.steamId,
          fullGradNo: fullGradNoList,
          userLevel: 1
        })
        if (response.data && response.data.success) {
          ElMessage.success(`成功提取 ${fullGradNoList.length} 个订单`)
          await loadData()
        } else {
          ElMessage.error(response.data?.message || '提取失败')
        }
      } catch (error) {
        console.error('提取资金失败:', error)
        ElMessage.error('提取失败: ' + (error.response?.data?.message || error.message))
      } finally {
        extracting.value = false
      }
    }

    watch(() => props.steamId, (newValue) => {
      if (newValue) loadData()
    }, { immediate: true })

    return {
      loading,
      loadingMore,
      extracting,
      instantPaymentItems,
      selectableItems,
      selectedItems,
      selectedAmount,
      allSelected,
      isIndeterminate,
      statistics,
      hasMore,
      totalCount,
      filterGuardStatus,
      filterFundStatus,
      isSelected,
      toggleSelect,
      handleSelectAll,
      handleClearSelection,
      handleBatchExtract,
      loadData,
      loadMore,
      formatTipContent
    }
  }
}
</script>

<style scoped>
/* 顶部筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.type-select {
  width: 150px;
}

/* 加载更多 */
.load-more-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem 1rem;
  gap: 0.5rem;
}

.loading-more-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.no-more-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* 底部浮动多选操作栏 */
.multi-select-actions {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-tertiary);
  border: 2px solid var(--el-color-primary);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.slide-up-enter-to,
.slide-up-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.selected-count {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: bold;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* 卡片网格样式 */
.card-container {
  margin-top: 1rem;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.inventory-card {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: visible;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  min-height: 300px;
  height: auto;
  user-select: none;
}

.inventory-card.multi-select-mode:hover {
  border-color: var(--el-color-primary);
}

.inventory-card.selected {
  border-color: var(--el-color-primary);
  background: rgba(76, 175, 80, 0.1);
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.inventory-card.selected:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 2px var(--el-color-primary);
}

.inventory-card.card-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 选中勾 - 右上角 */
.check-mark {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--border-color);
  border: 2px solid var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  font-size: 12px;
  color: transparent;
}

.check-mark.is-checked {
  background: var(--el-color-primary);
  color: var(--text-primary);
}

.card-image {
  position: relative;
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-image .weapon-image {
  width: 180px;
  height: 120px;
  object-fit: contain;
}

.image-placeholder {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 贴纸覆盖层 */
.sticker-overlay {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
  z-index: 2;
}

.sticker-item-overlay {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.sticker-img-overlay {
  max-width: 28px;
  max-height: 28px;
  object-fit: contain;
}

.sticker-placeholder-overlay {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 状态覆盖层 - 左上角 */
.status-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background: rgba(76, 175, 80, 0.9);
  color: var(--text-primary);
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  z-index: 3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.status-overlay.status-guarding {
  background: rgba(230, 162, 60, 0.9);
}

/* 卡片内容 */
.card-content {
  padding: 0.75rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  min-height: 2.6em;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.75rem;
}

.float-bar-container {
  margin-top: 0.3rem;
  padding: 0;
  margin-bottom: 0;
}

.float-bar {
  position: relative;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
}

.float-segment {
  flex: 1;
  height: 100%;
}

.float-segment.fn { background: var(--accent-green); flex: 0.07; }
.float-segment.mw { background: #8BC34A; flex: 0.08; }
.float-segment.ft { background: #FFC107; flex: 0.23; }
.float-segment.ww { background: #FF9800; flex: 0.07; }
.float-segment.bs { background: #F44336; flex: 0.55; }

.float-pointer {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 10px;
  background: #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  z-index: 1;
}

.float-value {
  text-align: left;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
  margin-top: 0.2rem;
  margin-bottom: 0;
  font-weight: 500;
}

.card-prices {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.3rem;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  gap: 0.5rem;
}

.price-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}

.price-label {
  color: var(--text-secondary);
  font-size: 0.7rem;
  white-space: nowrap;
}

.price-value {
  color: var(--text-primary);
  font-weight: bold;
  font-size: 0.75rem;
}

.sale-price {
  color: var(--accent-green);
}

.card-footer {
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.tip-tag {
  max-width: 100%;
  font-size: 0.65rem;
}

.tag-icon {
  margin-right: 0.25rem;
}

.table-footer {
  margin-top: 1rem;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  .action-bar {
    flex-wrap: wrap;
  }
}
</style>
