<template>
  <div>
    <!-- 搜索与统计数据 -->
    <div class="stats-summary">
      <div class="card">
        <!-- 搜索栏 -->
        <div class="search-section">
          <div class="flex flex-wrap gap-4 items-center">
            <el-input
              v-model="searchText"
              prefix-icon="Search"
              class="search-input"
              @keyup.enter="handleSearch"
              @clear="handleClearSearch"
              clearable
            />
            <el-select
              v-model="statusFilter"
              placeholder="选择状态"
              class="status-select"
              @change="handleStatusChange"
              clearable
            >
              <el-option v-for="status in statusList" :key="status" :label="status" :value="status" />
            </el-select>
            <el-select
              v-model="statusSubFilter"
              placeholder="选择子状态"
              class="status-select"
              @change="handleStatusSubChange"
              clearable
            >
              <el-option v-for="sub in statusSubList" :key="sub" :label="sub" :value="sub" />
            </el-select>
            <el-select
              v-model="sourceFilter"
              placeholder="选择平台"
              class="status-select"
              @change="handleSourceChange"
              clearable
            >
              <el-option v-for="src in sourceList" :key="src" :label="sourceLabel(src)" :value="src" />
            </el-select>
            <el-select
              v-model="dataUserFilter"
              placeholder="选择用户"
              class="status-select"
              @change="handleDataUserChange"
              clearable
            >
              <el-option v-for="u in dataUserList" :key="u" :label="u" :value="u" />
            </el-select>
              <el-select 
                v-model="weaponTypeFilter" 
              placeholder="武器类型" 
                class="type-select" 
                @change="handleTypeChange" 
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
              >
                <el-option v-for="type in weaponTypes" :key="type" :label="type" :value="type" />
              </el-select>
              <el-select 
                v-model="floatRangeFilter" 
              placeholder="磨损等级" 
                class="wear-select" 
                @change="handleWearChange" 
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
              >
                <el-option v-for="range in floatRanges" :key="range" :label="range" :value="range" />
              </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
              @change="handleDateRangeChange"
              clearable
            />
            <el-button type="primary" @click="handleSearch" :loading="loading">
              搜索
            </el-button>
            <el-button @click="handleClearSearch" :disabled="loading">
              重置
            </el-button>
          </div>
        </div>
        
        <!-- 分隔线 -->
        <div class="search-stats-divider"></div>
        
        <!-- 当前筛选状态 -->
        <div class="filter-status" v-if="hasAdvancedFilters">
          <span class="filter-label">当前筛选：</span>
          <el-tag v-if="searchText && searchText.trim()" type="primary" size="small" closable @close="searchText = ''">
            关键词: {{ searchText }}
          </el-tag>
          <el-tag v-if="statusFilter" type="success" size="small" closable @close="statusFilter = ''">
            状态: {{ statusFilter }}
          </el-tag>
          <el-tag v-if="statusSubFilter" type="success" size="small" closable @close="statusSubFilter = ''">
            子状态: {{ statusSubFilter }}
          </el-tag>
          <el-tag 
            v-for="type in weaponTypeFilter" 
            :key="type" 
            type="warning" 
            size="small" 
            closable 
            @close="removeWeaponType(type)"
          >
            类型: {{ type }}
          </el-tag>
          <el-tag 
            v-for="range in floatRangeFilter" 
            :key="range" 
            type="info" 
            size="small" 
            closable 
            @close="removeFloatRange(range)"
          >
            磨损: {{ range }}
          </el-tag>
          <el-tag v-if="sourceFilter" type="info" size="small" closable @close="sourceFilter = ''">
            平台: {{ sourceLabel(sourceFilter) }}
          </el-tag>
          <el-tag v-if="dataUserFilter" type="info" size="small" closable @close="dataUserFilter = ''">
            用户: {{ dataUserFilter }}
          </el-tag>
          <el-tag v-if="dateRange && dateRange.length === 2" type="danger" size="small" closable @close="dateRange = null">
            时间: {{ dateRange[0] }} ~ {{ dateRange[1] }}
          </el-tag>
        </div>
        
        <!-- 统计数据 -->
        <div class="stats-container">
          <div class="stats-section">
            <div class="stats-grid-3x2">
              <div class="stat-item">
                <span class="stat-label">出售:</span>
                <span class="stat-value">{{ totalStats.totalCount }} 件</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">金额:</span>
                <span class="stat-value">¥{{ totalStats.totalAmount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均价格:</span>
                <span class="stat-value">¥{{ totalStats.avgPrice }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">完成:</span>
                <span class="stat-value">{{ totalStats.completedCount }} 件</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">取消:</span>
                <span class="stat-value">{{ totalStats.cancelledCount }} 件</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">待收货:</span>
                <span class="stat-value">{{ totalStats.pendingCount }} 件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="pagination pagination-top">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalItems"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
      
      <el-table
        :data="filteredSellData"
        v-loading="loading"
        element-loading-text="加载中..."
        style="width: 100%"
        :row-style="{ backgroundColor: 'transparent' }"
        :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
        :flexible="true"
        :scrollbar-always-on="true"
      >
        <el-table-column label="图片" width="144" align="center">
          <template #default="scope">
            <div class="weapon-image-cell" @click="openPreview(scope.row)" style="cursor: pointer;">
              <img
                v-if="getWeaponImage(scope.row.steam_hash_name)"
                :src="getWeaponImage(scope.row.steam_hash_name)"
                :alt="scope.row.item_name"
                class="weapon-img"
                @error="(e) => e.target.style.display = 'none'"
              />
              <span v-else class="no-image">无图</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品名称" min-width="250" show-overflow-tooltip>
          <template #default="scope">
            <div class="item-name-cell">
              <div class="item-title">{{ getItemTitle(scope.row) }}</div>
              <div class="item-extras" v-if="hasExtras(scope.row)">
                <!-- 印花图片 -->
                <div class="sticker-list" v-if="scope.row.sticker">
                  <div
                    v-for="(sticker, idx) in parseStickers(scope.row.sticker)"
                    :key="idx"
                    class="sticker-item"
                    :title="sticker.name || '未知贴纸'"
                  >
                    <img
                      v-if="sticker.image"
                      :src="sticker.image"
                      :alt="sticker.name"
                      class="sticker-img"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <div v-else class="sticker-placeholder">?</div>
                  </div>
                </div>
                <!-- 挂件图片 -->
                <div class="pendant-list" v-if="scope.row.pendant">
                    <img
                      v-if="parsePendant(scope.row.pendant)?.image"
                      :src="parsePendant(scope.row.pendant).image"
                      :alt="parsePendant(scope.row.pendant)?.name"
                    class="pendant-img"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                </div>
                <!-- 改名显示 -->
                <div class="rename-text" v-if="scope.row.rename">
                  <span class="rename-value">{{ scope.row.rename }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="weapon_float" label="磨损值" width="200" align="left">
          <template #default="scope">
            <div v-if="scope.row.weapon_float">
              <div style="font-family: monospace; font-size: 0.85rem; margin-bottom: 4px;">
                {{ scope.row.weapon_float }}
              </div>
              <!-- 磨损值显示条 -->
              <div class="float-bar">
                <div class="float-segment fn"></div>
                <div class="float-segment mw"></div>
                <div class="float-segment ft"></div>
                <div class="float-segment ww"></div>
                <div class="float-segment bs"></div>
                <div
                  class="float-pointer"
                  :style="{ left: `${parseFloat(scope.row.weapon_float) * 100}%` }"
                ></div>
              </div>
            </div>
            <span v-else style="color: var(--text-secondary);">N/A</span>
          </template>
        </el-table-column>
        <el-table-column prop="weapon_type" label="类型" width="120" />
        <el-table-column prop="price" label="出售价格" min-width="100">
          <template #default="scope">
            ¥{{ scope.row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="from" label="来源" min-width="80">
          <template #default="scope">
            {{ sourceLabel(scope.row.from) }}
          </template>
        </el-table-column>
        <el-table-column prop="order_time" label="出售时间" min-width="160" sortable="custom" @sort-change="handleSortChange">
          <template #default="scope">
            {{ formatTime(scope.row.order_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="80">
          <template #default="scope">
            <el-tooltip 
              :content="scope.row.status_sub || scope.row.status" 
              placement="top"
              :disabled="!scope.row.status_sub"
            >
              <span>
                <el-tag 
                  :type="getStatusType(scope.row.status)" 
                  size="small"
                  :style="{
                    backgroundColor: getStatusColor(scope.row.status),
                    borderColor: getStatusColor(scope.row.status),
                    color: getStatusTextColor(scope.row.status)
                  }"
                >
                  {{ scope.row.status }}
                </el-tag>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalItems"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewItem ? getItemTitle(previewItem) : ''"
      width="900px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :show-close="false"
      class="preview-dialog"
    >
      <div v-if="previewItem" class="preview-content">
        <div class="preview-main-layout">
          <!-- 左侧区域 -->
          <div class="preview-left-section">
            <!-- 图片区域 -->
            <div class="preview-image-section clickable-item" @click="confirmJumpToItemSearch">
              <img
                v-if="getWeaponImage(previewItem.steam_hash_name)"
                :src="getWeaponImage(previewItem.steam_hash_name)"
                :alt="previewItem.item_name"
                class="preview-image"
              />
              <div v-else class="preview-image-placeholder">
                <span>无图片</span>
              </div>
            </div>

            <!-- 详细信息区域 -->
            <div class="preview-info-section">
              <!-- 磨损信息 -->
              <div v-if="previewItem.weapon_float" class="preview-float-section">
                <div class="preview-float-bar-container">
                  <div class="float-bar">
                    <div class="float-segment fn"></div>
                    <div class="float-segment mw"></div>
                    <div class="float-segment ft"></div>
                    <div class="float-segment ww"></div>
                    <div class="float-segment bs"></div>
                    <div
                      class="float-pointer"
                      :style="{ left: `${parseFloat(previewItem.weapon_float) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="preview-float-value">{{ previewItem.weapon_float }}</div>
                <div class="preview-float-range" v-if="previewItem.float_range">
                  {{ previewItem.float_range }}
                </div>
              </div>

              <!-- 价格信息 -->
              <div class="preview-prices">
                <div class="preview-price-row">
                  <div class="preview-price-item" v-if="previewItem.price">
                    <span class="preview-price-label">出售价格:</span>
                    <span class="preview-price-value buy-price">¥{{ parseFloat(previewItem.price).toFixed(2) }}</span>
                  </div>
                </div>
                <!-- 武器主体悠悠有品价格信息 -->
                <div class="preview-price-row" v-if="yyypPriceInfo.yyyp_price || yyypPriceInfo.yyyp_on_sale_count">
                  <div class="preview-price-item" style="color: var(--accent-blue); font-size: 14px; display: flex; gap: 12px;">
                    <span v-if="yyypPriceInfo.yyyp_price">
                      悠悠价格: ¥{{ yyypPriceInfo.yyyp_price }}
                    </span>
                    <span v-if="yyypPriceInfo.yyyp_on_sale_count">
                      在售: {{ yyypPriceInfo.yyyp_on_sale_count }}
                    </span>
                  </div>
                </div>
                <!-- 武器主体BUFF价格信息 -->
                <div class="preview-price-row" v-if="buffPriceInfo.buff_price || buffPriceInfo.buff_on_sale_count">
                  <div class="preview-price-item" style="color: var(--accent-green); font-size: 14px; display: flex; gap: 12px;">
                    <span v-if="buffPriceInfo.buff_price">
                      BUFF价格: ¥{{ buffPriceInfo.buff_price }}
                    </span>
                    <span v-if="buffPriceInfo.buff_on_sale_count">
                      在售: {{ buffPriceInfo.buff_on_sale_count }}
                    </span>
                  </div>
                </div>
                <div class="preview-info-row" v-if="previewItem.order_id">
                  <div class="preview-info-item">
                    <span class="preview-info-label">订单编号:</span>
                    <span class="preview-info-value">{{ previewItem.order_id }}</span>
                  </div>
                </div>
                <div class="preview-info-row">
                  <div class="preview-info-item" v-if="previewItem.weapon_type">
                    <span class="preview-info-label">类型:</span>
                    <span class="preview-info-value">{{ previewItem.weapon_type }}</span>
                  </div>
                  <div class="preview-info-item" v-if="previewItem.from">
                    <span class="preview-info-label">来源:</span>
                    <span class="preview-info-value">{{ sourceLabel(previewItem.from) }}</span>
                  </div>
                </div>
                <div class="preview-info-row" v-if="previewItem.order_time">
                  <div class="preview-info-item">
                    <span class="preview-info-label">出售时间:</span>
                    <span class="preview-info-value">{{ formatTime(previewItem.order_time) }}</span>
                  </div>
                </div>
                <div class="preview-info-row" v-if="previewItem.status">
                  <div class="preview-info-item">
                    <span class="preview-info-label">状态:</span>
                    <el-tag
                      :type="getStatusType(previewItem.status)"
                      size="default"
                      :style="{
                        backgroundColor: getStatusColor(previewItem.status),
                        borderColor: getStatusColor(previewItem.status),
                        color: getStatusTextColor(previewItem.status)
                      }"
                    >
                      {{ previewItem.status }}
                    </el-tag>
                  </div>
                  <div class="preview-info-item" v-if="previewItem.status_sub">
                    <span class="preview-info-label">子状态:</span>
                    <span class="preview-info-value">
                      {{ previewItem.status_sub }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧区域 -->
          <div class="preview-right-section">
            <!-- 改名标签 -->
            <div class="preview-rename" v-if="previewItem.rename">
              <span class="preview-rename-icon">🏷️</span>
              <span class="preview-rename-text">{{ previewItem.rename }}</span>
            </div>

            <!-- 贴纸列表 -->
            <div v-if="previewItem.sticker && parseStickers(previewItem.sticker).length > 0" class="preview-sticker-list-section">
              <div class="preview-sticker-list">
                <div
                  v-for="(sticker, index) in parseStickers(previewItem.sticker)"
                  :key="index"
                  class="preview-sticker-list-item clickable-item"
                  @click="handleJumpToItemSearchBySticker(sticker)"
                >
                  <el-tooltip :content="sticker.name || '未知贴纸'" placement="left">
                    <div class="preview-sticker-list-img-wrapper">
                      <img
                        v-if="sticker.image"
                        :src="sticker.image"
                        :alt="sticker.name"
                        class="preview-sticker-list-img"
                        @error="(e) => e.target.style.display = 'none'"
                      />
                      <div v-else class="preview-sticker-list-placeholder">?</div>
                    </div>
                  </el-tooltip>
                  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
                    <div class="preview-sticker-list-name">
                      {{ stickersPriceInfo.find(s => s.name === sticker.name)?.market_listing_item_name || sticker.name || '未知贴纸' }}
                    </div>
                    <!-- 印花价格信息（悠悠蓝色 + BUFF绿色，一行显示） -->
                    <div v-if="stickersPriceInfo.find(s => s.name === sticker.name)" class="preview-sticker-price-info" style="font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
                      <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_price || stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_on_sale_count" style="color: var(--accent-blue);">
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_price">
                          悠悠: ¥{{ stickersPriceInfo.find(s => s.name === sticker.name).yyyp_price }}
                        </span>
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_on_sale_count" style="margin-left: 4px;">
                          ({{ stickersPriceInfo.find(s => s.name === sticker.name).yyyp_on_sale_count }})
                        </span>
                      </span>
                      <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.buff_price || stickersPriceInfo.find(s => s.name === sticker.name)?.buff_on_sale_count" style="color: var(--accent-green);">
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.buff_price">
                          BUFF: ¥{{ stickersPriceInfo.find(s => s.name === sticker.name).buff_price }}
                        </span>
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.buff_on_sale_count" style="margin-left: 4px;">
                          ({{ stickersPriceInfo.find(s => s.name === sticker.name).buff_on_sale_count }})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 挂件信息 -->
            <div v-if="previewItem.pendant" class="preview-pendant-section">
              <div class="preview-pendant-list">
                <div class="preview-pendant-list-item clickable-item" @click="handleJumpToItemSearchByPendant(previewItem.pendant)">
                  <el-tooltip :content="parsePendant(previewItem.pendant)?.name || '挂件'" placement="left">
                    <div class="preview-pendant-list-img-wrapper">
                      <img
                        v-if="parsePendant(previewItem.pendant)?.image"
                        :src="parsePendant(previewItem.pendant).image"
                        :alt="parsePendant(previewItem.pendant).name"
                        class="preview-pendant-list-img"
                        @error="(e) => e.target.style.display = 'none'"
                      />
                      <div v-else class="preview-pendant-list-placeholder">🎗️</div>
                    </div>
                  </el-tooltip>
                  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
                    <div class="preview-pendant-list-name">
                      {{ pendantPriceInfo?.market_listing_item_name || parsePendant(previewItem.pendant)?.name || '挂件' }}
                    </div>
                    <!-- 挂件价格信息（悠悠蓝色 + BUFF绿色，一行显示） -->
                    <div v-if="pendantPriceInfo" class="preview-pendant-price-info" style="font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
                      <span v-if="pendantPriceInfo.yyyp_price || pendantPriceInfo.yyyp_on_sale_count" style="color: var(--accent-blue);">
                        <span v-if="pendantPriceInfo.yyyp_price">
                          悠悠: ¥{{ pendantPriceInfo.yyyp_price }}
                        </span>
                        <span v-if="pendantPriceInfo.yyyp_on_sale_count" style="margin-left: 4px;">
                          ({{ pendantPriceInfo.yyyp_on_sale_count }})
                        </span>
                      </span>
                      <span v-if="pendantPriceInfo.buff_price || pendantPriceInfo.buff_on_sale_count" style="color: var(--accent-green);">
                        <span v-if="pendantPriceInfo.buff_price">
                          BUFF: ¥{{ pendantPriceInfo.buff_price }}
                        </span>
                        <span v-if="pendantPriceInfo.buff_on_sale_count" style="margin-left: 4px;">
                          ({{ pendantPriceInfo.buff_on_sale_count }})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>


<script>
import { useSell } from './useSell.js'

export default {
  name: 'Sell',
  setup() {
    return useSell()
  }
}
</script>

<style scoped src="./styles-scoped.css"></style>
<style src="./styles-global.css"></style>
