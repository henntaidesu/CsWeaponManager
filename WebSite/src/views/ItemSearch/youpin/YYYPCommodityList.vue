<template>
  <!-- 悠悠有品商品列表 -->
  <div v-if="showYYYPList" class="card yyyp-commodity-list">
    <!-- 折叠/展开控制头部 -->
    <div class="yyyp-collapse-header" @click.stop="toggleYYYPList">
      <div class="yyyp-collapse-left">
        <el-icon class="collapse-icon">
          <CaretRight v-if="!showYYYPTable" />
          <CaretBottom v-if="showYYYPTable" />
        </el-icon>
        <span class="yyyp-collapse-title">悠悠有品</span>

        <!-- 筛选按钮组 - 移到左侧 -->
        <div class="yyyp-filter-buttons">
          <button
            class="filter-btn"
            :class="{ active: yyypFilterType === 'on_sale' }"
            @click.stop="handleFilterChange('on_sale')"
          >
            在售<span v-if="yyypFilterType === 'on_sale'" class="filter-count">({{ yyypTotalCount }})</span>
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            :class="{ active: yyypFilterType === 'on_lease' }"
            @click.stop="handleFilterChange('on_lease')"
          >
            在租<span v-if="yyypFilterType === 'on_lease'" class="filter-count">({{ yyypTotalCount }})</span>
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            :class="{ active: yyypFilterType === 'presale' }"
            @click.stop="handleFilterChange('presale')"
          >
            预售<span v-if="yyypFilterType === 'presale'" class="filter-count">({{ yyypTotalCount }})</span>
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn"
            :class="{ active: yyypFilterType === 'wanted' }"
            @click.stop="handleFilterChange('wanted')"
          >
            求购<span v-if="yyypFilterType === 'wanted'" class="filter-count">({{ yyypTotalCount }})</span>
          </button>
          <span class="filter-divider">|</span>
          <button
            class="filter-btn disabled"
            :class="{ active: yyypFilterType === 'sold' }"
            @click.stop=""
            disabled
          >
            成交
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
            :class="{ active: yyypHasFilterActive }"
            @click.stop="handleAdvancedFilter"
          >
            筛选
          </button>

          <!-- 重置筛选 - 在售/在租均显示，放在筛选与排序下拉中间 -->
          <el-button
            v-if="yyypFilterType === 'on_sale' || yyypFilterType === 'on_lease'"
            size="small"
            class="yyyp-reset-filter-btn yyyp-header-height-btn"
            @click.stop="handleResetYYYPFilter"
            title="重置排序、磨损、外观及高级筛选"
          >
            重置
          </el-button>

          <!-- 排序选择器 - 在售/在租由 listConfig 动态填充，样式与在售一致 -->
          <el-select
            v-if="(yyypFilterType === 'on_sale' || yyypFilterType === 'on_lease') && sortOptions.length > 0"
            :model-value="currentSortKey"
            class="yyyp-header-select yyyp-sort-select"
            placeholder="排序方式"
            @click.stop
            @change="handleSortChange"
          >
            <el-option
              v-for="opt in sortOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <!-- 磨损区间选择器 - 在售/在租由 listConfig 动态填充 -->
          <el-select
            v-if="(yyypFilterType === 'on_sale' || yyypFilterType === 'on_lease') && wearRangeOptions.length > 0"
            :model-value="currentWearRange"
            class="yyyp-header-select yyyp-wear-select"
            placeholder="磨损区间"
            @click.stop
            @change="handleWearRangeChange"
            clearable
          >
            <el-option
              v-for="option in wearRangeOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>
      <!-- 红框区域：在售/在租均显示外观(Exterior)，在售为售价、在租为租金(LeasePrice)，居左显示 -->
      <div v-if="headerTagOptions.length > 0" class="yyyp-header-exterior" @click.stop>
        <template v-for="(opt, idx) in headerTagOptions" :key="opt.value">
          <span v-if="idx > 0" class="exterior-divider">|</span>
          <button
            type="button"
            class="exterior-btn"
            :class="{ active: headerTagCurrentValue === opt.value }"
            @click.stop="handleHeaderTagChange(opt.value)"
          >
            <span class="exterior-btn-label">{{ opt.label }}</span>
            <span v-if="opt.sellPrice != null && opt.sellPrice !== ''" class="exterior-btn-price">¥{{ opt.sellPrice }}</span>
          </button>
        </template>
      </div>
      <div class="yyyp-weapon-info">
        <el-button
          v-if="yyypCurrentWeapon && yyypCurrentWeapon.yyyp_id != null && yyypCurrentWeapon.yyyp_id !== ''"
          type="success"
          size="small"
          class="yyyp-header-height-btn"
          @click.stop="handleOpenWantedDialog"
          :loading="submittingWanted"
          title="发布求购"
        >
          发布求购
        </el-button>
        <el-button
          type="primary"
          size="small"
          class="yyyp-header-height-btn"
          :icon="Refresh"
          circle
          @click.stop="handleRefreshYYYP"
          :loading="isSearching && searchSource === 'yyyp'"
          title="刷新列表"
        />
        <el-button
          :type="isFavorited ? 'warning' : 'default'"
          size="small"
          class="yyyp-favorite-btn yyyp-header-height-btn"
          :icon="isFavorited ? StarFilled : Star"
          circle
          :class="{ 'is-favorited': isFavorited }"
          :loading="favoriteLoading"
          @click.stop="toggleFavorite"
          :title="isFavorited ? '取消收藏' : '添加到收藏'"
        />
        <el-button
          v-if="isMultiSelectMode"
          type="info"
          size="small"
          class="yyyp-header-height-btn"
          @click.stop="selectAllCommodities('yyyp')"
        >
          全选
        </el-button>
        <el-button
          :type="isMultiSelectMode ? 'warning' : 'info'"
          size="small"
          class="yyyp-header-height-btn yyyp-multi-select-toggle-btn"
          :disabled="yyypFilterType === 'on_lease'"
          @click.stop="toggleMultiSelectMode"
        >
          {{ yyypFilterType === 'on_lease' ? '批量借入' : (isMultiSelectMode ? '取消多选' : '多选') }}
        </el-button>
      </div>
    </div>

    <!-- 悠悠有品卡片模式 -->
    <div
      v-show="showYYYPTable"
      class="commodity-card-grid yyyp-scroll-container"
      v-loading="isSearching && searchSource === 'yyyp'"
      element-loading-text="加载中..."
      element-loading-background="rgba(0, 0, 0, 0.8)"
      @scroll="handleYYYPScroll"
    >
      <div
        v-for="(item, index) in yyypCommodities"
        :key="index"
        class="commodity-card"
        :class="{
          'selected': isCommoditySelected(item),
          'multi-select-mode': isMultiSelectMode
        }"
        @click="handleCommodityCardClick(item, 'yyyp', $event)"
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
              :title="sticker.Name || '印花'"
            >
              <img
                v-if="sticker.TemplateHashName"
                :src="getWeaponImage(sticker.TemplateHashName)"
                :alt="sticker.Name"
                class="sticker-img-overlay"
                @error="(e) => e.target.style.display = 'none'"
              />
              <img
                v-else-if="sticker.ImgUrl"
                :src="sticker.ImgUrl"
                :alt="sticker.Name"
                class="sticker-img-overlay"
                @error="(e) => e.target.style.display = 'none'"
              />
              <div v-else class="sticker-placeholder-overlay">?</div>
            </div>
          </div>
          <!-- 挂件覆盖层 - 右上角 -->
          <div v-if="item.pendants && item.pendants.length > 0" class="pendant-overlay">
            <div
              v-for="(pendant, pIdx) in item.pendants"
              :key="pIdx"
              class="pendant-item-overlay"
              :title="pendant.pendantSourceName || pendant.name || '挂件'"
            >
              <img
                v-if="pendant.steamHashName"
                :src="getWeaponImage(pendant.steamHashName)"
                :alt="pendant.name"
                class="pendant-img-overlay"
                @error="(e) => e.target.style.display = 'none'"
              />
              <img
                v-else-if="pendant.imgUrl"
                :src="pendant.imgUrl"
                :alt="pendant.name"
                class="pendant-img-overlay"
                @error="(e) => e.target.style.display = 'none'"
              />
              <div v-else class="pendant-placeholder-overlay">🎗️</div>
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
            <!-- 价格/租金显示 -->
            <div class="info-item" v-if="!item.isLeaseItem && !item.isPurchaseOrder">
              <span class="info-label">价格:</span>
              <span class="info-value price-highlight">¥{{ item.price }}</span>
            </div>
            <!-- 求购信息显示 -->
            <div class="info-item" v-if="item.isPurchaseOrder && item.purchasePrice">
              <span class="info-label">求购价:</span>
              <span class="info-value price-highlight">¥{{ item.purchasePrice }}</span>
            </div>
            <div class="info-item" v-if="item.isPurchaseOrder && item.surplusQuantity">
              <span class="info-label">求购数量:</span>
              <span class="info-value price-highlight">{{ item.surplusQuantity }}</span>
            </div>
            <!-- 租赁信息显示 -->
            <div class="info-item" v-if="item.isLeaseItem && item.leaseUnitPrice">
              <span class="info-label">租金:</span>
              <span class="info-value price-highlight">¥{{ item.leaseUnitPrice }}/天</span>
            </div>
            <div class="info-item" v-if="item.isLeaseItem && item.leaseDeposit">
              <span class="info-label">押金:</span>
              <span class="info-value">¥{{ item.leaseDeposit }}</span>
            </div>
            <div class="info-item" v-if="item.isLeaseItem && item.leaseDayDesc">
              <span class="info-label">租期:</span>
              <span class="info-value">{{ item.leaseDayDesc }}</span>
            </div>
            <!-- 模板信息 -->
            <div class="info-item" v-if="item.paintSeed">
              <span class="info-label">模板:</span>
              <span class="info-value">{{ item.paintSeed }}</span>
            </div>
            <div class="info-item" v-if="item.haveNameTag === 1">
              <span class="info-label">改名:</span>
              <div v-if="item.nameTagText" class="info-value nametag-text" :title="item.nameTagText">
                {{ item.nameTagText }}
              </div>
              <span
                v-else
                @click.stop="fetchSingleNameTag(item)"
                class="info-value nametag-parse"
                :style="{ opacity: item.nameTagLoading ? 0.5 : 1 }"
                :title="item.nameTagLoading ? '加载中...' : '点击解析改名'"
              >
                🏷️ 解析名称
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ item.isPurchaseOrder ? '买家:' : '卖家:' }}</span>
              <span class="info-value">{{ item.userName || item.userNickName || '-' }}</span>
            </div>
          </div>
          <!-- 印花/挂件价值 -->
          <div class="sticker-value-info" v-if="(item.stickers && item.stickers.length > 0) || (item.pendants && item.pendants.length > 0)">
            <div class="sticker-value-item" v-if="item.stickerTotalValue !== undefined">
              <span class="sticker-value-label">印花价值:</span>
              <span class="sticker-value-amount">¥{{ item.stickerTotalValue || '0.00' }}</span>
            </div>
            <div class="sticker-value-item" v-if="item.pendantTotalValue !== undefined">
              <span class="sticker-value-label">挂件价值:</span>
              <span class="sticker-value-amount">¥{{ item.pendantTotalValue || '0.00' }}</span>
            </div>
            <div class="sticker-value-loading" v-if="item.priceLoading">
              <span>价格查询中...</span>
            </div>
          </div>
          <!-- 购买/租用/供应按钮 -->
          <el-button
            v-if="!isMultiSelectMode"
            :type="getButtonType(item)"
            size="small"
            class="card-buy-button"
            :disabled="item.isLeaseItem || yyypFilterType === 'on_lease'"
            @click.stop="handleBuyCommodityWithPresale(item)"
          >
            {{ getButtonText(item) }}
          </el-button>
        </div>
      </div>
      <!-- 加载更多提示 -->
      <div class="load-more-indicator" v-if="yyypCommodities.length > 0">
        <div v-if="yyypLoadingMore" class="loading-more">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else-if="!yyypHasMore" class="no-more-data">
          <span>没有更多数据了</span>
        </div>
        <div v-else class="scroll-hint">
          <span>下拉加载更多</span>
        </div>
      </div>
    </div>

    <!-- 价格走势对话框 -->
    <el-dialog
      v-model="priceTrendDialogVisible"
      :title="`价格走势 - ${yyypCurrentWeapon?.market_listing_item_name || ''}`"
      width="800px"
      :close-on-click-modal="false"
      class="yyyp-price-trend-dialog"
    >
      <!-- 天数选择器 -->
      <div class="price-trend-header">
        <el-radio-group v-model="selectedDays" size="small" @change="loadPriceTrend">
          <el-radio-button :label="7">7天</el-radio-button>
          <el-radio-button :label="30">30天</el-radio-button>
          <el-radio-button :label="90">90天</el-radio-button>
          <el-radio-button :label="180">180天</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 图表容器 -->
      <div
        v-loading="priceTrendLoading"
        element-loading-text="加载中..."
        class="price-trend-chart-container"
      >
        <div ref="priceTrendChart" class="price-trend-chart"></div>
      </div>

      <!-- 统计信息 -->
      <div v-if="priceTrendData" class="price-trend-stats">
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="最高价">¥{{ priceStats.maxPrice }}</el-descriptions-item>
          <el-descriptions-item label="最低价">¥{{ priceStats.minPrice }}</el-descriptions-item>
          <el-descriptions-item label="平均价">¥{{ priceStats.avgPrice }}</el-descriptions-item>
          <el-descriptions-item label="数据点数">{{ priceStats.count }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="priceTrendDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 高级筛选对话框 -->
    <el-dialog
      v-model="filterDialogVisible"
      title="筛选"
      width="400px"
      :close-on-click-modal="false"
      class="yyyp-filter-dialog"
    >
      <el-form label-position="left" label-width="100px">
        <template v-for="filter in visibleFilters" :key="filter.FilterKey || filter.filterKey">
          <!-- 磨损区间：与表头下拉一致 + 自定义 xx-xx 输入 -->
          <el-form-item
            v-if="(filter.FilterKey || filter.filterKey) === 'abrade' && filter.Items && filter.Items.length > 0"
            label="磨损区间"
          >
            <el-select
              :model-value="filterFormByKey['abrade']"
              placeholder="请选择"
              clearable
              style="width: 100%"
              @update:model-value="(v) => (filterFormByKey['abrade'] = v)"
            >
              <el-option
                v-for="item in filter.Items"
                :key="getAbradeOptionValue(item) || item.Name"
                :label="item.Name || item.name || item.SimpleName || '不限'"
                :value="getAbradeOptionValue(item)"
              />
              <el-option label="自定义" value="custom" />
            </el-select>
            <div v-if="filterFormByKey['abrade'] === 'custom'" class="abrade-custom-inputs">
              <el-input
                v-model="abradeCustomMin"
                placeholder="最小"
                clearable
                style="width: 100px"
              />
              <span class="abrade-sep">-</span>
              <el-input
                v-model="abradeCustomMax"
                placeholder="最大"
                clearable
                style="width: 100px"
              />
            </div>
          </el-form-item>
          <!-- 有 Items/NodeItems 的下拉（名称标签、印花搜枪、挂件等，排除 abrade；印花搜枪用 NodeItems 的 Name 填入） -->
          <el-form-item
            v-else-if="(filter.Items && filter.Items.length > 0) || getFilterSelectOptions(filter).length > 0"
            :label="filter.Name || filter.name || filter.FilterKey"
          >
            <el-select
              :model-value="filterFormByKey[filter.FilterKey || filter.filterKey]"
              placeholder="请选择"
              clearable
              style="width: 100%"
              @update:model-value="(v) => (filterFormByKey[filter.FilterKey || filter.filterKey] = v)"
            >
              <el-option
                v-for="opt in getFilterSelectOptions(filter)"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <!-- 默认：单行输入（如图案模板 paintSeed 等） -->
          <el-form-item v-else :label="filter.Name || filter.name || filter.FilterKey">
            <el-input
              :model-value="filterFormByKey[filter.FilterKey || filter.filterKey]"
              :placeholder="filter.SubName || '请输入'"
              clearable
              @update:model-value="(v) => (filterFormByKey[filter.FilterKey || filter.filterKey] = v)"
            />
          </el-form-item>
        </template>
        <el-empty v-if="visibleFilters.length === 0" description="暂无筛选项（请先加载在售列表）" />
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleResetFilter">重置</el-button>
          <el-button type="primary" @click="handleApplyFilter">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 预售购买对话框 -->
    <el-dialog
      v-model="presaleBuyDialogVisible"
      title="购买预售商品"
      width="600px"
      :close-on-click-modal="false"
      class="yyyp-presale-buy-dialog"
    >
      <div v-loading="presaleDetailLoading" class="presale-buy-content">
        <div v-if="presaleDetail && presaleDetail.commodity" class="presale-detail">
          <!-- 商品信息 -->
          <div class="commodity-info-section">
            <div class="commodity-image-large">
              <img
                v-if="presaleDetail.commodity.templateInfo?.iconUrlLarge"
                :src="presaleDetail.commodity.templateInfo.iconUrlLarge"
                :alt="presaleDetail.commodity.commodityName"
                style="max-width: 100%; max-height: 200px;"
              />
            </div>
            <div class="commodity-info-details">
              <h3>{{ presaleDetail.commodity.commodityName }}</h3>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="价格">
                  <span style="color: var(--accent-red-light); font-size: 18px; font-weight: bold;">
                    {{ presaleDetail.commodity.sellPrice }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="定金" v-if="presaleDetail.commodity.commodityPreSaleDTO">
                  <span style="color: var(--accent-orange); font-size: 16px; font-weight: bold;">
                    ¥{{ presaleDetail.commodity.commodityPreSaleDTO.depositAmount }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="品质">
                  <span :style="{ color: '#' + presaleDetail.commodity.templateInfo?.qualityColor }">
                    {{ presaleDetail.commodity.templateInfo?.qualityName }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="稀有度">
                  <span :style="{ color: '#' + presaleDetail.commodity.templateInfo?.rarityColor }">
                    {{ presaleDetail.commodity.templateInfo?.rarityName }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <!-- 预售信息 -->
          <div v-if="presaleDetail.commodity.commodityPreSaleDTO" class="presale-info-section">
            <el-alert
              title="预售说明"
              type="warning"
              :closable="false"
              style="margin-bottom: 15px;"
            >
              <div style="line-height: 1.8; white-space: pre-wrap;">{{ presaleDetail.preSaleBuyDesc || '1. 等待冷却结束期间取消订单会产生违约费用\n2. 预售交易模式采用买家自动接收报价\n3. 冷却结束后由卖家发起报价，买家接收报价\n4. 冷却结束后进入收发货流程，将无法取消订单' }}</div>
            </el-alert>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="未发货赔付">
                <span style="color: var(--accent-green); font-weight: bold;">
                  ¥{{ presaleDetail.commodity.commodityPreSaleDTO.buyerCompensationAmount }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="不收货惩罚">
                <span style="color: var(--accent-red-light); font-weight: bold;">
                  ¥{{ presaleDetail.commodity.commodityPreSaleDTO.buyerLiquidatedDamagesAmount }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="冷却结束时间">
                {{ formatTimestamp(presaleDetail.commodity.commodityPreSaleDTO.preSaleEndTime) }}
              </el-descriptions-item>
              <el-descriptions-item label="发送报价截止时间" :span="2">
                {{ formatTimestamp(presaleDetail.commodity.commodityPreSaleDTO.sendOfferEndTime) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- 支付方式 -->
          <div class="payment-section">
            <div class="payment-info" v-if="filteredPayList.length > 0">
              <span style="font-size: 16px; font-weight: 600; margin-right: 20px;">支付方式</span>
              <img
                :src="filteredPayList[0].channelLogo"
                :alt="filteredPayList[0].channelName"
                style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;"
              />
              <span style="font-size: 14px;">{{ filteredPayList[0].channelName }}</span>
              <span v-if="filteredPayList[0].balance" style="color: var(--accent-green); margin-left: 10px; font-weight: bold;">
                ¥{{ filteredPayList[0].balance }}
              </span>
            </div>
          </div>

          <!-- 购买选项 -->
          <div class="buy-options-section">
            <el-checkbox v-model="presaleBuyForm.autoConfirmPayment">
              自动确认支付
            </el-checkbox>
            <el-checkbox v-model="presaleBuyForm.pollPayment">
              轮询支付状态
            </el-checkbox>
          </div>
        </div>

        <div v-else-if="!presaleDetailLoading" class="no-detail-section">
          <el-empty description="无法加载预售详情" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="presaleBuyDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="buyingPresale"
            :disabled="!presaleDetail || presaleDetailLoading || !isPresaleBalanceSufficient"
            @click="confirmPresaleBuy"
          >
            {{ isPresaleBalanceSufficient ? '确认购买' : '余额不足' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 发布求购对话框（与 on_sale 页面模板一致，组件复制于 ItemSearch/youpin/PublishWantedDialog.vue） -->
    <PublishWantedDialog
      :visible="wantedDialogVisible"
      :template-data="wantedTemplateInfo"
      :purchase-balance="wantedBalance"
      :balance-loading="wantedBalanceLoading"
      @update:visible="wantedDialogVisible = $event"
      @submit="handlePublishWantedSubmit"
      @transfer-in="openTransferIn"
    />
    <!-- 从钱包转入求购余额 -->
    <TransferInDialog
      v-model:visible="transferInDialogVisible"
      :available-yuan="transferInAvailableYuan"
      @confirm="handleTransferInConfirm"
    />

    <!-- 在售购买对话框 -->
    <el-dialog
      v-model="onSaleBuyDialogVisible"
      title="确认购买"
      width="600px"
      :close-on-click-modal="false"
      class="yyyp-onsale-buy-dialog"
      @close="cancelOnSaleOrder"
    >
      <div v-loading="onSaleDetailLoading" class="onsale-buy-content">
        <div v-if="onSaleDetail && onSaleDetail.commodity" class="onsale-detail">
          <!-- 商品信息 -->
          <div class="commodity-info-section">
            <div class="commodity-image-large">
              <img
                v-if="onSaleDetail.commodity.templateInfo?.iconUrlLarge"
                :src="onSaleDetail.commodity.templateInfo.iconUrlLarge"
                :alt="onSaleDetail.commodity.commodityName"
                style="max-width: 100%; max-height: 200px;"
              />
            </div>
            <div class="commodity-info-details">
              <h3>{{ onSaleDetail.commodity.commodityName }}</h3>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="价格">
                  <span style="color: var(--accent-red-light); font-size: 18px; font-weight: bold;">
                    ¥{{ onSaleDetail.commodity.sellPrice }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="品质">
                  <span :style="{ color: '#' + onSaleDetail.commodity.templateInfo?.qualityColor }">
                    {{ onSaleDetail.commodity.templateInfo?.qualityName }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="稀有度">
                  <span :style="{ color: '#' + onSaleDetail.commodity.templateInfo?.rarityColor }">
                    {{ onSaleDetail.commodity.templateInfo?.rarityName }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <!-- 订单和余额信息 -->
          <div class="payment-section" style="margin-top: 12px;">
            <!-- 创建订单中 -->
            <div v-if="onSaleOrderLoading" style="text-align: center; padding: 8px 0; color: var(--text-secondary); font-size: 13px;">
              <el-icon class="is-loading"><Loading /></el-icon> 正在创建订单并查询余额...
            </div>

            <!-- 订单和余额信息 -->
            <template v-else-if="onSaleOrderNo">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="订单号">
                  <span style="color: var(--text-secondary);">{{ onSaleOrderNo }}</span>
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
              <div
                v-if="onSaleBalanceInsufficient"
                style="margin-top: 8px; padding: 8px 12px; background: rgba(245,108,108,0.1); border: 1px solid rgba(245,108,108,0.3); border-radius: 4px; color: var(--text-secondary); font-size: 13px;"
              >
                余额不足，无法完成支付
              </div>
            </template>

            <!-- 创建订单失败 -->
            <div
              v-else-if="onSaleOrderError"
              style="margin-top: 8px; padding: 8px 12px; background: rgba(245,108,108,0.1); border: 1px solid rgba(245,108,108,0.3); border-radius: 4px; color: var(--text-secondary); font-size: 13px;"
            >
              {{ onSaleOrderError }}
            </div>
          </div>
        </div>

        <div v-else-if="!onSaleDetailLoading" class="no-detail-section">
          <el-empty description="无法加载商品详情" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelOnSaleOrder">取消订单</el-button>
          <el-button
            type="primary"
            :loading="buyingOnSale"
            :disabled="!onSaleDetail || onSaleDetailLoading || onSaleOrderLoading || !onSaleOrderNo || onSaleBalanceInsufficient"
            @click="confirmOnSalePayment"
          >
            支付订单
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { CaretRight, CaretBottom, Check, Loading, Refresh, Star, StarFilled, ShoppingCart } from '@element-plus/icons-vue'
import { useYYYPCommodityList } from './useYYYPCommodityList.js'
import PublishWantedDialog from './PublishWantedDialog.vue'
import TransferInDialog from './TransferInDialog.vue'

const props = defineProps({
  showYYYPList: Boolean,
  showYYYPTable: Boolean,
  isSearching: Boolean,
  searchSource: String,
  isMultiSelectMode: Boolean,
  yyypCurrentWeapon: Object,
  yyypCommodities: Array,
  yyypTotalCount: Number,
  yyypLoadingMore: Boolean,
  yyypHasMore: Boolean,
  yyypFilterType: String,
  yyypListConfig: Object,
  yyypSortTypeKey: String,
  yyypWearRange: String,
  yyypExterior: String,
  yyypEffectiveTemplateId: [String, Number],
  yyypHasFilterActive: Boolean,
  selectedSteamId: String
})

const emit = defineEmits([
  'toggle-yyyp-list',
  'refresh-yyyp',
  'toggle-multi-select',
  'select-all',
  'commodity-click',
  'yyyp-scroll',
  'buy-commodity',
  'fetch-single-nametag',
  'filter-change',
  'advanced-filter',
  'sort-change',
  'wear-range-change',
  'exterior-change',
  'template-info-config',
  'reset-yyyp-filter'
])

const {
  sortOptions,
  wearRangeOptions,
  currentSortKey,
  currentWearRange,
  handleSortChange,
  handleWearRangeChange,
  exteriorOptions,
  currentExterior,
  handleExteriorChange,
  headerTagOptions,
  headerTagCurrentValue,
  handleHeaderTagChange,
  handleResetYYYPFilter,

  filterDialogVisible,
  visibleFilters,
  filterFormByKey,
  getFilterItemValue,
  getFilterSelectOptions,
  getAbradeOptionValue,
  abradeCustomMin,
  abradeCustomMax,
  handleFilterChange,
  handleAdvancedFilter,
  handleResetFilter,
  handleApplyFilter,

  priceTrendDialogVisible,
  selectedDays,
  priceTrendData,
  priceTrendLoading,
  priceTrendChart,
  priceStats,
  handleOpenPriceTrend,
  loadPriceTrend,

  toggleYYYPList,
  handleRefreshYYYP,
  toggleMultiSelectMode,
  selectAllCommodities,
  handleCommodityCardClick,
  handleYYYPScroll,
  fetchSingleNameTag,
  handleImageError,
  getButtonText,
  getButtonType,

  isCommoditySelected,
  getWeaponImage,

  presaleBuyDialogVisible,
  presaleDetail,
  presaleDetailLoading,
  buyingPresale,
  presaleBuyForm,
  filteredPayList,
  isPresaleBalanceSufficient,
  formatTimestamp,
  confirmPresaleBuy,

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
  handleBuyCommodityWithPresale,
  cancelOnSaleOrder,
  confirmOnSalePayment,

  isFavorited,
  favoriteLoading,
  toggleFavorite,

  wantedDialogVisible,
  wantedTemplateInfo,
  wantedBalance,
  wantedBalanceLoading,
  submittingWanted,
  handleOpenWantedDialog,
  handlePublishWantedSubmit,
  transferInDialogVisible,
  transferInAvailableYuan,
  openTransferIn,
  handleTransferInConfirm
} = useYYYPCommodityList(props, emit)
</script>

<style scoped src="./yyyp-commodity-list.css"></style>
