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
                @visible-change="handleStatusSubVisibleChange"
                clearable
              >
                <el-option v-for="sub in statusSubList" :key="sub" :label="sub" :value="sub" />
              </el-select>
      <el-select
        v-model="platformFilter"
        placeholder="选择平台"
        class="status-select"
        @change="handlePlatformChange"
        clearable
      >
        <el-option v-for="platform in platformList" :key="platform" :label="mapSource(platform)" :value="platform" />
      </el-select>
      <el-select
        v-model="lessorFilter"
        placeholder="选择出租人"
        class="status-select"
        @change="handleLessorChange"
        clearable
      >
        <el-option v-for="user in lessorList" :key="user" :label="user" :value="user" />
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
            <el-tag v-if="statusFilter && statusFilter !== 'all'" type="success" size="small" closable @close="statusFilter = 'all'">
              状态: {{ statusFilter }}
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
            <el-tag v-if="statusSubFilter && statusSubFilter !== 'all'" type="success" size="small" closable @close="statusSubFilter = 'all'">
              子状态: {{ statusSubFilter }}
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
            <el-tag v-if="dateRange && dateRange.length === 2" type="danger" size="small" closable @close="dateRange = null">
              时间: {{ dateRange[0] }} ~ {{ dateRange[1] }}
            </el-tag>
          </div>
          
          <!-- 统计数据 -->
          <div class="stats-container">
            <div class="stats-section">
              <div class="stats-grid-3x2">
                <div class="stat-item">
                  <span class="stat-label">借入:</span>
                  <span class="stat-value">{{ allDataStats.totalCount }} 件</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">金额:</span>
                  <span class="stat-value">¥{{ allDataStats.totalAmount }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">平均租金:</span>
                  <span class="stat-value">¥{{ allDataStats.avgPrice }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">总天数:</span>
                  <span class="stat-value">{{ allDataStats.totalLeaseDays }} 天</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">平均租期:</span>
                  <span class="stat-value">{{ allDataStats.avgLeaseDays }} 天</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">租赁中:</span>
                  <span class="stat-value">{{ allDataStats.rentingCount }} 件</span>
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
          :data="filteredRentalData"
          v-loading="loading"
          element-loading-text="加载中..."
          style="width: 100%"
          :row-style="{ backgroundColor: 'transparent' }"
          :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
          :flexible="true"
          :scrollbar-always-on="true"
          @sort-change="handleSortChange"
        >
          <!-- 图片列，与 /buy 一致的样式 -->
          <el-table-column label="图片" width="144" align="center">
            <template #default="scope">
              <div
                class="weapon-image-cell"
                @click="openPreview(scope.row)"
                style="cursor: pointer;"
              >
                <img
                  v-if="getWeaponImage(scope.row.steam_hash_name)"
                  :src="getWeaponImage(scope.row.steam_hash_name)"
                  :alt="getItemTitle(scope.row)"
                  class="weapon-img"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <span v-else class="no-image">无图</span>
              </div>
            </template>
          </el-table-column>

          <!-- 名称列：组合武器名+饰品名+磨损，与 /buy 风格一致 -->
          <el-table-column label="商品名称" min-width="260" show-overflow-tooltip>
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
                  <!-- 改名标签 -->
                  <div class="rename-tag" v-if="scope.row.rename">
                    <span class="rename-icon">📝</span>
                    <span class="rename-text">{{ scope.row.rename }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <!-- 磨损值与进度条 -->
          <el-table-column prop="weapon_float" label="磨损值" width="200" align="left">
            <template #default="scope">
              <div v-if="scope.row.weapon_float">
                <div
                  style="font-family: monospace; font-size: 0.85rem; margin-bottom: 4px;"
                >
                  {{ scope.row.weapon_float }}
                </div>
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

          <!-- 借入相关信息 -->
          <el-table-column prop="price" label="租金/天" min-width="100">
            <template #default="scope">
              ¥{{ scope.row.price }}
            </template>
          </el-table-column>

          <!-- 租期 -->
          <el-table-column
            prop="total_Lease_Days"
            label="租期"
            min-width="80"
          >
            <template #default="scope">
              {{ scope.row.total_Lease_Days }} 天
            </template>
          </el-table-column>

          <!-- 租赁时间段 -->
          <el-table-column
            prop="lean_start_time"
            label="租赁时间段"
            min-width="220"
            sortable="custom"
          >
            <template #default="scope">
              <span class="rent-time-range">
                <span>{{ formatTime(scope.row.lean_start_time) || '—' }}</span>
                <span class="rent-time-separator">→</span>
                <span>{{ formatTime(scope.row.lean_end_time) || '—' }}</span>
              </span>
            </template>
          </el-table-column>

        <el-table-column prop="from" label="来源" min-width="100">
          <template #default="scope">
            {{ mapSource(scope.row.from) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="90">
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

      <!-- 预览弹窗，样式与 /buy 一致，字段按借入场景简化 -->
      <el-dialog
        v-model="previewVisible"
        :title="previewItem ? getItemTitle(previewItem) : ''"
        width="800px"
        :close-on-click-modal="true"
        :close-on-press-escape="true"
        :show-close="false"
        class="preview-dialog"
      >
        <div v-if="previewItem" class="preview-content">
          <div class="preview-main-layout">
            <!-- 左侧：图片 + 磨损 + 基本信息 -->
            <div class="preview-left-section">
              <div class="preview-image-section clickable-item" @click="confirmJumpToItemSearch">
                <img
                  v-if="getWeaponImage(previewItem.steam_hash_name)"
                  :src="getWeaponImage(previewItem.steam_hash_name)"
                  :alt="getItemTitle(previewItem)"
                  class="preview-image"
                  loading="lazy"
                />
                <div v-else class="preview-image-placeholder">
                  <span>无图片</span>
                </div>
              </div>

              <div class="preview-info-section">
                <div
                  v-if="previewItem.weapon_float"
                  class="preview-float-section"
                >
                  <div class="preview-float-bar-container">
                    <div class="float-bar">
                      <div class="float-segment fn"></div>
                      <div class="float-segment mw"></div>
                      <div class="float-segment ft"></div>
                      <div class="float-segment ww"></div>
                      <div class="float-segment bs"></div>
                      <div
                        class="float-pointer"
                        :style="{
                          left: `${parseFloat(previewItem.weapon_float) * 100}%`
                        }"
                      ></div>
                    </div>
                  </div>
                  <div class="preview-float-value">
                    {{ previewItem.weapon_float }}
                  </div>
                  <div
                    class="preview-float-range"
                    v-if="previewItem.float_range"
                  >
                    {{ previewItem.float_range }}
                  </div>
                </div>

                <div class="preview-prices">
                  <div class="preview-price-row">
                    <div
                      class="preview-price-item"
                      v-if="previewItem.price"
                    >
                      <span class="preview-price-label">租金/天:</span>
                      <span class="preview-price-value buy-price">
                        ¥{{ parseFloat(previewItem.price).toFixed(2) }}
                      </span>
                    </div>
                    <div
                      class="preview-price-item"
                      v-if="previewItem.total_Lease_Days"
                    >
                      <span class="preview-price-label">租期:</span>
                      <span class="preview-price-value">
                        {{ previewItem.total_Lease_Days }} 天
                      </span>
                    </div>
                  </div>

                  <div class="preview-info-row">
                    <div
                      class="preview-info-item"
                      v-if="previewItem.lessor_name"
                    >
                      <span class="preview-info-label">出租人:</span>
                      <span class="preview-info-value">
                        {{ previewItem.lessor_name }}
                      </span>
                    </div>
                    <div
                      class="preview-info-item"
                      v-if="previewItem.status"
                    >
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
                    <div
                      class="preview-info-item"
                      v-if="previewItem.status_sub"
                    >
                      <span class="preview-info-label">子状态:</span>
                      <span class="preview-info-value">
                        {{ previewItem.status_sub }}
                      </span>
                    </div>
                  </div>

                  <div
                    class="preview-info-row"
                    v-if="previewItem.lean_start_time || previewItem.lean_end_time"
                  >
                    <div
                      class="preview-info-item"
                      v-if="previewItem.lean_start_time"
                    >
                      <span class="preview-info-label">开始时间:</span>
                      <span class="preview-info-value">
                        {{ formatTime(previewItem.lean_start_time) }}
                      </span>
                    </div>
                    <div
                      class="preview-info-item"
                      v-if="previewItem.lean_end_time"
                    >
                      <span class="preview-info-label">结束时间:</span>
                      <span class="preview-info-value">
                        {{ formatTime(previewItem.lean_end_time) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：印花、挂件和订单信息 -->
            <div class="preview-right-section">
              <!-- 订单ID - 放在最上方 -->
              <div class="preview-order-id" v-if="previewItem.ID">
                <span class="preview-order-icon">🧾</span>
                <span class="preview-order-text">订单 ID：{{ previewItem.ID }}</span>
              </div>

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
                    <div class="preview-sticker-list-name">{{ sticker.name || '未知贴纸' }}</div>
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
                    <div class="preview-pendant-list-name">{{ parsePendant(previewItem.pendant)?.name || '挂件' }}</div>
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
import { useRental } from './useRental.js'

export default {
  name: 'Rental',
  setup() {
    return useRental()
  }
}
</script>

<style scoped src="./styles-scoped.css"></style>
<style src="./styles-global.css"></style>
