<template>
  <div class="favorite-container">
    <div class="favorite-layout">

      <!-- 左：皮肤关注 -->
      <div class="favorite-section">
        <div class="favorite-header">
          <div class="header-left">
            <h3>皮肤关注
              <span class="favorite-count">{{ skinList.length }} 个</span>
            </h3>
          </div>
          <div class="header-actions">
            <el-input
              v-model="skinSearch"
              placeholder="搜索皮肤名称..."
              size="small"
              clearable
              class="favorite-search"
            />
            <el-button
              size="small"
              type="primary"
              plain
              :loading="loadingSkin"
              @click="loadSkinList"
            >
              刷新列表
            </el-button>
          </div>
        </div>

        <div class="favorite-content" v-loading="loadingSkin">
          <div
            v-for="item in filteredSkinList"
            :key="item.id"
            class="favorite-item"
          >
            <!-- 左：图片 -->
            <div class="favorite-item-image">
              <img
                :src="getItemImage(item)"
                :alt="item.name"
                class="favorite-weapon-image"
                @error="(e) => { if (item.icon_url && e.target.src !== item.icon_url) { e.target.src = item.icon_url } else { e.target.style.display = 'none' } }"
              />
            </div>

            <!-- 中：信息 -->
            <div class="favorite-item-info">
              <div class="favorite-item-name">{{ item.name }}</div>
              <div class="favorite-item-tags">
                <el-tag
                  v-if="item.exterior"
                  size="small"
                  :style="{
                    color: getFloatRangeColor(item.exterior) + ' !important',
                    borderColor: getFloatRangeColor(item.exterior),
                    backgroundColor: 'transparent'
                  }"
                >{{ item.exterior }}</el-tag>
                <el-tag
                  v-if="item.quality"
                  size="small"
                  :style="{
                    color: item.quality_color + ' !important',
                    borderColor: item.quality_color,
                    backgroundColor: 'transparent'
                  }"
                >{{ item.quality }}</el-tag>
                <el-tag
                  v-if="item.rarity"
                  size="small"
                  :style="{
                    color: getRarityColor(item.rarity) + ' !important',
                    borderColor: getRarityColor(item.rarity),
                    backgroundColor: 'transparent'
                  }"
                >{{ item.rarity }}</el-tag>
              </div>
              <div class="favorite-item-price-row">
                <span class="price-label">在售最低:</span>
                <span class="price-value sale-color">¥{{ item.sell_min_price }}</span>
                <span class="price-label" style="margin-left: 1rem;">求购最高:</span>
                <span class="price-value highlight-color">¥{{ item.purchase_max_price }}</span>
              </div>
            </div>

            <!-- 右：操作 -->
            <div class="favorite-item-actions">
              <div class="action-buttons">
                <el-button
                  size="small"
                  type="success"
                  plain
                  :loading="item._cancelling"
                  @click="handleCancelStar(item)"
                >
                  取消关注
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="filteredSkinList.length === 0 && !loadingSkin" class="empty-favorite">
            <el-empty description="暂无皮肤关注" />
          </div>
        </div>
      </div>

      <!-- 右：单件关注 -->
      <div class="favorite-section">
        <div class="favorite-header">
          <div class="header-left">
            <h3>单件关注
              <span class="favorite-count">{{ itemList.length }} 个</span>
            </h3>
          </div>
          <div class="header-actions">
            <el-select
              v-model="itemStatusFilter"
              placeholder="状态筛选"
              size="small"
              clearable
              class="favorite-filter"
            >
              <el-option label="在售" value="on_sale" />
              <el-option label="已售出" value="sold" />
              <el-option label="已下架" value="off_shelf" />
            </el-select>
            <el-input
              v-model="itemSearch"
              placeholder="搜索饰品名称..."
              size="small"
              clearable
              class="favorite-search"
            />
            <el-button
              size="small"
              type="primary"
              plain
              :loading="loadingGoods"
              @click="loadGoodsList"
            >
              刷新列表
            </el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :loading="clearingInvalid"
              :disabled="invalidItemCount === 0"
              @click="handleClearInvalidItems"
            >
              清除失效 {{ invalidItemCount > 0 ? `(${invalidItemCount})` : '' }}
            </el-button>
          </div>
        </div>

        <div class="favorite-content" v-loading="loadingGoods">
          <div
            v-for="item in filteredItemList"
            :key="item.id"
            class="favorite-item"
            :class="{ 'item-sold': item.status === 'sold', 'item-off': item.status === 'off_shelf' }"
          >
            <!-- 左：图片 -->
            <div class="favorite-item-image">
              <img
                :src="getItemImage(item)"
                :alt="item.name"
                class="favorite-weapon-image"
                @error="(e) => { if (item.icon_url && e.target.src !== item.icon_url) { e.target.src = item.icon_url } else { e.target.style.display = 'none' } }"
              />
            </div>

            <!-- 中：信息 -->
            <div class="favorite-item-info">
              <div class="favorite-item-name">{{ item.name }}</div>
              <div class="favorite-item-tags">
                <el-tag
                  v-if="item.exterior"
                  size="small"
                  :style="{
                    color: getFloatRangeColor(item.exterior) + ' !important',
                    borderColor: getFloatRangeColor(item.exterior),
                    backgroundColor: 'transparent'
                  }"
                >{{ item.exterior }}</el-tag>
                <el-tag
                  v-if="item.rarity"
                  size="small"
                  :style="{
                    color: getRarityColor(item.rarity) + ' !important',
                    borderColor: getRarityColor(item.rarity),
                    backgroundColor: 'transparent'
                  }"
                >{{ item.rarity }}</el-tag>
                <el-tag v-if="item.is_lease" size="small" type="warning">租赁</el-tag>
              </div>
              <!-- 第一行：磨损进度条 + 磨损值 -->
              <div class="float-bar-container" v-if="item.abrade">
                <div class="float-bar">
                  <div class="float-segment fn"></div>
                  <div class="float-segment mw"></div>
                  <div class="float-segment ft"></div>
                  <div class="float-segment ww"></div>
                  <div class="float-segment bs"></div>
                  <div
                    class="float-pointer"
                    :style="{ left: `${parseFloat(item.abrade) * 100}%` }"
                    :title="`磨损值: ${item.abrade}`"
                  ></div>
                </div>
                <span class="abrade-value">{{ item.abrade }}</span>
              </div>
              <!-- 第二行：售价 + 模板 + 印花/挂件图片 -->
              <div class="favorite-item-price-row">
                <span class="price-label">售价:</span>
                <span class="price-value sale-color">¥{{ item.sale_price }}</span>
                <template v-if="item.paint_seed">
                  <span class="price-label" style="margin-left: 0.8rem;">模板:</span>
                  <span class="price-value">{{ item.paint_seed }}</span>
                </template>
                <template v-if="item.have_sticker && item.stickers.length">
                  <div
                    v-for="(sticker, si) in item.stickers"
                    :key="'s'+si"
                    class="accessory-thumb"
                    :title="sticker.name"
                    style="margin-left: 0.4rem;"
                  >
                    <img
                      :src="getStickerImage(sticker)"
                      :alt="sticker.name"
                      class="accessory-img"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                  </div>
                </template>
                <template v-if="item.have_pendant && item.pendants.length">
                  <div
                    v-for="(pendant, pi) in item.pendants"
                    :key="'p'+pi"
                    class="accessory-thumb"
                    :title="pendant.name"
                    style="margin-left: 0.4rem;"
                  >
                    <img
                      :src="getPendantImage(pendant)"
                      :alt="pendant.name"
                      class="accessory-img"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                  </div>
                </template>
              </div>
            </div>

            <!-- 右：操作 -->
            <div class="favorite-item-actions">
              <div class="item-add-time">
                <span class="time-label">关注时间：</span>
                <span class="time-value">{{ item.add_time }}</span>
              </div>
              <div class="action-buttons">
                <el-button
                  size="small"
                  type="primary"
                  :disabled="item.status !== 'on_sale'"
                  @click="handleBuyGoods(item)"
                >
                  购买
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="filteredItemList.length === 0 && !loadingGoods" class="empty-favorite">
            <el-empty description="暂无单件关注" />
          </div>
        </div>
      </div>

    </div>

    <!-- 在售购买对话框 -->
    <el-dialog
      v-model="onSaleBuyDialogVisible"
      title="确认购买"
      width="560px"
      :close-on-click-modal="false"
      @close="cancelOnSaleOrder"
    >
      <div v-loading="onSaleDetailLoading" class="onsale-buy-content">
        <div v-if="onSaleDetail && onSaleDetail.commodity" class="onsale-detail">
          <div class="onsale-commodity-info">
            <img
              v-if="onSaleDetail.commodity.templateInfo?.iconUrlLarge"
              :src="onSaleDetail.commodity.templateInfo.iconUrlLarge"
              class="onsale-commodity-img"
            />
            <div class="onsale-commodity-desc">
              <div class="onsale-commodity-name">{{ onSaleDetail.commodity.commodityName }}</div>
              <el-descriptions :column="1" border size="small" style="margin-top: 8px;">
                <el-descriptions-item label="价格">
                  <span style="color: var(--accent-red-light); font-size: 16px; font-weight: bold;">
                    ¥{{ onSaleDetail.commodity.sellPrice }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="稀有度" v-if="onSaleDetail.commodity.templateInfo?.rarityName">
                  <span :style="{ color: '#' + onSaleDetail.commodity.templateInfo.rarityColor }">
                    {{ onSaleDetail.commodity.templateInfo.rarityName }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <div class="onsale-payment-section">
            <div v-if="onSaleOrderLoading" class="onsale-order-loading">
              <el-icon class="is-loading"><Loading /></el-icon> 正在创建订单并查询余额...
            </div>
            <template v-else-if="onSaleOrderNo">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="订单号">
                  <span style="color: var(--text-secondary); font-size: 12px;">{{ onSaleOrderNo }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="有品余额">
                  <span :style="{ color: onSaleBalanceInsufficient ? 'var(--accent-red-light)' : 'var(--accent-green)', fontWeight: 'bold' }">
                    ¥{{ onSaleBalance !== null ? onSaleBalance.toFixed(2) : '获取失败' }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="支付金额">
                  <span style="color: var(--accent-red-light); font-weight: bold;">¥{{ onSalePrice.toFixed(2) }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="支付后余额">
                  <span :style="{ color: onSaleBalanceInsufficient ? 'var(--accent-red-light)' : 'var(--text-secondary)' }">
                    {{ onSaleBalanceAfter !== null ? '¥' + onSaleBalanceAfter.toFixed(2) : '-' }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
              <div v-if="onSaleBalanceInsufficient" class="onsale-balance-warning">
                余额不足，无法完成支付
              </div>
            </template>
            <div v-else-if="onSaleOrderError" class="onsale-order-error">
              {{ onSaleOrderError }}
            </div>
          </div>
        </div>
        <div v-else-if="!onSaleDetailLoading">
          <el-empty description="无法加载商品详情" />
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelOnSaleOrder">取消订单</el-button>
        <el-button
          type="primary"
          :loading="buyingOnSale"
          :disabled="!onSaleDetail || onSaleDetailLoading || onSaleOrderLoading || !onSaleOrderNo || onSaleBalanceInsufficient"
          @click="confirmOnSalePayment"
        >
          支付订单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiUrls, API_CONFIG } from '@/config/api.js'

export default {
  name: 'MyFavorite',
  components: { Loading },
  props: {
    steamId: {
      type: String,
      required: true
    }
  },
  emits: ['update:count'],
  setup(props, { emit }) {
    const loadingSkin = ref(false)
    const loadingGoods = ref(false)
    const clearingInvalid = ref(false)
    const skinSearch = ref('')
    const itemSearch = ref('')
    const itemStatusFilter = ref('on_sale')
    const skinList = ref([])
    const itemList = ref([])

    // 失效物品数量（已售出或已下架）
    const invalidItemCount = computed(() =>
      itemList.value.filter(i => i.status !== 'on_sale').length
    )

    // 皮肤关注过滤
    const filteredSkinList = computed(() => {
      if (!skinSearch.value) return skinList.value
      return skinList.value.filter(i =>
        i.name.toLowerCase().includes(skinSearch.value.toLowerCase())
      )
    })

    // 单件关注过滤（暂未对接，保留筛选逻辑）
    const filteredItemList = computed(() => {
      let list = itemList.value
      if (itemStatusFilter.value) {
        list = list.filter(i => i.status === itemStatusFilter.value)
      }
      if (itemSearch.value) {
        list = list.filter(i =>
          i.name.toLowerCase().includes(itemSearch.value.toLowerCase())
        )
      }
      return list
    })

    // 加载皮肤关注列表
    const loadSkinList = async () => {
      if (!props.steamId) return
      loadingSkin.value = true
      try {
        const response = await axios.post(apiUrls.yyypGetItemStarList(), {
          steamId: props.steamId,
          sortType: 0
        })

        if (response.data && response.data.success) {
          const data = response.data.data || {}
          const templateList = data.templateList || []
          skinList.value = templateList.map(item => ({
            id: item.id,
            templateId: item.templateId,
            name: item.name,
            icon_url: item.imgUrl || '',
            exterior: item.exteriorName || '',
            rarity: item.rarityName || '',
            rarity_color: item.rarityColor ? `#${item.rarityColor}` : '',
            quality: item.qualityName || '',
            quality_color: item.qualityColor ? `#${item.qualityColor}` : '',
            hash_name: item.commodityHashName || '',
            sell_min_price: item.sellMinPrice || '-',
            on_sell_min_price: item.onSellMinPrice || 0,
            purchase_max_price: item.purchaseMaxPrice || '-',
            add_time: item.addTime || '',
            is_top: item.isTop || 0
          }))
          emit('update:count', skinList.value.length)
        } else {
          ElMessage.error(response.data?.message || '加载失败')
        }
      } catch (error) {
        console.error('加载皮肤关注失败:', error)
        ElMessage.error('加载失败: ' + (error.response?.data?.message || error.message))
      } finally {
        loadingSkin.value = false
      }
    }

    // 加载单件关注列表
    const loadGoodsList = async () => {
      if (!props.steamId) return
      loadingGoods.value = true
      try {
        const response = await axios.post(apiUrls.yyypGetGoodsStarList(), {
          steamId: props.steamId,
          sortType: 0
        })

        if (response.data && response.data.success) {
          const data = response.data.data || {}
          const sellList = data.sellCommodityList || []
          const leaseList = data.leaseCommodityList || []

          const mapItem = (item, isLease) => ({
            id: item.id,
            commodityId: item.commodityId,
            templateId: item.templateId,
            name: item.name,
            icon_url: item.imgUrl || '',
            hash_name: item.commodityHashName || '',
            exterior: item.exteriorName || '',
            rarity: item.rarityName || '',
            abrade: item.abrade || '',
            sale_price: item.sellAmount != null ? (item.sellAmount / 100).toFixed(2) : '-',
            status: item.status === 20 ? 'on_sale' : item.status === 30 ? 'sold' : 'off_shelf',
            stickers: item.stickers || [],
            pendants: item.pendants || [],
            add_time: item.addTime ? new Date(Number(item.addTime)).toLocaleDateString() : '',
            paint_seed: item.paintSeed || '',
            have_sticker: item.haveSticker || 0,
            have_pendant: item.havePendant || 0,
            is_lease: isLease
          })

          itemList.value = [
            ...sellList.map(item => mapItem(item, false)),
            ...leaseList.map(item => mapItem(item, true))
          ]
        } else {
          ElMessage.error(response.data?.message || '加载单件关注失败')
        }
      } catch (error) {
        console.error('加载单件关注失败:', error)
        ElMessage.error('加载失败: ' + (error.response?.data?.message || error.message))
      } finally {
        loadingGoods.value = false
      }
    }

    // 取消皮肤关注
    const handleCancelStar = async (item) => {
      try {
        await ElMessageBox.confirm(
          `确定取消关注「${item.name}」？`,
          '取消关注',
          { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
        )
      } catch {
        return
      }

      item._cancelling = true
      try {
        const response = await axios.post(apiUrls.yyypCancelItemStar(), {
          steamId: props.steamId,
          templateId: item.templateId
        })

        if (response.data && response.data.success) {
          ElMessage.success('已取消关注')
          skinList.value = skinList.value.filter(i => i.id !== item.id)
          emit('update:count', skinList.value.length)
        } else {
          ElMessage.error(response.data?.message || '取消失败')
        }
      } catch (error) {
        ElMessage.error('取消失败: ' + (error.response?.data?.message || error.message))
      } finally {
        item._cancelling = false
      }
    }

    // 清除失效物品（已售出/已下架的单件关注）
    const handleClearInvalidItems = async () => {
      const invalidItems = itemList.value.filter(i => i.status !== 'on_sale')
      if (invalidItems.length === 0) {
        ElMessage.info('没有失效物品')
        return
      }

      try {
        await ElMessageBox.confirm(
          `确定清除 ${invalidItems.length} 件失效关注（已售出/已下架）？`,
          '清除失效物品',
          { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
        )
      } catch {
        return
      }

      clearingInvalid.value = true
      let successCount = 0
      let failCount = 0

      for (const item of invalidItems) {
        try {
          const response = await axios.post(apiUrls.yyypCancelGoodsStar(), {
            steamId: props.steamId,
            id: item.id
          })
          if (response.data?.success) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      clearingInvalid.value = false

      if (failCount === 0) {
        ElMessage.success(`已清除 ${successCount} 件失效关注`)
      } else {
        ElMessage.warning(`清除完成：成功 ${successCount} 件，失败 ${failCount} 件`)
      }

      await loadGoodsList()
    }

    // 获取饰品主图：优先本地接口，降级远程 URL
    const getItemImage = (item) => {
      if (item.hash_name) {
        const name = item.hash_name
          .replace(/\s*\|\s*/g, '___')
          .replace(/\s/g, '_')
          + '.png'
        return apiUrls.weaponImage(name)
      }
      return item.icon_url || ''
    }

    // 将 steamHashName 转为本地图片路径名
    const hashNameToImageName = (steamHashName) => {
      if (!steamHashName) return null
      return steamHashName
        .replace(/\s*\|\s*/g, '___')
        .replace(/\s/g, '_')
        + '.png'
    }

    const getStickerImage = (sticker) => {
      if (!sticker) return ''
      if (sticker.steamHashName) {
        const name = hashNameToImageName(`Sticker | ${sticker.steamHashName}`)
        if (name) return apiUrls.weaponImage(name)
      }
      return sticker.imageUrl || sticker.imgUrl || ''
    }

    const getPendantImage = (pendant) => {
      if (!pendant) return ''
      if (pendant.steamHashName) {
        const name = hashNameToImageName(pendant.steamHashName)
        if (name) return apiUrls.weaponImage(name)
      }
      if (pendant.hashName) {
        const name = hashNameToImageName(pendant.hashName)
        if (name) return apiUrls.weaponImage(name)
      }
      return pendant.imgUrl || pendant.imageUrl || ''
    }

    const getFloatRangeColor = (floatRange) => {
      if (!floatRange) return '#fff'
      const colorMap = {
        '崭新出厂': '#4caf50',
        '略有磨损': '#8bc34a',
        '久经沙场': '#ffc107',
        '破损不堪': '#ff9800',
        '战痕累累': '#f44336'
      }
      return colorMap[floatRange] || '#fff'
    }

    const getRarityColor = (rarity) => {
      if (!rarity) return ''
      const rarityColorMap = {
        '违禁': '#e4ae39',
        '非凡': '#e4ae39',
        '隐秘': '#eb4b4b',
        '保密': '#d32ce6',
        '受限': '#8847ff',
        '军规': '#4b69ff',
        '工业': '#5e98d9',
        '消费': '#b0c3d9',
        '普通': '#b0c3d9'
      }
      return rarityColorMap[rarity] || '#fff'
    }

    const getTrendClass = (trend) => {
      if (trend === 'up') return 'trend-up'
      if (trend === 'down') return 'trend-down'
      return 'trend-flat'
    }
    const getTrendIcon = (trend) => {
      if (trend === 'up') return '▲'
      if (trend === 'down') return '▼'
      return '—'
    }
    const getStatusLabel = (status) => {
      const map = { on_sale: '在售', sold: '已售', off_shelf: '下架' }
      return map[status] || status
    }
    const getStatusBadgeClass = (status) => {
      const map = { on_sale: 'badge-on-sale', sold: 'badge-sold', off_shelf: 'badge-off' }
      return map[status] || ''
    }

    watch(() => props.steamId, (val) => {
      if (val) {
        loadSkinList()
        loadGoodsList()
      }
    }, { immediate: true })

    // ========== 在售购买逻辑 ==========
    const onSaleBuyDialogVisible = ref(false)
    const onSaleDetail = ref(null)
    const onSaleDetailLoading = ref(false)
    const buyingOnSale = ref(false)
    const currentOnSaleItem = ref(null)
    const onSaleOrderNo = ref(null)
    const onSaleWaitPaymentDataNo = ref(null)
    const onSalePayList = ref([])
    const onSaleOrderLoading = ref(false)
    const onSaleOrderError = ref(null)

    const onSaleBalanceChannel = computed(() =>
      onSalePayList.value.find(p => p.channelId === 100) || null
    )
    const onSaleBalance = computed(() =>
      onSaleBalanceChannel.value ? parseFloat(onSaleBalanceChannel.value.balance || 0) : null
    )
    const onSalePrice = computed(() => {
      const commodity = onSaleDetail.value?.commodity
      if (!commodity) return 0
      return parseFloat(
        commodity.commodityConversionPrice ||
        (commodity.commodityPrice ? commodity.commodityPrice / 100 : 0)
      )
    })
    const onSaleBalanceAfter = computed(() =>
      onSaleBalance.value !== null ? (onSaleBalance.value - onSalePrice.value) : null
    )
    const onSaleBalanceInsufficient = computed(() =>
      onSaleBalance.value !== null && onSaleBalance.value < onSalePrice.value
    )

    const handleBuyGoods = async (item) => {
      if (!item || !item.commodityId) {
        ElMessage.warning('商品信息不完整')
        return
      }

      currentOnSaleItem.value = item
      onSaleDetail.value = null
      onSaleOrderNo.value = null
      onSaleWaitPaymentDataNo.value = null
      onSalePayList.value = []
      onSaleOrderError.value = null
      onSaleDetailLoading.value = true
      onSaleOrderLoading.value = true
      onSaleBuyDialogVisible.value = true

      const baseUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale`

      try {
        const detailRes = await axios.post(`${baseUrl}/getWeaponDetail`, {
          steamId: props.steamId,
          commodityId: item.commodityId.toString()
        })
        if (!detailRes.data.success) throw new Error(detailRes.data.message || '获取商品详情失败')
        onSaleDetail.value = detailRes.data.data
      } catch (error) {
        ElMessage.error(error.message || '获取商品详情失败')
        onSaleBuyDialogVisible.value = false
        onSaleDetailLoading.value = false
        onSaleOrderLoading.value = false
        return
      } finally {
        onSaleDetailLoading.value = false
      }

      const commodity = onSaleDetail.value?.commodity
      const price = commodity
        ? (commodity.commodityConversionPrice || (commodity.commodityPrice ? commodity.commodityPrice / 100 : 0))
        : 0

      if (!price) {
        onSaleOrderError.value = '商品价格缺失，无法创建订单'
        onSaleOrderLoading.value = false
        return
      }

      try {
        const orderRes = await axios.post(`${baseUrl}/createOrder`, {
          steamId: props.steamId,
          commodityId: item.commodityId.toString(),
          price: price.toString()
        })
        if (!orderRes.data.success) throw new Error(orderRes.data.message || '创建订单失败')
        const orderData = orderRes.data.data
        onSaleOrderNo.value = orderData.orderNo
        onSaleWaitPaymentDataNo.value = orderData.waitPaymentDataNo
        onSalePayList.value = orderData.payList || []
      } catch (error) {
        onSaleOrderError.value = error.response?.data?.message || error.message || '创建订单失败'
      } finally {
        onSaleOrderLoading.value = false
      }
    }

    let _cancellingOrder = false
    const cancelOnSaleOrder = async () => {
      if (_cancellingOrder) return
      _cancellingOrder = true
      onSaleBuyDialogVisible.value = false
      if (onSaleOrderNo.value) {
        const orderNoToCancel = onSaleOrderNo.value
        onSaleOrderNo.value = null
        try {
          await axios.post(
            `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/cancelOrder`,
            { steamId: props.steamId, orderNo: orderNoToCancel }
          )
        } catch { /* 撤单失败静默处理 */ }
      }
      _cancellingOrder = false
    }

    const confirmOnSalePayment = async () => {
      if (!onSaleOrderNo.value || !onSaleWaitPaymentDataNo.value) {
        ElMessage.error('订单信息不完整，请重新打开购买窗口')
        return
      }
      buyingOnSale.value = true
      try {
        const response = await axios.post(
          `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/submitPayment`,
          {
            steamId: props.steamId,
            orderNo: onSaleOrderNo.value,
            waitPaymentDataNo: onSaleWaitPaymentDataNo.value,
            price: onSalePrice.value.toString()
          }
        )
        if (response.data.success) {
          const orderNo = response.data.data?.orderNo || onSaleOrderNo.value
          ElMessage.success(`购买成功！订单号: ${orderNo}`)
          onSaleOrderNo.value = null
          onSaleBuyDialogVisible.value = false
          loadGoodsList()
        } else {
          throw new Error(response.data.message || '支付失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || error.message || '支付失败，请稍后重试')
      } finally {
        buyingOnSale.value = false
      }
    }

    return {
      loadingSkin,
      loadingGoods,
      clearingInvalid,
      skinSearch,
      itemSearch,
      itemStatusFilter,
      skinList,
      itemList,
      invalidItemCount,
      filteredSkinList,
      filteredItemList,
      loadSkinList,
      loadGoodsList,
      handleCancelStar,
      handleClearInvalidItems,
      getItemImage,
      getStickerImage,
      getPendantImage,
      getFloatRangeColor,
      getRarityColor,
      getTrendClass,
      getTrendIcon,
      getStatusLabel,
      getStatusBadgeClass,
      onSaleBuyDialogVisible,
      onSaleDetail,
      onSaleDetailLoading,
      buyingOnSale,
      onSaleOrderNo,
      onSaleOrderLoading,
      onSaleOrderError,
      onSaleBalance,
      onSalePrice,
      onSaleBalanceAfter,
      onSaleBalanceInsufficient,
      handleBuyGoods,
      cancelOnSaleOrder,
      confirmOnSalePayment
    }
  }
}
</script>

<style scoped>
.favorite-container {
  margin-top: 1rem;
}

.favorite-layout {
  display: flex;
  gap: 1.5rem;
  height: calc(100vh - 300px);
  min-height: 600px;
}

/* 左右两栏 */
.favorite-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 头部 */
.favorite-header {
  padding: 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.header-left h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.favorite-count {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.favorite-search {
  width: 180px;
}

.favorite-filter {
  width: 120px;
}

/* 列表内容区 */
.favorite-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* 每一行 */
.favorite-item {
  display: flex;
  align-items: center;
  padding: 0.9rem 1rem;
  margin-bottom: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
  gap: 1rem;
}

.favorite-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
}

.favorite-item.item-sold {
  opacity: 0.6;
}

.favorite-item.item-off {
  opacity: 0.5;
}

/* 图片区 */
.favorite-item-image {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-weapon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.favorite-image-placeholder {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

/* 单件状态角标 */
.item-status-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 0;
}

.badge-on-sale {
  background: rgba(76, 175, 80, 0.85);
  color: var(--text-primary);
}

.badge-sold {
  background: rgba(144, 144, 144, 0.85);
  color: var(--text-primary);
}

.badge-off {
  background: rgba(245, 108, 108, 0.85);
  color: var(--text-primary);
}

/* 信息区 */
.favorite-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.favorite-item-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-item-tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.favorite-item-price-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  flex-wrap: nowrap;
}

.price-label {
  color: var(--text-secondary);
  white-space: nowrap;
}

.price-value {
  font-weight: 600;
  color: var(--text-primary);
}

.sale-color {
  color: var(--accent-green);
}

.highlight-color {
  color: var(--accent-blue);
}

.seller-name {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 磨损条 */
.float-bar-container {
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.abrade-value {
  font-size: 0.72rem;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.float-bar {
  position: relative;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  width: 150px;
  flex-shrink: 0;
}

.float-segment { flex: 1; height: 100%; }
.float-segment.fn { background: var(--accent-green); flex: 0.07; }
.float-segment.mw { background: #8BC34A; flex: 0.08; }
.float-segment.ft { background: #FFC107; flex: 0.23; }
.float-segment.ww { background: #FF9800; flex: 0.07; }
.float-segment.bs { background: #F44336; flex: 0.55; }

.float-pointer {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 9px;
  background: #fff;
  box-shadow: 0 0 3px rgba(0,0,0,0.5);
  transform: translateX(-50%);
  z-index: 1;
}

/* 右侧操作区 */
.favorite-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
  flex-shrink: 0;
}

/* 价格趋势 */
.price-trend {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 64px;
  justify-content: flex-end;
}

.trend-up { color: var(--accent-red-light); }
.trend-down { color: var(--accent-green); }
.trend-flat { color: var(--text-secondary); }

.trend-icon {
  font-size: 0.7rem;
}

/* 关注时间 */
.item-add-time {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  white-space: nowrap;
}

.time-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.time-value {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  gap: 0.4rem;
}

/* 印花 / 挂件图片行 */
.accessory-row {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.accessory-thumb {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.accessory-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 购买对话框 */
.onsale-buy-content {
  min-height: 120px;
}

.onsale-commodity-info {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.onsale-commodity-img {
  width: 120px;
  height: 90px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}

.onsale-commodity-desc {
  flex: 1;
}

.onsale-commodity-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.onsale-payment-section {
  margin-top: 0.5rem;
}

.onsale-order-loading {
  text-align: center;
  padding: 8px 0;
  color: var(--text-secondary);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.onsale-balance-warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 4px;
  color: var(--accent-red-light);
  font-size: 13px;
}

.onsale-order-error {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 空状态 */
.empty-favorite {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

/* 响应式 */
@media (max-width: 900px) {
  .favorite-layout {
    flex-direction: column;
    height: auto;
  }
}
</style>
