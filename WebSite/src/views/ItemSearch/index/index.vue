<template>
  <div class="item-search-container">
    <!-- 搜索区域 - 固定在顶部 -->
    <div class="search-wrapper top-left">
      <div class="card search-card">
        <div class="search-section">
          <div class="search-controls compact">
            <el-select 
              v-model="selectedSteamId" 
              placeholder="选择Steam账号" 
              class="steam-id-select"
              @change="handleSteamIdChange"
              filterable
            >
              <el-option
                v-for="item in steamIdList"
                :key="item.dataID"
                :label="`${item.dataName} (${item.steamID}) - ${item.item_count}件`"
                :value="item.steamID"
              >
                <span style="float: left">{{ item.dataName }} ({{ item.steamID }})</span>
                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                  {{ item.item_count }}件
                </span>
              </el-option>
            </el-select>
            
            <el-select 
              v-model="selectedExterior" 
              placeholder="筛选外观" 
              class="exterior-select"
              clearable
              @change="handleExteriorChange"
            >
              <el-option label="全部外观" value="" />
              <el-option label="崭新出厂" value="崭新出厂">
                <span :style="{ color: 'var(--accent-green)' }">崭新出厂</span>
              </el-option>
              <el-option label="略有磨损" value="略有磨损">
                <span :style="{ color: '#8bc34a' }">略有磨损</span>
              </el-option>
              <el-option label="久经沙场" value="久经沙场">
                <span :style="{ color: '#ffc107' }">久经沙场</span>
              </el-option>
              <el-option label="破损不堪" value="破损不堪">
                <span :style="{ color: '#ff9800' }">破损不堪</span>
              </el-option>
              <el-option label="战痕累累" value="战痕累累">
                <span :style="{ color: '#f44336' }">战痕累累</span>
              </el-option>
            </el-select>
            
            <el-select 
              v-model="selectedStatTrak" 
              placeholder="StatTrak™" 
              class="stattrak-select"
              @change="handleStatTrakChange"
            >
              <el-option label="非StatTrak™" value="normal">
                <span>非StatTrak™</span>
              </el-option>
              <el-option label="StatTrak™" value="stattrak">
                <span :style="{ color: '#cf6a32' }">StatTrak™</span>
              </el-option>
              <el-option label="全部" value="" />
            </el-select>
            
            <el-input
              v-model="searchKeyword"
              placeholder="搜索饰品名称..."
              prefix-icon="Search"
              class="search-input"
              @keyup.enter="handleSearchWeapon"
              clearable
            />
            
            <div class="button-group">
              <el-button type="primary" @click="handleSearchWeapon" :loading="isSearching && searchSource === 'weapon'">
                搜索武器
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果表格 -->
    <div class="card table-card" v-if="searchResults.length > 0">
      <!-- 折叠/展开控制（始终显示） -->
      <div class="collapse-header" @click.stop="toggleSearchResults">
        <span class="collapse-title">
          <el-icon><CaretRight v-if="!showSearchResults" /><CaretBottom v-if="showSearchResults" /></el-icon>
          搜索结果 ({{ searchResults.length }} 件)
          <span v-if="currentViewingWeaponName" class="current-weapon-in-results">
            当前饰品：{{ currentViewingWeaponName }}
          </span>
          <span
            v-if="headerStatisticValue != null"
            class="csqaq-statistic-in-results"
            @click.stop="openStatisticFromHeader"
          >
            存世量：{{ headerStatisticValue }}
          </span>
        </span>
        <div class="header-actions">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredResults.length"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            small
            style="margin-right: 15px;"
            @click.stop
          />
          <el-button-group style="margin-right: 10px;">
            <el-button 
              :type="displayMode === 'list' ? 'primary' : ''" 
              @click.stop="displayMode = 'list'"
              size="small"
            >
              列表
            </el-button>
            <el-button 
              :type="displayMode === 'card' ? 'primary' : ''" 
              @click.stop="displayMode = 'card'"
              size="small"
            >
              卡片
            </el-button>
          </el-button-group>
          <el-button 
            type="primary" 
            size="small" 
            :icon="Refresh" 
            @click.stop="handleRefreshSearch"
            :loading="isSearching && searchSource === 'weapon'"
          >
            刷新列表
          </el-button>
        </div>
      </div>
      
      <!-- 列表模式 -->
      <el-table 
        v-show="showSearchResults && displayMode === 'list'" 
        :data="paginatedResults" 
        style="width: 100%"
        :default-sort="{ prop: 'name', order: 'ascending' }"
        v-loading="isSearching"
        element-loading-text="搜索中..."
        element-loading-background="rgba(0, 0, 0, 0.8)"
      >
        <el-table-column type="index" label="#" width="60" align="center" />
        
        <el-table-column label="图片" width="120" align="center">
          <template #default="{ row }">
            <div class="weapon-image-cell">
              <img
                v-if="getWeaponImage(row.steam_hash_name)"
                :src="getWeaponImage(row.steam_hash_name)"
                :alt="row.item_name"
                class="weapon-img"
                @error="(e) => handleImageError(e, row.steam_hash_name)"
              />
              <span v-else class="no-image">无图</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="饰品名称" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <el-popover
              :visible="activePopoverRow === row"
              placement="bottom"
              :width="200"
              trigger="click"
            >
              <template #reference>
                <span class="clickable-item-name" @click="togglePopover(row)">
                  {{ row.market_listing_item_name }}
                </span>
              </template>
              <div class="search-platform-selector">
                <div class="selector-buttons">
                  <el-button
                    type="warning"
                    size="small"
                    @click="selectPlatform(row, 'yyyp')"
                    :loading="isSearching && searchSource === 'yyyp'"
                  >
                    悠悠有品
                  </el-button>
                  <el-button
                    type="info"
                    size="small"
                    class="buff-button"
                    @click="selectPlatform(row, 'buff')"
                    :loading="isSearching && searchSource === 'buff'"
                  >
                    BUFF
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    class="csfloat-button"
                    @click="selectPlatform(row, 'csfloat')"
                    :loading="isSearching && searchSource === 'csfloat'"
                  >
                    CsFloat
                  </el-button>
                  <el-button
                    type="primary"
                    size="small"
                    class="all-button"
                    @click="selectPlatform(row, 'all')"
                    :loading="isSearching && searchSource === 'all'"
                  >
                    全部搜索
                  </el-button>
                </div>
                <div class="selector-divider"></div>
                <div class="selector-buttons">
                  <el-button
                    type="primary"
                    size="small"
                    @click="openCSQAQ(row)"
                  >
                    CSQAQ
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    @click="openSteamDT(row)"
                  >
                    SteamDT
                  </el-button>
                </div>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        
        <el-table-column label="Steam Hash Name" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="hash-name-text">{{ row.steam_hash_name || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="weapon_type" label="武器类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.weapon_type || '-' }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="item_name" label="皮肤名称" width="180" align="center" show-overflow-tooltip />
        
        <el-table-column prop="Rarity" label="稀有度" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.Rarity" class="rarity-text" :style="{ color: getRarityColor(row.Rarity) }">
              {{ row.Rarity }}
            </span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="yyyp_id" label="悠悠有品ID" width="120" align="center">
          <template #default="{ row }">
            <span class="id-text">{{ row.yyyp_id || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="buff_id" label="BUFF ID" width="100" align="center">
          <template #default="{ row }">
            <span class="id-text">{{ row.buff_id || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="第三方网站" width="120" align="center">
          <template #default="{ row }">
            <div class="third-party-links">
              <el-button
                type="primary"
                size="small"
                @click.stop="openCSQAQ(row)"
              >
                CSQAQ
              </el-button>
              <el-button
                type="success"
                size="small"
                @click.stop="openSteamDT(row)"
              >
                SteamDT
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 卡片模式 -->
      <div v-show="showSearchResults && displayMode === 'card'" class="card-grid-container">
        <div class="card-grid">
          <div
            v-for="item in paginatedResults"
            :key="item.market_listing_item_name"
            class="search-result-card"
            @click="handleCardClick(item, $event)"
          >
              <div class="card-image">
                <!-- 左上角标签 -->
                <div class="card-badges">
                  <el-tag v-if="extractFloatRangeFromName(item.market_listing_item_name)" size="small" class="badge-item" :style="{ color: getFloatRangeColor(extractFloatRangeFromName(item.market_listing_item_name)) + ' !important', backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: getFloatRangeColor(extractFloatRangeFromName(item.market_listing_item_name)) }">
                    {{ extractFloatRangeFromName(item.market_listing_item_name) }}
                  </el-tag>
                  <el-tag v-if="item.Rarity" size="small" class="badge-item" :style="{ color: getRarityColor(item.Rarity) + ' !important', backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: getRarityColor(item.Rarity) }">
                    {{ item.Rarity }}
                  </el-tag>
                  <el-tag v-if="item.market_listing_item_name && item.market_listing_item_name.includes('纪念品')" size="small" class="badge-item souvenir-badge" :style="{ color: '#FFD700 !important', backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: '#FFD700' }">
                    纪念品
                  </el-tag>
                  <el-tag v-if="item.market_listing_item_name && (item.market_listing_item_name.includes('StatTrak™') || item.market_listing_item_name.includes('（StatTrak™）'))" size="small" class="badge-item stattrak-badge" :style="{ color: '#CF6A32 !important', backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: '#CF6A32' }">
                    ST
                  </el-tag>
                </div>
                
                <img
                  v-if="getWeaponImage(item.steam_hash_name)"
                  :src="getWeaponImage(item.steam_hash_name)"
                  :alt="item.item_name"
                  class="weapon-card-img"
                  @error="(e) => handleImageError(e, item.steam_hash_name)"
                />
                <div v-else class="image-placeholder">
                  <span>无图片</span>
                </div>
              </div>
              <div class="card-content">
                <div class="card-title" :title="item.market_listing_item_name">
                  {{ item.market_listing_item_name }}
                </div>
                <div class="card-info">
                  <div class="info-row" v-if="extractFloatRangeFromName(item.market_listing_item_name)">
                    <span class="info-label">磨损:</span>
                    <span class="float-range-text" :style="`color: ${getFloatRangeColor(extractFloatRangeFromName(item.market_listing_item_name))} !important; font-weight: 600 !important;`">
                      {{ extractFloatRangeFromName(item.market_listing_item_name) }}
                    </span>
                  </div>
                  <div class="info-row" v-if="item.Rarity">
                    <span class="info-label">稀有度:</span>
                    <span class="rarity-text" :style="`color: ${getRarityColor(item.Rarity)} !important; font-weight: 600 !important;`">
                      {{ item.Rarity }}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">类型:</span>
                    <span>{{ item.weapon_type || '-' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">悠悠ID:</span>
                    <span>{{ item.yyyp_id || '-' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">BUFF ID:</span>
                    <span>{{ item.buff_id || '-' }}</span>
                  </div>
                </div>
                <!-- 第三方网站按钮 -->
                <div class="card-actions">
                  <el-button
                    type="primary"
                    size="small"
                    @click.stop="openCSQAQ(item)"
                  >
                    CSQAQ
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    @click.stop="openSteamDT(item)"
                  >
                    SteamDT
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- 悠悠有品商品列表 -->
    <YYYPCommodityList
      :showYYYPList="showYYYPList"
      :showYYYPTable="showYYYPTable"
      :isSearching="isSearching"
      :searchSource="searchSource"
      :isMultiSelectMode="isMultiSelectMode"
      :yyypCurrentWeapon="yyypCurrentWeapon"
      :yyypCommodities="yyypCommodities"
      :yyypTotalCount="yyypTotalCount"
      :yyypLoadingMore="yyypLoadingMore"
      :yyypHasMore="yyypHasMore"
      :yyypFilterType="yyypFilterType"
      :yyypListConfig="yyypListConfig"
      :yyypSortTypeKey="yyypSortTypeKey"
      :yyypWearRange="yyypWearRange"
      :yyypExterior="yyypExterior"
      :yyypEffectiveTemplateId="yyypEffectiveTemplateId"
      :yyypHasFilterActive="yyypHasFilterActive"
      :selectedSteamId="selectedSteamId"
      @toggle-yyyp-list="toggleYYYPList"
      @refresh-yyyp="handleRefreshYYYP"
      @toggle-multi-select="toggleMultiSelectMode"
      @select-all="selectAllCommodities"
      @commodity-click="({ item, type, event }) => handleCommodityCardClick(item, type, event)"
      @yyyp-scroll="handleYYYPScroll"
      @buy-commodity="handleBuyCommodity"
      @fetch-single-nametag="fetchSingleNameTag"
      @filter-change="handleYYYPFilterChange"
      @advanced-filter="handleYYYPAdvancedFilter"
      @sort-change="handleYYYPSortChange"
      @wear-range-change="handleYYYPWearRangeChange"
      @exterior-change="handleYYYPExteriorChange"
      @template-info-config="handleTemplateInfoConfig"
      @reset-yyyp-filter="handleResetYYYPFilter"
    />

    <!-- BUFF商品列表 -->
    <BuffCommodityList
      :showBuffList="showBuffList"
      :showBuffTable="showBuffTable"
      :isSearching="isSearching"
      :searchSource="searchSource"
      :isMultiSelectMode="isMultiSelectMode"
      :buffCurrentWeapon="buffCurrentWeapon"
      :buffCommodities="buffCommodities"
      :buffTotalCount="buffTotalCount"
      :buffBuyNum="buffBuyNum"
      :buffRentNum="buffRentNum"
      :buffLoadingMore="buffLoadingMore"
      :buffHasMore="buffHasMore"
      @toggle-buff-list="toggleBuffList"
      @refresh-buff="handleRefreshBuff"
      @toggle-multi-select="toggleMultiSelectMode"
      @select-all="selectAllCommodities"
      @commodity-click="({ item, type, event }) => handleCommodityCardClick(item, type, event)"
      @buff-scroll="handleBuffScroll"
      @buy-buff-commodity="handleBuyBuffCommodity"
    />

    <!-- CSQAQ 单件饰品图表（始终置于最下方） -->
    <ItemSearchCSQAQ
      :key="(chartWeapon && (chartWeapon.market_listing_item_name || chartWeapon.yyyp_id)) || 'none'"
      :chart-weapon="chartWeapon"
      :show-yyyp-list="showYYYPList"
      :show-buff-list="showBuffList"
      :statistic-dialog-trigger="statisticDialogTrigger"
      @statistic-loaded="headerStatisticValue = $event"
    />

    <!-- 多选模式下的操作栏 -->
    <div v-if="isMultiSelectMode && selectedCommodities.length > 0" class="multi-select-actions">
      <div class="selected-count">
        已选择 {{ selectedCommodities.length }} 件商品
        <span class="total-price">总价: ¥{{ selectedCommodities.reduce((sum, item) => sum + parseFloat(item.price || 0), 0).toFixed(2) }}</span>
      </div>
      <div class="action-buttons">
        <el-button type="success" @click="handleBatchBuy">批量购买</el-button>
        <el-button @click="clearCommoditySelection">清空选择</el-button>
      </div>
    </div>

    <!-- 无结果提示 -->
    <div v-if="searchResults.length === 0 && !isSearching && searchKeyword" class="card no-results-card">
      <el-empty description="未找到相关饰品" />
    </div>

    <!-- 卡片模式弹出框 -->
    <teleport to="body">
      <div 
        v-if="showCardPopover" 
        class="card-popover-overlay"
        @click="showCardPopover = false"
      >
        <div 
          class="card-popover-content"
          :style="{ 
            left: cardPopoverPosition.x + 'px', 
            top: cardPopoverPosition.y + 'px' 
          }"
          @click.stop
        >
          <div class="popover-buttons">
            <el-button 
              type="success" 
              size="small" 
              @click="selectPlatform(selectedCardItem, 'yyyp'); showCardPopover = false"
              :loading="isSearching && searchSource === 'yyyp'"
            >
              悠悠有品
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="selectPlatform(selectedCardItem, 'buff'); showCardPopover = false"
              :loading="isSearching && searchSource === 'buff'"
            >
              BUFF
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="selectPlatform(selectedCardItem, 'csfloat'); showCardPopover = false"
              :loading="isSearching && searchSource === 'csfloat'"
            >
              CsFloat
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="selectPlatform(selectedCardItem, 'all'); showCardPopover = false"
              :loading="isSearching && searchSource === 'all'"
            >
              全部搜索
            </el-button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 商品详情弹窗 -->
    <el-dialog
      v-model="commodityPreviewVisible"
      :title="commodityPreviewItem ? getCommodityTitle(commodityPreviewItem) : ''"
      width="800px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="commodity-preview-dialog"
    >
      <div v-if="commodityPreviewItem" class="commodity-preview-content">
        <div class="preview-main-layout">
          <!-- 左侧区域 -->
          <div class="preview-left-section">
            <!-- 图片区域 -->
            <div class="preview-image-section">
              <img :src="commodityPreviewItem.iconUrl" class="preview-image" @error="handleImageError" />
            </div>

            <!-- 磨损进度条 -->
            <div v-if="commodityPreviewItem.abrade" class="preview-float-section">
              <div class="preview-float-bar-container">
                <div class="float-bar">
                  <div class="float-segment fn"></div>
                  <div class="float-segment mw"></div>
                  <div class="float-segment ft"></div>
                  <div class="float-segment ww"></div>
                  <div class="float-segment bs"></div>
                  <div
                    class="float-pointer"
                    :style="{ left: `${parseFloat(commodityPreviewItem.abrade) * 100}%` }"
                  ></div>
                </div>
              </div>
              <div class="preview-float-value">{{ commodityPreviewItem.abrade }}</div>
              <div class="preview-float-range" v-if="getWearRange(commodityPreviewItem.abrade)">
                {{ getWearRange(commodityPreviewItem.abrade) }}
              </div>
            </div>

            <!-- 价格信息 -->
            <div class="preview-prices">
              <div class="preview-price-row">
                <div class="preview-price-item">
                  <span class="preview-price-label">价格:</span>
                  <span class="preview-price-value price-highlight">¥{{ commodityPreviewItem.price }}</span>
                </div>
                <div class="preview-price-item" v-if="commodityPreviewItem.paintSeed">
                  <span class="preview-price-label">模板:</span>
                  <span class="preview-price-value">#{{ commodityPreviewItem.paintSeed }}</span>
                </div>
              </div>
              <!-- 卖家信息 - 通用显示 -->
              <div class="preview-price-row">
                <div class="preview-price-item">
                  <span class="preview-price-label">卖家:</span>
                  <span class="preview-price-value">{{ commodityPreviewItem.userNickName || commodityPreviewItem.sellerName || '-' }}</span>
                </div>
              </div>
              <!-- BUFF特有信息 -->
              <template v-if="commodityPreviewType === 'buff'">
                <div class="preview-price-row" v-if="commodityPreviewItem.description">
                  <div class="preview-price-item full-width">
                    <span class="preview-price-label">描述:</span>
                    <span class="preview-price-value">{{ commodityPreviewItem.description }}</span>
                  </div>
                </div>
              </template>
              <!-- 悠悠有品特有信息 -->
              <template v-if="commodityPreviewType === 'yyyp'">
                <div class="preview-price-row" v-if="commodityPreviewItem.haveNameTag === 1">
                  <div class="preview-price-item full-width">
                    <span class="preview-price-label">改名:</span>
                    <span class="preview-price-value nametag-text" v-if="commodityPreviewItem.nameTagText">
                      {{ commodityPreviewItem.nameTagText }}
                    </span>
                    <span 
                      v-else
                      @click="fetchSingleNameTag(commodityPreviewItem)"
                      class="preview-price-value nametag-parse"
                    >
                      🏷️ 点击解析
                    </span>
                  </div>
                  <!-- 购买/租用按钮 - 与改名同一行 -->
                  <el-button :type="getPreviewButtonType" :disabled="isPreviewButtonDisabled" class="preview-price-buy-btn" @click="handleBuyCommodityFromPreview">{{ getPreviewButtonText }}</el-button>
                </div>
              </template>

              <!-- 如果没有改名，购买/租用按钮单独一行 -->
              <div v-if="commodityPreviewType !== 'yyyp' || commodityPreviewItem.haveNameTag !== 1" class="preview-price-row">
                <el-button :type="getPreviewButtonType" :disabled="isPreviewButtonDisabled" class="preview-price-buy-btn-standalone" @click="handleBuyCommodityFromPreview">{{ getPreviewButtonText }}</el-button>
              </div>
            </div>
          </div>

          <!-- 右侧区域 - 印花和挂件列表（合并显示） -->
          <div class="preview-right-section">
            <!-- 印花和挂件合并列表 -->
            <div v-if="(commodityPreviewItem.stickers && commodityPreviewItem.stickers.length > 0) || (commodityPreviewItem.pendants && commodityPreviewItem.pendants.length > 0)" class="preview-sticker-list-section">
              <div class="preview-sticker-list">
                <!-- 印花列表 -->
                <div
                  v-for="(sticker, index) in commodityPreviewItem.stickers"
                  :key="'sticker-' + index"
                  class="preview-sticker-list-item"
                >
                  <div class="preview-sticker-list-img-wrapper" @click="showStickerPreview(sticker)">
                    <img
                      v-if="sticker.TemplateHashName"
                      :src="getWeaponImage(sticker.TemplateHashName)"
                      :alt="sticker.Name"
                      class="preview-sticker-list-img clickable"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <img
                      v-else-if="sticker.ImgUrl || sticker.img_url"
                      :src="sticker.ImgUrl || sticker.img_url"
                      :alt="sticker.Name || sticker.name"
                      class="preview-sticker-list-img clickable"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <div v-else class="preview-sticker-list-placeholder">?</div>
                  </div>
                  <div class="preview-sticker-list-info">
                    <div class="preview-sticker-list-name">{{ sticker.Name || sticker.name || '未知印花' }}</div>
                    <div class="preview-sticker-list-price" v-if="sticker.priceInfo">
                      <span v-if="sticker.priceInfo.yyyp_price" class="price-yyyp">
                        悠悠: ¥{{ sticker.priceInfo.yyyp_price }}
                      </span>
                      <span v-if="sticker.priceInfo.buff_price" class="price-buff">
                        BUFF: ¥{{ sticker.priceInfo.buff_price }}
                      </span>
                      <span v-if="!sticker.priceInfo.yyyp_price && !sticker.priceInfo.buff_price" class="price-none">
                        暂无价格
                      </span>
                    </div>
                    <div class="preview-sticker-list-price loading" v-else-if="sticker.priceLoading">
                      加载中...
                    </div>
                  </div>
                </div>
                <!-- 挂件列表 -->
                <div
                  v-for="(pendant, index) in commodityPreviewItem.pendants"
                  :key="'pendant-' + index"
                  class="preview-sticker-list-item pendant-item"
                >
                  <div class="preview-sticker-list-img-wrapper" @click="showPendantPreview(pendant)">
                    <img
                      v-if="pendant.steamHashName"
                      :src="getWeaponImage(pendant.steamHashName)"
                      :alt="pendant.name"
                      class="preview-sticker-list-img clickable"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <img
                      v-else-if="pendant.imgUrl"
                      :src="pendant.imgUrl"
                      :alt="pendant.name"
                      class="preview-sticker-list-img clickable"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <div v-else class="preview-sticker-list-placeholder">🎗️</div>
                  </div>
                  <div class="preview-sticker-list-info">
                    <div class="preview-sticker-list-name">{{ pendant.pendantSourceName || pendant.name || '挂件' }}</div>
                    <div class="preview-sticker-list-price" v-if="pendant.priceInfo">
                      <span v-if="pendant.priceInfo.yyyp_price" class="price-yyyp">
                        悠悠: ¥{{ pendant.priceInfo.yyyp_price }}
                      </span>
                      <span v-if="pendant.priceInfo.buff_price" class="price-buff">
                        BUFF: ¥{{ pendant.priceInfo.buff_price }}
                      </span>
                      <span v-if="!pendant.priceInfo.yyyp_price && !pendant.priceInfo.buff_price" class="price-none">
                        暂无价格
                      </span>
                    </div>
                    <div class="preview-sticker-list-price loading" v-else-if="pendant.priceLoading">
                      加载中...
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="preview-no-stickers">
              <span>无印花/挂件</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 印花/挂件放大预览弹窗 -->
    <el-dialog
      v-model="stickerPreviewVisible"
      :title="stickerPreviewData.name"
      width="500px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="sticker-preview-dialog"
    >
      <div class="sticker-preview-content">
        <div class="sticker-preview-image-wrapper">
          <img
            :src="stickerPreviewData.imageUrl"
            :alt="stickerPreviewData.name"
            class="sticker-preview-image"
            @error="handleImageError"
          />
        </div>
        <div class="sticker-preview-info">
          <div class="sticker-preview-name">{{ stickerPreviewData.name }}</div>
          <div class="sticker-preview-type">{{ stickerPreviewData.type }}</div>
        </div>
      </div>
    </el-dialog>

    <!-- 求购供应对话框 -->
    <el-dialog
      v-model="supplyDialogVisible"
      title="选择供应物品"
      width="900px"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
      class="supply-dialog"
    >
      <div class="supply-dialog-content" v-loading="supplyLoading">
        <!-- 求购订单信息 -->
        <div class="supply-order-info" v-if="currentPurchaseOrder">
          <div class="info-row">
            <span class="info-label">商品名称:</span>
            <span class="info-value">{{ currentPurchaseOrder.commodityName }}</span>
          </div>
          <div class="info-row compact-row">
            <span class="info-item">
              <span class="info-label">求购价格:</span>
              <span class="info-value price-highlight">¥{{ currentPurchaseOrder.purchasePrice }}</span>
            </span>
            <span class="info-item">
              <span class="info-label">最大供应数量:</span>
              <span class="info-value">{{ maxSupplyQuantity }} 件</span>
            </span>
          </div>
        </div>

        <!-- 可供应物品列表 -->
        <div class="supply-inventory-list">
          <div class="list-header">
            <div class="list-header-left">
              <span>可供应物品列表 ({{ supplyInventoryList.length }} 件)</span>
              <span class="selected-info" :class="{ 'max-reached': selectedSupplyItems.length >= maxSupplyQuantity }">
                已选中: {{ selectedSupplyItems.length }} / {{ maxSupplyQuantity }} 件
              </span>
            </div>
            <el-button
              size="small"
              :type="isAllSupplyItemsSelected ? 'primary' : 'default'"
              @click="selectAllSupplyItems"
            >
              {{ isAllSupplyItemsSelected ? '取消全选' : '全选' }}
            </el-button>
          </div>
          <div class="inventory-table-container">
            <table class="inventory-table">
              <tbody>
                <tr
                  v-for="item in supplyInventoryList"
                  :key="item.steamAssetId"
                  class="inventory-row"
                  :class="{ 'selected': isSupplyItemSelected(item) }"
                  @click="toggleSupplyItemSelection(item)"
                >
                  <!-- 物品图片 -->
                  <td class="col-image">
                    <div class="item-image-wrapper">
                      <img
                        :src="item.iconUrl"
                        :alt="item.commodityName"
                        class="item-image"
                        @error="handleImageError"
                      />
                    </div>
                  </td>

                  <!-- 物品名称和磨损 -->
                  <td class="col-name-and-wear">
                    <div class="name-wear-wrapper">
                      <div class="item-name">{{ item.commodityName }}</div>
                      <div v-if="item.abrade" class="wear-container">
                        <div class="float-bar-mini">
                          <div class="float-segment fn"></div>
                          <div class="float-segment mw"></div>
                          <div class="float-segment ft"></div>
                          <div class="float-segment ww"></div>
                          <div class="float-segment bs"></div>
                          <div
                            class="float-pointer"
                            :style="{ left: `${parseFloat(item.abrade) * 100}%` }"
                          ></div>
                        </div>
                        <span class="wear-value">{{ item.abrade }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- 印花/挂件 -->
                  <td class="col-accessories">
                    <div class="accessories-wrapper">
                      <!-- 有印花或挂件 -->
                      <div v-if="(item.stickerList && item.stickerList.length > 0) || (item.hasPendant && item.pendants && item.pendants.length > 0)" class="accessories-row">
                        <!-- 印花 -->
                        <template v-if="item.stickerList && item.stickerList.length > 0">
                          <div
                            v-for="(sticker, idx) in item.stickerList.slice(0, 4)"
                            :key="idx"
                            class="accessory-item"
                          >
                            <img
                              :src="getStickerImageUrl(sticker)"
                              :alt="sticker.name || sticker.stickerName"
                              :title="sticker.name || sticker.stickerName"
                              class="sticker-icon"
                              @error="handleImageError"
                            />
                            <div class="accessory-price" v-if="getSupplyItemPriceInfo(item.steamAssetId).stickers.find(s => s.steamHashName === sticker.steamHashName)">
                              <span class="yyyp-price">
                                ¥{{ getSupplyItemPriceInfo(item.steamAssetId).stickers.find(s => s.steamHashName === sticker.steamHashName)?.yyyp_price || '-' }}
                              </span>
                            </div>
                          </div>
                        </template>

                        <!-- 挂件 -->
                        <template v-if="item.hasPendant && item.pendants && item.pendants.length > 0">
                          <div class="accessory-item">
                            <img
                              :src="getPendantImageUrl(item.pendants[0])"
                              :alt="item.pendants[0].name || item.pendants[0].pendantName"
                              :title="item.pendants[0].name || item.pendants[0].pendantName"
                              class="pendant-icon"
                              @error="handleImageError"
                            />
                            <div class="accessory-price" v-if="getSupplyItemPriceInfo(item.steamAssetId).pendant">
                              <span class="yyyp-price">
                                ¥{{ getSupplyItemPriceInfo(item.steamAssetId).pendant?.yyyp_price || '-' }}
                              </span>
                            </div>
                          </div>
                        </template>
                      </div>

                      <!-- 无印花/挂件 -->
                      <div v-else class="no-accessories">
                        -
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 空状态 -->
          <div v-if="supplyInventoryList.length === 0" class="empty-state">
            <el-empty description="没有可供应的物品" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="supplyDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleConfirmSupply"
            :disabled="selectedSupplyItems.length === 0 || supplyLoading"
          >
            确认供应 ({{ selectedSupplyItems.length }})
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>


<script>
import { useItemSearch } from './useItemSearch.js'
import { CaretRight, CaretBottom, Check, Loading } from '@element-plus/icons-vue'
import YYYPCommodityList from '../youpin/YYYPCommodityList.vue'
import BuffCommodityList from '../BUFF/BuffCommodityList.vue'
import ItemSearchCSQAQ from '../CSQAQ/index.vue'

export default {
  name: 'ItemSearch',
  components: {
    CaretRight,
    CaretBottom,
    Check,
    Loading,
    YYYPCommodityList,
    BuffCommodityList,
    ItemSearchCSQAQ
  },
  setup() {
    return useItemSearch()
  }
}
</script>

<style scoped src="./styles.css"></style>
