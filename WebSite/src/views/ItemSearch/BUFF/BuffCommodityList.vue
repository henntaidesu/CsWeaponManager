<template>
  <!-- BUFF商品列表 -->
  <div v-if="showBuffList" class="card buff-commodity-list">
    <!-- 折叠/展开控制头部 -->
    <div class="buff-collapse-header" @click.stop="toggleBuffList">
      <div class="buff-collapse-left">
        <el-icon class="collapse-icon">
          <CaretRight v-if="!showBuffTable" />
          <CaretBottom v-if="showBuffTable" />
        </el-icon>
        <span class="buff-collapse-title">BUFF</span>

        <!-- 筛选按钮组 - 移到左侧 -->
        <div class="buff-filter-buttons">
          <button
            class="filter-btn"
            :class="{ active: buffFilterType === 'on_sale' }"
            @click.stop="handleFilterChange('on_sale')"
          >
            在售
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            :class="{ active: buffFilterType === 'on_lease' }"
            @click.stop="handleFilterChange('on_lease')"
          >
            在租
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            :class="{ active: buffFilterType === 'wanted' }"
            @click.stop="handleFilterChange('wanted')"
          >
            求购
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            @click.stop="handleOpenWearRanking"
          >
            磨损排行
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            :class="{ active: buffFilterType === 'sold' }"
            @click.stop="handleFilterChange('sold')"
          >
            成交记录
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            @click.stop="handleOpenPriceTrend"
          >
            价格走势
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn filter-advanced"
            @click.stop="handleAdvancedFilter"
          >
            筛选
          </button>

          <!-- 排序选择器 - 始终显示 -->
          <el-select
            v-model="sortType"
            size="small"
            placeholder="排序方式"
            @click.stop
            @change="handleSortChange"
            style="width: 120px; margin-left: 16px"
          >
            <el-option label="默认" value="default" />
            <el-option label="热度" value="popularity" />
            <el-option label="最新" value="newest" />
            <el-option label="价格 ↑" value="price_asc" />
            <el-option label="价格 ↓" value="price_desc" />
            <el-option label="磨损 ↑" value="wear_asc" />
            <el-option label="磨损 ↓" value="wear_desc" />
          </el-select>

          <!-- 磨损区间选择器 - 有磨损区间时显示 -->
          <el-select
            v-if="wearRangeOptions.length > 0"
            v-model="wearRange"
            size="small"
            placeholder="磨损区间"
            @click.stop
            @change="handleWearRangeChange"
            style="width: 140px; margin-left: 8px"
            clearable
          >
            <el-option label="全部磨损" value="" />
            <el-option
              v-for="option in wearRangeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>
      <div class="buff-weapon-info">
        <span class="total-count">总数: {{ buffTotalCount }} 件</span>

        <!-- 价格追踪按钮 - 移到右侧 -->
        <el-button
          type="primary"
          size="small"
          :icon="Refresh"
          @click.stop="handleRefreshBuff"
          :loading="isSearching && searchSource === 'buff'"
        >
          刷新列表
        </el-button>
        <el-button
          :type="isMultiSelectMode ? 'warning' : 'info'"
          size="small"
          @click.stop="toggleMultiSelectMode"
        >
          {{ isMultiSelectMode ? '取消多选' : '多选' }}
        </el-button>
        <el-button
          v-if="isMultiSelectMode"
          type="info"
          size="small"
          @click.stop="selectAllCommodities('buff')"
        >
          全选
        </el-button>
      </div>
    </div>

    <!-- BUFF卡片模式 -->
    <div
      v-show="showBuffTable"
      class="commodity-card-grid buff-scroll-container"
      v-loading="isSearching && searchSource === 'buff'"
      element-loading-text="加载中..."
      element-loading-background="rgba(0, 0, 0, 0.8)"
      @scroll="handleBuffScroll"
    >
      <div
        v-for="(item, index) in buffCommodities"
        :key="index"
        class="commodity-card"
        :class="{
          'selected': isCommoditySelected(item),
          'multi-select-mode': isMultiSelectMode
        }"
        @click="handleCommodityCardClick(item, 'buff', $event)"
      >
        <!-- 选中标记 -->
        <div v-if="isMultiSelectMode && isCommoditySelected(item)" class="selected-check">
          <el-icon><Check /></el-icon>
        </div>
        <div class="commodity-card-image">
          <img :src="item.iconUrl" class="commodity-icon" @error="handleImageError" />
          <!-- 印花覆盖层 - 左下角 -->
          <div v-if="item.stickers && item.stickers.length > 0" class="sticker-overlay">
            <div
              v-for="(sticker, sIdx) in item.stickers"
              :key="sIdx"
              class="sticker-item-overlay"
              :title="sticker.name || '印花'"
            >
              <img
                v-if="sticker.img_url"
                :src="sticker.img_url"
                :alt="sticker.name"
                class="sticker-img-overlay"
                @error="(e) => e.target.style.display = 'none'"
              />
              <div v-else class="sticker-placeholder-overlay">?</div>
            </div>
          </div>
        </div>
        <div class="commodity-card-content">
          <!-- 磨损进度条 - 顶部 -->
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
            <div class="float-value">{{ item.abrade }}</div>
          </div>
          <!-- 商品详情信息 -->
          <div class="commodity-card-info">
            <div class="info-item">
              <span class="info-label">售价:</span>
              <span class="info-value price-highlight">¥{{ item.price }}</span>
            </div>
            <div class="info-item" v-if="item.description">
              <span class="info-label">描述:</span>
              <span class="info-value description-text" :title="item.description">{{ item.description }}</span>
            </div>
            <div class="info-item" v-if="item.user_name">
              <span class="info-label">卖家:</span>
              <span class="info-value">{{ item.user_name }}</span>
            </div>
            <div class="info-item" v-if="item.paintseed">
              <span class="info-label">模板:</span>
              <span class="info-value">{{ item.paintseed }}</span>
            </div>
          </div>
          <!-- 印花/挂件价值 -->
          <div class="sticker-value-info" v-if="item.stickers && item.stickers.length > 0">
            <div class="sticker-value-item" v-if="item.stickerTotalValue !== undefined">
              <span class="sticker-value-label">印花价值:</span>
              <span class="sticker-value-amount">¥{{ item.stickerTotalValue || '0.00' }}</span>
            </div>
            <div class="sticker-value-loading" v-if="item.priceLoading">
              <span>价格查询中...</span>
            </div>
          </div>
          <!-- 购买按钮 -->
          <el-button
            v-if="!isMultiSelectMode"
            type="success"
            size="small"
            class="card-buy-button"
            @click.stop="handleBuyBuffCommodity(item)"
          >
            购买
          </el-button>
        </div>
      </div>
      <!-- BUFF加载更多提示 -->
      <div class="load-more-indicator" v-if="buffCommodities.length > 0">
        <div v-if="buffLoadingMore" class="loading-more">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else-if="!buffHasMore" class="no-more-data">
          <span>没有更多数据了</span>
        </div>
        <div v-else class="scroll-hint">
          <span>下拉加载更多</span>
        </div>
      </div>
    </div>

    <!-- 高级筛选对话框 -->
    <el-dialog
      v-model="filterDialogVisible"
      title="筛选"
      width="400px"
      :close-on-click-modal="false"
      class="buff-filter-dialog"
    >
      <el-form :model="filterForm" label-position="left" label-width="100px">
        <!-- 图案模板 -->
        <el-form-item label="图案模板">
          <el-input
            v-model="filterForm.templateId"
            placeholder="请输入模板编号0-1000"
            clearable
          />
        </el-form-item>

        <!-- 磨损区间 -->
        <el-form-item label="磨损区间">
          <div class="wear-range-inputs">
            <el-input
              v-model="filterForm.wearMin"
              placeholder="最小值"
              style="width: 48%"
            />
            <span style="margin: 0 2%">-</span>
            <el-input
              v-model="filterForm.wearMax"
              placeholder="最大值"
              style="width: 48%"
            />
          </div>
        </el-form-item>

        <!-- 名称标签 -->
        <el-form-item label="名称标签">
          <el-select
            v-model="filterForm.hasNameTag"
            placeholder="请选择"
            clearable
            style="width: 100%"
          >
            <el-option label="全部" :value="null" />
            <el-option label="有名称标签" :value="true" />
            <el-option label="无名称标签" :value="false" />
          </el-select>
        </el-form-item>

        <!-- 名称标签二级菜单 -->
        <el-form-item label="" v-if="filterForm.hasNameTag === true">
          <el-input
            v-model="filterForm.nameTagText"
            placeholder="输入名称标签内容"
            clearable
          />
        </el-form-item>

        <!-- 印花搜枪 -->
        <el-form-item label="印花搜枪">
          <el-select
            v-model="filterForm.hasStickerFilter"
            placeholder="请选择"
            clearable
            style="width: 100%"
          >
            <el-option label="全部" :value="null" />
            <el-option label="有印花" :value="true" />
            <el-option label="无印花" :value="false" />
          </el-select>
        </el-form-item>

        <!-- 印花搜枪二级菜单 -->
        <el-form-item label="" v-if="filterForm.hasStickerFilter === true">
          <el-input
            v-model="filterForm.stickerName"
            placeholder="输入印花名称"
            clearable
          />
        </el-form-item>

        <!-- 挂件 -->
        <el-form-item label="挂件">
          <el-select
            v-model="filterForm.hasPendant"
            placeholder="请选择"
            clearable
            style="width: 100%"
          >
            <el-option label="全部" :value="null" />
            <el-option label="有挂件" :value="true" />
            <el-option label="无挂件" :value="false" />
          </el-select>
        </el-form-item>

        <!-- 挂件二级菜单 -->
        <el-form-item label="" v-if="filterForm.hasPendant === true">
          <el-input
            v-model="filterForm.pendantName"
            placeholder="输入挂件名称"
            clearable
          />
        </el-form-item>

        <!-- 出售价格 -->
        <el-form-item label="出售价格">
          <div class="price-range-inputs">
            <el-input
              v-model="filterForm.priceMin"
              placeholder="最低价格"
              style="width: 48%"
            />
            <span style="margin: 0 2%">-</span>
            <el-input
              v-model="filterForm.priceMax"
              placeholder="最高价格"
              style="width: 48%"
            />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleResetFilter">重置</el-button>
          <el-button type="primary" @click="handleApplyFilter">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CaretRight, CaretBottom, Check, Loading, Refresh } from '@element-plus/icons-vue'

// 接收父组件传递的 props
const props = defineProps({
  showBuffList: Boolean,
  showBuffTable: Boolean,
  isSearching: Boolean,
  searchSource: String,
  isMultiSelectMode: Boolean,
  buffCurrentWeapon: Object,
  buffCommodities: Array,
  buffTotalCount: Number,
  buffBuyNum: Number,
  buffRentNum: Number,
  buffLoadingMore: Boolean,
  buffHasMore: Boolean,
  buffFilterType: String  // 当前筛选类型
})

// 定义事件
const emit = defineEmits([
  'toggle-buff-list',
  'refresh-buff',
  'toggle-multi-select',
  'select-all',
  'commodity-click',
  'buff-scroll',
  'buy-buff-commodity',
  'filter-change',
  'advanced-filter',
  'sort-change',
  'wear-range-change',
  'open-wear-ranking',
  'open-price-trend'
])

// 排序和磨损区间状态
const sortType = ref('default')
const wearRange = ref('')

// 筛选对话框状态
const filterDialogVisible = ref(false)

// 筛选表单数据
const filterForm = ref({
  templateId: '',           // 图案模板编号
  wearMin: '',              // 磨损最小值
  wearMax: '',              // 磨损最大值
  hasNameTag: null,         // 是否有名称标签 (null=全部, true=有, false=无)
  nameTagText: '',          // 名称标签内容（二级）
  hasStickerFilter: null,   // 是否有印花 (null=全部, true=有, false=无)
  stickerName: '',          // 印花名称（二级）
  hasPendant: null,         // 是否有挂件 (null=全部, true=有, false=无)
  pendantName: '',          // 挂件名称（二级）
  priceMin: '',             // 最低价格
  priceMax: ''              // 最高价格
})

// 判断当前武器品质并返回对应的磨损区间选项
const wearRangeOptions = computed(() => {
  if (!props.buffCurrentWeapon?.market_listing_item_name) return []

  const name = props.buffCurrentWeapon.market_listing_item_name

  // 崭新出厂 (Factory New: 0.00 - 0.07)
  if (name.includes('崭新出厂') || name.includes('Factory New')) {
    return [
      { label: '0.00 - 0.01', value: '0.00-0.01' },
      { label: '0.01 - 0.02', value: '0.01-0.02' },
      { label: '0.02 - 0.03', value: '0.02-0.03' },
      { label: '0.03 - 0.04', value: '0.03-0.04' },
      { label: '0.04 - 0.07', value: '0.04-0.07' }
    ]
  }

  // 略有磨损 (Minimal Wear: 0.07 - 0.15)
  if (name.includes('略有磨损') || name.includes('Minimal Wear')) {
    return [
      { label: '0.07 - 0.08', value: '0.07-0.08' },
      { label: '0.08 - 0.09', value: '0.08-0.09' },
      { label: '0.09 - 0.10', value: '0.09-0.10' },
      { label: '0.10 - 0.11', value: '0.10-0.11' },
      { label: '0.11 - 0.15', value: '0.11-0.15' }
    ]
  }

  // 久经沙场 (Field-Tested: 0.15 - 0.38)
  if (name.includes('久经沙场') || name.includes('Field-Tested')) {
    return [
      { label: '0.15 - 0.18', value: '0.15-0.18' },
      { label: '0.18 - 0.21', value: '0.18-0.21' },
      { label: '0.21 - 0.24', value: '0.21-0.24' },
      { label: '0.24 - 0.27', value: '0.24-0.27' },
      { label: '0.27 - 0.38', value: '0.27-0.38' }
    ]
  }

  // 破损不堪 (Well-Worn: 0.38 - 0.45)
  if (name.includes('破损不堪') || name.includes('Well-Worn')) {
    return [
      { label: '0.38 - 0.39', value: '0.38-0.39' },
      { label: '0.39 - 0.40', value: '0.39-0.40' },
      { label: '0.40 - 0.41', value: '0.40-0.41' },
      { label: '0.41 - 0.42', value: '0.41-0.42' },
      { label: '0.42 - 0.45', value: '0.42-0.45' }
    ]
  }

  // 战痕累累 (Battle-Scarred: 0.45 - 1.00)
  if (name.includes('战痕累累') || name.includes('Battle-Scarred')) {
    return [
      { label: '全部', value: '' },
      { label: '0.45 - 0.50', value: '0.45-0.50' },
      { label: '0.50 - 0.63', value: '0.50-0.63' },
      { label: '0.63 - 0.76', value: '0.63-0.76' },
      { label: '0.76 - 0.90', value: '0.76-0.90' },
      { label: '0.90 - 1.00', value: '0.90-1.00' }
    ]
  }

  // 其他品质暂不支持磨损区间筛选
  return []
})

// 筛选相关方法
const handleFilterChange = (filterType) => {
  emit('filter-change', filterType)
}

const handleAdvancedFilter = () => {
  filterDialogVisible.value = true
}

// 重置筛选表单
const handleResetFilter = () => {
  filterForm.value = {
    templateId: '',
    wearMin: '',
    wearMax: '',
    hasNameTag: null,
    nameTagText: '',
    hasStickerFilter: null,
    stickerName: '',
    hasPendant: null,
    pendantName: '',
    priceMin: '',
    priceMax: ''
  }
}

// 应用筛选
const handleApplyFilter = () => {
  emit('advanced-filter', filterForm.value)
  filterDialogVisible.value = false
}

const handleOpenWearRanking = () => {
  emit('open-wear-ranking')
}

const handleOpenPriceTrend = () => {
  emit('open-price-trend')
}

// 排序变更处理
const handleSortChange = (value) => {
  emit('sort-change', value)
}

// 磨损区间变更处理
const handleWearRangeChange = (value) => {
  emit('wear-range-change', value)
}

// 方法转发给父组件
const toggleBuffList = () => emit('toggle-buff-list')
const handleRefreshBuff = () => emit('refresh-buff')
const toggleMultiSelectMode = () => emit('toggle-multi-select')
const selectAllCommodities = (type) => emit('select-all', type)
const handleCommodityCardClick = (item, type, event) => emit('commodity-click', { item, type, event })
const handleBuffScroll = (event) => emit('buff-scroll', event)
const handleBuyBuffCommodity = (item) => emit('buy-buff-commodity', item)
const handleImageError = (e) => {
  // 图片加载失败处理
  e.target.style.display = 'none'
}

// 从父组件注入的方法
import { inject } from 'vue'
const isCommoditySelected = inject('isCommoditySelected', () => false)
</script>

<style scoped src="./buff-commodity-list.css"></style>
