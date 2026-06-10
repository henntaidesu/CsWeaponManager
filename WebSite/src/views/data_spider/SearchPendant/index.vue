<template>
  <div class="spider-pendant-container">
    <div class="page-layout">
      <!-- 左侧配置管理栏 -->
      <aside 
        class="config-sidebar" 
        :class="{ collapsed: isConfigSectionsCollapsed }"
        @click="handleSidebarAreaClick"
      >
        <div class="sidebar-header clickable" @click.stop="toggleConfigSections">
          <div class="sidebar-header-row" :class="{ collapsed: isConfigSectionsCollapsed }">
            <div class="sidebar-header-title">配置管理</div>
            <div class="sidebar-header-actions">
              <el-button 
                type="success" 
                @click.stop="createNewConfig"
                :disabled="isCrawling"
              >
                <el-icon><Document /></el-icon>
                新建
              </el-button>
              
              <el-button 
                type="info" 
                @click.stop="loadConfigList"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </div>
        </div>

        <div class="sidebar-divider" v-show="!isConfigSectionsCollapsed"></div>

        <div class="config-list" v-show="!isConfigSectionsCollapsed">
          <div 
            v-for="config in savedConfigs" 
            :key="config.id"
            class="config-item"
            :class="{ active: selectedConfigId === config.id }"
            @click="selectConfig(config.id)"
          >
            <div class="config-item-header">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span class="config-name">{{ config.dataName }}</span>
                <el-tag
                  :type="config.platformType === 'buff' ? 'warning' : (config.platformType === 'youpin' ? 'success' : 'info')"
                  size="small"
                >
                  {{ getSourceLabel(config.platformType) }}
                </el-tag>
                <!-- 显示查询进度 -->
                <el-tag
                  v-if="config.crawlProgress && config.crawlProgress.total > 0"
                  :type="config.crawlProgress.isCompleted ? 'success' : 'primary'"
                  size="small"
                >
                  {{ config.crawlProgress.isCompleted ? '已完成' : `${config.crawlProgress.percentage}%` }}
                </el-tag>
              </div>
            </div>
            <div v-if="config.description" class="config-description">
              {{ config.description }}
            </div>
            <!-- 显示详细进度 -->
            <div v-if="config.crawlProgress && config.crawlProgress.total > 0" class="config-progress">
              <el-progress
                :percentage="config.crawlProgress.percentage"
                :status="config.crawlProgress.isCompleted ? 'success' : undefined"
                :stroke-width="4"
                :show-text="false"
              />
              <span class="progress-text">{{ config.crawlProgress.current }} / {{ config.crawlProgress.total }}</span>
            </div>
          </div>

          <div v-if="savedConfigs.length === 0" class="empty-config">
            <el-empty description="暂无保存的配置" :image-size="80" />
          </div>
        </div>
      </aside>

      <!-- 右侧主内容区域 -->
      <div class="main-content-area">

      <!-- 统一的工具区域 -->
      <div v-if="showConfigForm" class="unified-tool-section" :class="{ collapsed: isConfigSectionsCollapsed }">
        <div class="tool-section-header" @click="toggleConfigSections">
          <div class="section-title-group">
            <h2 class="section-title">爬取配置</h2>
            <el-tag
              v-if="crawlForm.searchMode"
              :type="crawlForm.searchMode === 'by_weapon_id' ? 'success' : 'warning'"
              size="small"
              class="search-mode-tag"
            >
              {{ crawlForm.searchMode === 'by_weapon_id' ? '按饰品目录查询' : '按价格区间查询' }}
            </el-tag>
          </div>
          <el-button type="text" class="collapse-btn">
            <el-icon :size="20">
              <ArrowUp v-if="!isConfigSectionsCollapsed" />
              <ArrowDown v-else />
            </el-icon>
          </el-button>
        </div>
        
        <div class="tool-section-content" v-show="!isConfigSectionsCollapsed">
        <div class="tool-section">
        
        <div class="form-container">
          <el-form :model="crawlForm" label-width="0" ref="crawlFormRef">
            <el-form-item>
              <div class="custom-config-grid">
                <div class="custom-config-field" style="flex: 0 1 auto; min-width: 200px;">
                  <div class="field-label">
                    <span style="color: var(--accent-red-light); margin-right: 4px;">*</span>配置名称
                  </div>
                  <div class="field-control" style="width: auto; min-width: 150px;">
                    <el-input
                      v-model="crawlForm.configName"
                      placeholder="请输入配置名称"
                      clearable
                    />
                  </div>
                </div>

                <div class="custom-config-field" style="flex: 0 1 auto; min-width: 150px;">
                  <div class="field-label">
                    <span style="color: var(--accent-red-light); margin-right: 4px;">*</span>平台类型
                  </div>
                  <div class="field-control" style="width: auto; min-width: 120px;">
                    <el-select
                      v-model="crawlForm.platformType"
                      placeholder="选择平台类型"
                      style="width: 100%;"
                      :disabled="!!selectedConfigId || (weaponIdList && weaponIdList.length > 0)"
                      @change="handlePlatformTypeChange"
                    >
                      <el-option label="悠悠有品" value="youpin" />
                      <el-option label="BUFF" value="buff" />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field" style="flex: 0 1 auto; min-width: 150px;">
                  <div class="field-label">武器类型</div>
                  <div class="field-control" style="width: auto; min-width: 120px;">
                    <el-select
                      v-model="crawlForm.weaponType"
                      placeholder="选择武器类型"
                      style="width: 100%;"
                      multiple
                      collapse-tags
                      collapse-tags-tooltip
                      clearable
                    >
                      <el-option
                        v-for="item in weaponTypeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field" style="flex: 0 1 auto; min-width: 250px;">
                  <div class="field-label">
                    <span style="color: var(--accent-red-light); margin-right: 4px;">*</span>爬取账号
                  </div>
                  <div class="field-control" style="width: auto; min-width: 180px;">
                    <el-select
                      v-model="crawlForm.crawlAccountId"
                      placeholder="选择爬取账号"
                      style="width: 100%;"
                      filterable
                    >
                      <el-option
                        v-for="item in filteredSteamIdList"
                        :key="item.steamID || item.steam_id"
                        :label="`${item.dataName || '未命名'} (${item.steamID || item.steam_id || '无ID'})`"
                        :value="item.steamID || item.steam_id"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field" style="flex: 0 1 auto; min-width: 250px;">
                  <div class="field-label">
                    <span style="color: var(--accent-red-light); margin-right: 4px;">*</span>购买账号
                  </div>
                  <div class="field-control" style="width: auto; min-width: 180px;">
                    <el-select
                      v-model="crawlForm.steamId"
                      placeholder="选择购买账号"
                      style="width: 100%;"
                      filterable
                    >
                      <el-option
                        v-for="item in filteredSteamIdList"
                        :key="item.steamID || item.steam_id"
                        :label="`${item.dataName || '未命名'} (${item.steamID || item.steam_id || '无ID'})`"
                        :value="item.steamID || item.steam_id"
                      />
                    </el-select>
                  </div>
                </div>
              </div>
            </el-form-item>

            <el-form-item label-width="0">
              <div class="custom-config-grid">
                <div class="custom-config-field">
                  <div class="field-label">查询间隔</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['饰品自动查询间隔']"
                      type="number"
                      placeholder="例如 3"
                      min="1"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">最大溢价</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['最大溢价']"
                      type="number"
                      placeholder="例如 200"
                      min="0"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">自动购买</div>
                  <div class="field-control">
                    <el-select
                      v-model="customConfigForm['是否自动购买']"
                      placeholder="请选择"
                      style="width: 100px;"
                    >
                      <el-option
                        v-for="option in booleanOptions"
                        :key="`auto-buy-${option.value}`"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field" v-if="customConfigForm['是否自动购买']">
                  <div class="field-label">自动购买阈值</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['自动购买阈值']"
                      type="number"
                      placeholder="例如 10"
                      min="0"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">印花板</div>
                  <div class="field-control">
                    <el-select
                      v-model="customConfigForm['印花板']"
                      placeholder="请选择"
                      style="width: 100px;"
                    >
                      <el-option
                        v-for="option in booleanOptions"
                        :key="`sticker-${option.value}`"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">高光</div>
                  <div class="field-control">
                    <el-select
                      v-model="customConfigForm['高光']"
                      placeholder="请选择"
                      style="width: 100px;"
                    >
                      <el-option
                        v-for="option in booleanOptions"
                        :key="`highlight-${option.value}`"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">收益不少于</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['收益不少于']"
                      type="number"
                      placeholder="例如 3"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <!-- 按价格区间查询：显示在售不少于输入 -->
                <div class="custom-config-field" v-if="crawlForm.searchMode === 'by_price_range'">
                  <div class="field-label">在售不少于</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['在售不少于']"
                      type="number"
                      placeholder="例如 100"
                      min="0"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <!-- 按价格区间查询：显示价格区间输入 -->
                <div class="custom-config-field price-range-field" v-if="crawlForm.searchMode === 'by_price_range'">
                  <div class="field-label">价格区间</div>
                  <div class="field-control" style="display: flex; gap: 10px; align-items: center; width: auto;">
                    <el-input
                      v-model.number="crawlForm.priceMin"
                      type="number"
                      placeholder="最低价格"
                      style="width: 100px;"
                      clearable
                    />
                    <span style="color: var(--text-secondary);">至</span>
                    <el-input
                      v-model.number="crawlForm.priceMax"
                      type="number"
                      placeholder="最高价格"
                      style="width: 100px;"
                      clearable
                    />
                    <span style="color: var(--text-secondary); font-size: 13px;">元</span>
                  </div>
                </div>
              </div>
            </el-form-item>

            <!-- 按饰品目录查询：显示饰品列表 -->
            <el-form-item v-if="crawlForm.searchMode === 'by_weapon_id'">
              <template #label>
                <div class="collapsible-label">
                  <span class="label-text" @click="toggleWeaponList">
                    饰品列表 ({{ weaponIdList.length }})
                    <el-icon
                      class="collapse-icon-inline"
                      :class="{ 'is-collapsed': isWeaponListCollapsed }"
                    >
                      <ArrowUp v-if="!isWeaponListCollapsed" />
                      <ArrowDown v-else />
                    </el-icon>
                  </span>
                </div>
              </template>
              <div class="weapon-id-section" v-show="!isWeaponListCollapsed">
                <div class="weapon-id-tags">
                  <el-tag
                    v-for="weapon in weaponIdList"
                    :key="weapon.id"
                    closable
                    @close="removeWeaponId(weapon.id)"
                    type="primary"
                    size="large"
                  >
                    {{ weapon.name }} (ID: {{ weapon.id }})
                  </el-tag>
                </div>
                <el-button
                  v-if="weaponIdList && weaponIdList.length > 0"
                  type="danger"
                  size="small"
                  @click="clearAllWeaponIds"
                  style="margin-left: 10px;"
                >
                  <el-icon><Delete /></el-icon>
                  一键清空
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <div class="action-buttons">
          <el-button 
            type="success" 
            size="large"
            @click="saveConfig"
            :disabled="isCrawling"
          >
            <el-icon><Document /></el-icon>
            保存当前配置
          </el-button>

          <el-button 
            type="danger" 
            size="large"
            @click="deleteCurrentConfig"
            :disabled="isCrawling || !selectedConfigId"
          >
            <el-icon><Delete /></el-icon>
            删除当前配置
          </el-button>

          <el-button
            type="primary"
            size="large"
            @click="startCrawl"
            :disabled="isCrawling || !canStartCrawl"
            :loading="isCrawling"
          >
            {{ isCrawling ? '搜索中...' : '开始搜索' }}
          </el-button>

          <el-button
            type="danger"
            size="large"
            @click="stopCrawl"
            :disabled="!isCrawling"
          >
            停止搜索
          </el-button>
        </div>

        </div>

        <!-- 搜索饰品组件：仅在按饰品目录查询模式下显示 -->
        <WeaponSearch
          v-if="crawlForm.searchMode === 'by_weapon_id'"
          :platformType="crawlForm.platformType"
          @add-weapon="handleAddWeaponFromSearch"
          @add-all-weapons="handleAddAllWeaponsFromSearch"
        />

        </div>
        <!-- 结束 tool-section-content -->
      </div>
      <!-- 结束 unified-tool-section -->

      <!-- 查询进度显示：独立区域，不受配置区域收缩影响 -->
      <div v-if="showConfigForm && crawlProgress.show" class="crawl-progress-section">
        <div class="progress-single-line">
          <span v-if="crawlProgress.currentWeapon" class="current-weapon-inline">
            <span class="current-label">当前查询:</span>
            <span class="current-name">{{ crawlProgress.currentWeapon }}</span>
          </span>
          <span class="progress-stats-inline">
            <span class="stat-label">进度:</span>
            <span class="stat-value">{{ crawlProgress.percentage.toFixed(2) }}%</span>
          </span>
          <div class="progress-bar-inline">
            <el-progress
              :percentage="crawlProgress.percentage"
              :status="isCrawling ? undefined : 'success'"
              :stroke-width="12"
              :show-text="false"
            />
          </div>
          <span class="progress-stats-inline">
            <span class="stat-label">已查询:</span>
            <span class="stat-value">{{ crawlProgress.current }} / {{ crawlProgress.total }}</span>
          </span>
        </div>
      </div>

      <!-- 查询结果区域：只在有配置ID时显示 -->
      <div v-if="selectedConfigId && allCrawlItems && allCrawlItems.length > 0" class="result-section">
        <div class="result-header">
          <h2 class="section-title">查询结果 ({{ allCrawlItems.length }} 件)</h2>
          <el-button 
            type="danger" 
            size="small"
            @click="clearCrawlHistory"
            :disabled="isCrawling"
          >
            <el-icon><Delete /></el-icon>
            清空列表
          </el-button>
        </div>
        
        <!-- 统一商品列表 -->
        <el-table 
          :data="allCrawlItems" 
          style="width: 100%; min-width: max(1200px, 100%);"
          stripe
        >
          <el-table-column label="图标" width="80" align="center">
            <template #default="scope">
              <template v-if="getItemIconUrl(scope.row)">
                <img
                  :src="getItemIconUrl(scope.row)"
                  class="weapon-icon"
                  :alt="scope.row.weapon_name || 'icon'"
                  referrerpolicy="no-referrer"
                />
              </template>
              <span v-else class="no-icon">-</span>
            </template>
          </el-table-column>

          <el-table-column label="武器名称" min-width="280">
            <template #default="scope">
              <div class="weapon-info-container">
                <el-tooltip
                  :content="scope.row.weapon_name"
                  placement="top"
                  :disabled="!scope.row.weapon_name || scope.row.weapon_name.length <= 20"
                >
                  <div class="weapon-name-cell">{{ scope.row.weapon_name }}</div>
                </el-tooltip>

                <!-- 磨损值显示在武器名称下方 -->
                <div class="float-cell-vertical" v-if="scope.row.abrade">
                  <div class="float-bar-mini">
                    <div class="float-segment fn" title="崭新出厂 (0.00 - 0.07)"></div>
                    <div class="float-segment mw" title="略有磨损 (0.07 - 0.15)"></div>
                    <div class="float-segment ft" title="久经沙场 (0.15 - 0.38)"></div>
                    <div class="float-segment ww" title="破损不堪 (0.38 - 0.45)"></div>
                    <div class="float-segment bs" title="战痕累累 (0.45 - 1.00)"></div>
                    <div
                      class="float-pointer"
                      :style="{ left: `${parseFloat(scope.row.abrade) * 100}%` }"
                      :title="`磨损值: ${scope.row.abrade}`"
                    ></div>
                  </div>
                  <div class="float-value">磨损: {{ scope.row.abrade }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="价格信息" min-width="500">
              <template #default="scope">
                <div class="price-info-container">
                  <div class="price-info-item">
                    <span class="price-label">价格</span>
                    <span class="price">¥{{ scope.row.price }}</span>
                  </div>
                  <div class="price-info-item">
                    <span class="price-label">在售</span>
                    <span class="price-value">{{ scope.row.totalCount || 0 }}</span>
                  </div>
                  <div class="price-info-item">
                    <span class="price-label">溢价</span>
                    <el-tag type="danger" size="small">
                      {{ scope.row.spread.toFixed(2) }}
                    </el-tag>
                  </div>
                  <div class="price-info-item">
                    <span class="price-label">手续费</span>
                    <span class="commission-fee">¥{{ scope.row.commissionFee ? scope.row.commissionFee.toFixed(2) : '0.00' }}</span>
                  </div>
                  <div class="price-info-item">
                    <span class="price-label">收益</span>
                    <el-tag
                      :type="scope.row.priceDiff < 0 ? 'danger' : (scope.row.priceDiff < 3 ? 'warning' : 'success')"
                      size="small"
                    >
                      {{ scope.row.priceDiff >= 0 ? '+' : '' }}{{ scope.row.priceDiff.toFixed(2) }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="挂件" min-width="250">
              <template #default="scope">
                <div class="pendant-list">
                  <div
                    v-for="(pendant, index) in scope.row.pendants" 
                    :key="index"
                    class="pendant-item"
                  >
                    <img v-if="pendant.img" :src="pendant.img" class="pendant-img" :alt="pendant.name" />
                    <div class="pendant-info">
                      <div class="pendant-name">{{ pendant.name }}</div>
                      <div class="pendant-details">
                        <span class="pendant-price">¥{{ pendant.price }}</span>
                        <span class="pendant-pattern">模板: {{ pendant.pattern }}</span>
                      </div>
                    </div>
                  </div>
                  <span v-if="!scope.row.pendants || scope.row.pendants.length === 0" class="no-pendant">无挂件</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="卖家" width="120">
              <template #default="scope">
                {{ scope.row.userNickName || '未知' }}
              </template>
            </el-table-column>

            <el-table-column label="第三方网站" width="120" align="center">
              <template #default="scope">
                <div class="third-party-links">
                  <el-button
                    type="primary"
                    size="small"
                    @click="openCSQAQ(scope.row)"
                  >
                    CSQAQ
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    @click="openSteamDT(scope.row)"
                  >
                    SteamDT
                  </el-button>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button
                  :type="getBuyButtonType(scope.row)"
                  size="small"
                  @click="handleBuyWeapon(scope.row)"
                  :loading="buyingItems[scope.row.id]"
                  :disabled="purchasedItems.has(scope.row.id)"
                >
                  {{ purchasedItems.has(scope.row.id) ? '已购买' : '购买' }}
                </el-button>
              </template>
            </el-table-column>
        </el-table>
      </div>

      </div>
      <!-- 结束 main-content-area -->
    </div>
    <!-- 结束 page-layout -->

    <!-- 选择查询模式对话框 -->
    <el-dialog
      v-model="showSearchModeDialog"
      title="选择查询模式"
      width="420px"
      :close-on-click-modal="false"
      class="search-mode-dialog"
    >
      <div class="search-mode-selection">
        <el-radio-group v-model="selectedSearchMode" size="large" class="mode-radio-group">
          <el-radio label="by_weapon_id" border class="mode-radio-item">
            <span class="mode-title">按饰品目录查询</span>
          </el-radio>
          <el-radio label="by_price_range" border class="mode-radio-item">
            <span class="mode-title">按价格区间查询</span>
          </el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSearchModeDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmSearchMode">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 购买确认对话框 -->
    <el-dialog
      v-model="yyypBuyDialogVisible"
      title="确认付款"
      width="600px"
      :close-on-click-modal="false"
      class="yyyp-buy-dialog"
    >
      <div v-loading="yyypBuyDetailLoading" class="yyyp-buy-content">
        <div v-if="yyypBuyDetail && yyypBuyDetail.commodity" class="yyyp-buy-detail">
          <!-- 商品信息 -->
          <div class="commodity-info-section">
            <div class="commodity-image-large">
              <img
                v-if="yyypBuyDetail.commodity.templateInfo?.iconUrlLarge"
                :src="yyypBuyDetail.commodity.templateInfo.iconUrlLarge"
                :alt="yyypBuyDetail.commodity.commodityName"
                style="max-width: 100%; max-height: 200px;"
              />
            </div>
            <div class="commodity-info-details">
              <h3>{{ yyypBuyDetail.commodity.commodityName }}</h3>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="订单号" v-if="yyypBuyDetail.orderNo">
                  <span style="color: var(--accent-blue); font-size: 14px;">
                    {{ yyypBuyDetail.orderNo }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="价格">
                  <span style="color: var(--accent-red-light); font-size: 18px; font-weight: bold;">
                    ¥{{ yyypBuyDetail.commodity.sellPrice }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="品质">
                  <span :style="{ color: '#' + yyypBuyDetail.commodity.templateInfo?.qualityColor }">
                    {{ yyypBuyDetail.commodity.templateInfo?.qualityName }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="稀有度">
                  <span :style="{ color: '#' + yyypBuyDetail.commodity.templateInfo?.rarityColor }">
                    {{ yyypBuyDetail.commodity.templateInfo?.rarityName }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <!-- 支付方式 -->
          <div class="payment-section">
            <div class="payment-info" v-if="filteredYYYPPayList.length > 0">
              <span style="font-size: 16px; font-weight: 600; margin-right: 20px;">支付方式</span>
              <img
                :src="filteredYYYPPayList[0].channelLogo"
                :alt="filteredYYYPPayList[0].channelName"
                style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;"
              />
              <span style="font-size: 14px;">{{ filteredYYYPPayList[0].channelName }}</span>
              <span v-if="filteredYYYPPayList[0].balance" style="color: var(--accent-green); margin-left: 10px; font-weight: bold;">
                ¥{{ filteredYYYPPayList[0].balance }}
              </span>
            </div>
          </div>

          <!-- 购买选项 -->
          <div class="buy-options-section">
            <el-checkbox v-model="yyypBuyForm.autoConfirmPayment">
              自动确认支付
            </el-checkbox>
            <el-checkbox v-model="yyypBuyForm.pollPayment">
              轮询支付状态
            </el-checkbox>
          </div>
        </div>

        <div v-else-if="!yyypBuyDetailLoading" class="no-detail-section">
          <el-empty description="无法加载商品详情" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelYYYPOrder">取消订单</el-button>
          <el-button
            type="primary"
            :loading="buyingYYYP"
            :disabled="!yyypBuyDetail || yyypBuyDetailLoading || !isYYYPBalanceSufficient"
            @click="confirmYYYPBuy"
          >
            {{ isYYYPBalanceSufficient ? '确认付款' : '余额不足' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script>
import { useSearchPendant } from './useSearchPendant.js'
import { Refresh, Document, Delete, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import WeaponSearch from '@/views/Units/weapon_search/index.vue'

export default {
  name: 'SearchPendant',
  components: {
    WeaponSearch,
    Refresh,
    Document,
    Delete,
    ArrowUp,
    ArrowDown
  },
  setup() {
    return useSearchPendant()
  }
}
</script>

<style scoped>
@import './styles.css';

.spider-pendant-container {
  min-height: 100vh;
  padding: 2rem;
}

.page-header {
  margin-bottom: 1rem;
  padding: 1rem;
}

.page-layout {
  display: flex;
  gap: 1.5rem;
  min-height: calc(100vh - 150px);
  max-width: 100%;
}

/* 左侧配置管理栏 */
.config-sidebar {
  width: 280px;
  min-width: 280px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  height: auto;
  position: sticky;
  top: 1rem;
  transition: width 0.25s ease, min-width 0.25s ease;
}

.config-sidebar.collapsed {
  width: 48px;
  min-width: 48px;
}

.sidebar-header {
  margin-bottom: 1.25rem;
}

.sidebar-header-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--accent-green);
  white-space: nowrap;
  margin-bottom: 0.5rem;
}

.sidebar-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  overflow: hidden;
  max-width: 100%;
  opacity: 1;
  transition: max-width 0.25s ease, opacity 0.25s ease;
}

.sidebar-header-row.collapsed {
  max-width: 0;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-green);
  white-space: nowrap;
}

.sidebar-header.clickable {
  cursor: pointer;
}

.sidebar-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-green);
  margin: 0;
}

.config-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
  padding-left: 0.25rem;
}

/* 优化配置列表中的标签显示 */
.config-item :deep(.el-tag) {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 2px 8px;
  height: auto;
  line-height: 1.4;
  border-radius: 4px;
  font-weight: 500;
}

.config-item {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 0.5rem;
  padding: 0.875rem;
  margin-bottom: 0.625rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.config-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.config-item:hover {
  border-color: var(--accent-green);
  background-color: var(--bg-tertiary);
  transform: translateX(2px);
}

.config-item:hover::before {
  background-color: var(--accent-green);
}

.config-item.active {
  border-color: var(--accent-green);
  background-color: rgba(76, 175, 80, 0.15);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
  transform: translateX(0);
}

.config-item.active::before {
  background-color: var(--accent-green);
  width: 4px;
}

.config-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.375rem;
  gap: 0.5rem;
}

.config-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.config-item.active .config-name {
  color: var(--accent-green);
}

.config-item-meta {
  margin-bottom: 0.25rem;
}

.config-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.config-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.375rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.config-progress {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-progress .progress-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  -webkit-box-orient: vertical;
  padding-left: 0.25rem;
}

.config-item.active .config-description {
  color: #bbb;
}

.empty-config {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 2rem 1rem;
}

.empty-config :deep(.el-empty__description) {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.sidebar-divider {
  height: 1px;
  background-color: #2f2f2f;
  border-radius: 1px;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
}

.sidebar-header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-header-actions .el-button {
  min-width: 64px;
}

/* 右侧主内容区域 */
.main-content-area {
  flex: 1;
  min-width: 0;
  width: auto;
  overflow-x: hidden;
}

/* 统一工具区域容器 */
.unified-tool-section {
  background-color: var(--bg-secondary);
  border-radius: 1rem;
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.unified-tool-section.collapsed {
  padding: 1rem 2rem;
}

.tool-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  user-select: none;
  transition: all 0.3s ease;
}

.tool-section-header:hover {
  background-color: var(--bg-overlay);
}

.tool-section-header .section-title {
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.unified-tool-section.collapsed .tool-section-header {
  margin-bottom: 0;
}

.collapse-btn {
  padding: 0.25rem;
  color: var(--accent-green);
  transition: transform 0.3s ease;
}

.collapse-btn:hover {
  color: var(--accent-green);
  transform: scale(1.1);
}

.main-section-title {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.tool-section-content {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-card {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-default);
}

.search-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-default);
}

.search-container {
  margin-bottom: 1.5rem;
}

.search-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.weapon-search-input {
  width: 100%;
}

.search-results-table {
  margin-top: 1rem;
  border: 1px solid var(--border-default);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  border-radius: 0.5rem 0.5rem 0 0;
  border: 1px solid var(--border-default);
  border-bottom: none;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
}

.results-header:hover {
  background-color: var(--bg-overlay);
}

.results-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-green);
}

.results-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* 可折叠标签样式 */
.collapsible-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

.collapsible-label .label-text {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.collapsible-label .label-text:hover {
  color: var(--accent-blue);
}

.collapsible-label .collapse-icon-inline {
  font-size: 0.875rem;
  transition: transform 0.3s ease;
  color: inherit;
}

.collapsible-label .collapse-icon-inline.is-collapsed {
  transform: rotate(0deg);
}

.weapon-name {
  color: var(--text-primary);
  font-weight: 500;
}

/* 武器图标和名称样式已移至 resultSection.css */

.hash-name-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.no-data {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.price-text {
  color: var(--accent-green);
  font-weight: 600;
  font-size: 0.95rem;
}

.count-text {
  color: var(--accent-blue);
  font-weight: 500;
  font-size: 0.9rem;
}

.rarity-text {
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.platform-tip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  color: var(--accent-orange);
  font-size: 0.75rem;
}

.load-more-container {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--accent-blue);
}

.no-more-data {
  color: var(--text-secondary);
}

.can-load-more {
  color: #606266;
}

.weapon-row {
  cursor: pointer;
}

.weapon-row:hover {
  background-color: rgba(76, 175, 80, 0.1) !important;
}

.tool-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border-default);
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-mode-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 4px;
}

/* 查询进度样式 - 单行显示 */
.crawl-progress-section {
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-top: 1.5rem;
  border: 1px solid var(--border-default);
}

.progress-single-line {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.progress-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.progress-status-tag {
  flex-shrink: 0;
}

.progress-stats-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.stat-value {
  color: var(--accent-green);
  font-size: 1rem;
  font-weight: 600;
}

.progress-bar-inline {
  flex: 1;
  min-width: 200px;
}

.current-weapon-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 6px;
  border-left: 3px solid var(--accent-green);
  width: 350px;
  min-width: 350px;
  max-width: 350px;
  overflow: hidden;
}

.current-weapon-inline .current-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.current-weapon-inline .current-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.current-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.current-name {
  color: var(--text-primary);
  font-weight: 500;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-container {
  background-color: var(--bg-tertiary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0;
}

/* 垂直堆叠的表单行 */
.form-row-stacked {
  flex-direction: column;
  gap: 0;
}

.form-item-full {
  width: 100%;
  margin-bottom: 18px;
}

.form-item-half {
  flex: 1;
  margin-bottom: 18px;
}

.form-item-third {
  flex: 1;
  margin-bottom: 18px;
}

.form-item-quarter {
  flex: 1;
  margin-bottom: 18px;
}

.form-item-fifth {
  flex: 1;
  margin-bottom: 18px;
}

.form-hint {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.weapon-id-section {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
}

.weapon-id-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  min-width: 140px;
}

/* 结果区域样式已移至 resultSection.css */

/* 价格区间提示样式 */
.price-range-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 隐藏数字输入框的加减器 */
.no-spinner :deep(input[type="number"]::-webkit-outer-spin-button),
.no-spinner :deep(input[type="number"]::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.no-spinner :deep(input[type="number"]) {
  -moz-appearance: textfield;
  appearance: textfield;
}

.no-spinner :deep(input[type="number"]::-webkit-inner-spin-button),
.no-spinner :deep(input[type="number"]::-webkit-outer-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

/* 价格输入框样式 */
.price-input {
  width: 150px;
}

.price-input :deep(input[type="number"]::-webkit-outer-spin-button),
.price-input :deep(input[type="number"]::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.price-input :deep(input[type="number"]) {
  -moz-appearance: textfield;
  appearance: textfield;
}

.result-info {
  display: grid;
  gap: 1rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-default);
}

.result-item:last-child {
  border-bottom: none;
}

.result-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.result-value {
  color: var(--text-primary);
  font-weight: 600;
}

.result-value.success {
  color: var(--accent-green);
}

.result-value.error {
  color: var(--accent-red-light);
}

.result-value.highlight {
  color: var(--accent-orange);
  font-size: 1.1rem;
}

/* Element Plus 组件深色主题适配 */
:deep(.el-input__inner) {
  color: var(--text-primary);
}

:deep(.el-textarea__inner) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-default);
}

:deep(.el-textarea__inner:hover) {
  border-color: var(--accent-green);
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--accent-green);
}

:deep(.el-form-item__label) {
  color: var(--text-secondary);
}

:deep(.el-switch) {
  --el-switch-on-color: var(--accent-green);
  --el-switch-off-color: #555;
}

/* 自定义配置表单 */
.custom-config-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem 2.5rem;
  align-items: center;
}

.custom-config-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  flex: 0 0 auto;
}

.custom-config-field .field-label {
  min-width: auto;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  flex-shrink: 0;
}

.custom-config-field .field-control {
  flex: 0 0 100px;
  width: 100px;
}

/* 响应式设计 */
/* 大屏幕优化 */
@media (min-width: 1920px) {
  .config-sidebar {
    width: 320px;
    min-width: 320px;
  }
}

/* iPad Pro 横屏 (1024px - 1366px) */
@media (min-width: 1024px) and (max-width: 1366px) {
  .spider-pendant-container {
    padding: 1.5rem;
  }

  .page-layout {
    gap: 1rem;
  }

  .config-sidebar {
    width: 240px;
    min-width: 240px;
    padding: 1.25rem;
  }

  .unified-tool-section {
    padding: 1.25rem 1.5rem;
  }

  .form-container {
    padding: 1.25rem;
  }

  .custom-config-grid {
    gap: 1rem 1.5rem;
  }

  .custom-config-field {
    flex: 0 0 calc(33.333% - 1rem);
    min-width: 200px;
  }

  .custom-config-field .field-label {
    min-width: 100px;
    font-size: 0.85rem;
  }

  .form-row {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .form-item-quarter {
    flex: 0 0 calc(50% - 0.375rem);
    min-width: 0;
  }

  .action-buttons {
    gap: 0.75rem;
  }

  .action-buttons .el-button {
    min-width: 120px;
    font-size: 0.9rem;
  }

  /* 表格优化 */
  .result-section {
    padding: 1.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .result-section :deep(.el-table) {
    font-size: 0.875rem;
    min-width: 1200px;
    overflow: visible !important;
  }

  .result-section :deep(.el-table th),
  .result-section :deep(.el-table td) {
    padding: 8px 6px;
  }

  /* 禁用表格所有内部容器的滚动 */
  .result-section :deep(.el-table__header-wrapper),
  .result-section :deep(.el-table__body-wrapper),
  .result-section :deep(.el-table__inner-wrapper),
  .result-section :deep(.el-scrollbar),
  .result-section :deep(.el-scrollbar__wrap) {
    overflow: visible !important;
  }

  /* 隐藏表格内部的所有滚动条 */
  .result-section :deep(.el-table)::-webkit-scrollbar,
  .result-section :deep(.el-table__header-wrapper)::-webkit-scrollbar,
  .result-section :deep(.el-table__body-wrapper)::-webkit-scrollbar,
  .result-section :deep(.el-table__inner-wrapper)::-webkit-scrollbar,
  .result-section :deep(.el-scrollbar)::-webkit-scrollbar,
  .result-section :deep(.el-scrollbar__wrap)::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  .result-section :deep(.el-table),
  .result-section :deep(.el-table__header-wrapper),
  .result-section :deep(.el-table__body-wrapper),
  .result-section :deep(.el-table__inner-wrapper),
  .result-section :deep(.el-scrollbar),
  .result-section :deep(.el-scrollbar__wrap) {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .weapon-icon {
    width: 50px;
    height: 50px;
  }

  .pendant-img {
    width: 50px;
    height: 50px;
    max-width: 50px;
    max-height: 50px;
    min-width: 50px;
    min-height: 50px;
  }

  .pendant-name {
    font-size: 13px;
  }

  .pendant-details {
    font-size: 11px;
    gap: 8px;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .tool-section-header .section-title {
    font-size: 1.1rem;
  }

  /* 优化按钮大小 */
  .result-section :deep(.el-button--small) {
    padding: 5px 10px;
    font-size: 0.8rem;
  }

  /* 触摸优化 */
  .config-item,
  .action-buttons .el-button,
  .result-section :deep(.el-button) {
    -webkit-tap-highlight-color: rgba(76, 175, 80, 0.2);
    touch-action: manipulation;
  }

  /* 优化输入框在 iPad 上的显示 */
  .form-container :deep(.el-input),
  .form-container :deep(.el-select) {
    font-size: 0.9rem;
  }

  /* 优化标签间距 */
  .weapon-id-tags {
    gap: 6px;
  }

  .weapon-id-tags :deep(.el-tag) {
    margin: 0;
    font-size: 0.85rem;
    padding: 4px 8px;
  }

  /* 配置管理优化 */
  .config-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .config-name {
    font-size: 0.9rem;
  }

  .config-item :deep(.el-tag) {
    font-size: 0.7rem;
    padding: 2px 6px;
  }

  .config-description {
    font-size: 0.75rem;
  }
}

/* iPad 竖屏 / 小屏幕平板 (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .spider-pendant-container {
    padding: 1rem;
  }

  .page-layout {
    flex-direction: column;
    gap: 1rem;
  }

  .config-sidebar {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    max-height: 350px;
    position: static;
    margin-bottom: 0;
  }

  .config-list {
    max-height: 200px;
  }

  .unified-tool-section {
    padding: 1rem 1.25rem;
  }

  .form-container {
    padding: 1rem;
  }

  .custom-config-grid {
    gap: 0.75rem 1rem;
  }

  .custom-config-field {
    flex: 0 0 calc(50% - 0.5rem);
    min-width: 180px;
  }

  .custom-config-field .field-label {
    min-width: 90px;
    font-size: 0.8rem;
  }

  .form-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .form-item-quarter {
    flex: 0 0 calc(50% - 0.25rem);
    min-width: 0;
  }

  .action-buttons {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .action-buttons .el-button {
    flex: 1 1 calc(50% - 0.25rem);
    min-width: 140px;
  }

  /* 表格优化 */
  .result-section {
    padding: 1rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .result-section :deep(.el-table) {
    font-size: 0.85rem;
    min-width: 1200px;
    overflow: visible !important;
  }

  .result-section :deep(.el-table th),
  .result-section :deep(.el-table td) {
    padding: 6px 4px;
  }

  /* 禁用表格所有内部容器的滚动 */
  .result-section :deep(.el-table__header-wrapper),
  .result-section :deep(.el-table__body-wrapper),
  .result-section :deep(.el-table__inner-wrapper),
  .result-section :deep(.el-scrollbar),
  .result-section :deep(.el-scrollbar__wrap) {
    overflow: visible !important;
  }

  /* 隐藏表格内部的所有滚动条 */
  .result-section :deep(.el-table)::-webkit-scrollbar,
  .result-section :deep(.el-table__header-wrapper)::-webkit-scrollbar,
  .result-section :deep(.el-table__body-wrapper)::-webkit-scrollbar,
  .result-section :deep(.el-table__inner-wrapper)::-webkit-scrollbar,
  .result-section :deep(.el-scrollbar)::-webkit-scrollbar,
  .result-section :deep(.el-scrollbar__wrap)::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  .result-section :deep(.el-table),
  .result-section :deep(.el-table__header-wrapper),
  .result-section :deep(.el-table__body-wrapper),
  .result-section :deep(.el-table__inner-wrapper),
  .result-section :deep(.el-scrollbar),
  .result-section :deep(.el-scrollbar__wrap) {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .weapon-icon {
    width: 45px;
    height: 45px;
  }

  .pendant-img {
    width: 45px;
    height: 45px;
    max-width: 45px;
    max-height: 45px;
    min-width: 45px;
    min-height: 45px;
  }

  .pendant-name {
    font-size: 12px;
  }

  .pendant-details {
    font-size: 10px;
    gap: 6px;
  }

  /* 优化按钮大小 */
  .result-section :deep(.el-button--small) {
    padding: 4px 8px;
    font-size: 0.75rem;
  }

  /* 优化标签显示 */
  .result-section :deep(.el-tag) {
    font-size: 0.75rem;
    padding: 2px 6px;
  }

  /* 触摸优化 */
  .config-item,
  .action-buttons .el-button,
  .result-section :deep(.el-button) {
    -webkit-tap-highlight-color: rgba(76, 175, 80, 0.2);
    touch-action: manipulation;
    min-height: 36px;
  }

  /* 优化输入框在 iPad 上的显示 */
  .form-container :deep(.el-input),
  .form-container :deep(.el-select) {
    font-size: 0.85rem;
  }

  /* 优化标签间距 */
  .weapon-id-tags {
    gap: 6px;
  }

  .weapon-id-tags :deep(.el-tag) {
    margin: 0;
    font-size: 0.8rem;
    padding: 3px 6px;
  }

  /* 配置管理优化 */
  .config-item {
    padding: 0.625rem;
    margin-bottom: 0.5rem;
  }

  .config-name {
    font-size: 0.85rem;
  }

  .config-item :deep(.el-tag) {
    font-size: 0.65rem;
    padding: 1px 5px;
  }

  .config-description {
    font-size: 0.7rem;
  }

  .config-list {
    padding-right: 0.25rem;
  }

  .sidebar-header-actions {
    flex-direction: column;
    gap: 0.375rem;
  }

  .sidebar-header-actions .el-button {
    width: 100%;
    min-width: auto;
    font-size: 0.8rem;
    padding: 6px 12px;
  }
}

/* 中等屏幕 */
@media (max-width: 1440px) and (min-width: 1367px) {
  .config-sidebar {
    width: 260px;
    min-width: 260px;
    padding: 1rem;
  }
}

/* 小屏幕 - 切换为垂直布局 */
@media (max-width: 1024px) {
  .page-layout {
    flex-direction: column;
  }

  .config-sidebar {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    max-height: 400px;
    position: static;
    margin-bottom: 1rem;
  }

  .config-list {
    max-height: 250px;
  }
}

@media (max-width: 768px) {
  .spider-sticker-container {
    padding: 1rem;
  }

  .page-header {
    padding: 0.5rem;
  }

  .back-button {
    width: 100%;
  }

  .config-sidebar {
    padding: 1rem;
  }

  .sidebar-header-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-section {
    padding: 1rem;
  }

  .form-container {
    padding: 1rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .form-item-half {
    width: 100%;
  }

  .form-item-third {
    width: 100%;
  }

  .form-item-quarter {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}

/* 滚动条样式 */
.config-list::-webkit-scrollbar {
  width: 8px;
}

.config-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.config-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.config-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 磨损值显示（在武器名称下方） */
.float-cell-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-start;
  width: 100%;
}

.float-bar-mini {
  position: relative;
  height: 6px;
  display: flex;
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
  max-width: 200px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.float-bar-mini .float-segment {
  height: 100%;
}

/* CS2 标准磨损等级颜色 */
.float-bar-mini .float-segment.fn {
  flex: 7;  /* 0.00 - 0.07 */
  background: linear-gradient(to right, var(--accent-green), var(--accent-green));
}

.float-bar-mini .float-segment.mw {
  flex: 8;  /* 0.07 - 0.15 */
  background: linear-gradient(to right, #8BC34A, #9CCC65);
}

.float-bar-mini .float-segment.ft {
  flex: 23; /* 0.15 - 0.38 */
  background: linear-gradient(to right, #FFC107, #FFB300);
}

.float-bar-mini .float-segment.ww {
  flex: 7;  /* 0.38 - 0.45 */
  background: linear-gradient(to right, #FF9800, #FB8C00);
}

.float-bar-mini .float-segment.bs {
  flex: 55; /* 0.45 - 1.00 */
  background: linear-gradient(to right, #F44336, #E53935);
}

.float-bar-mini .float-pointer {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 8px;
  background: #fff;
  border-radius: 1px;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5), 0 0 6px rgba(255, 255, 255, 0.8);
  z-index: 10;
  pointer-events: none;
}

.float-bar-mini .float-pointer::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 2px solid transparent;
  border-right: 2px solid transparent;
  border-top: 2.5px solid #fff;
}

.float-bar-mini .float-pointer::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 2px solid transparent;
  border-right: 2px solid transparent;
  border-bottom: 2.5px solid #fff;
}

.float-value {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
  font-weight: 500;
  margin-top: 2px;
}

/* 查询模式对话框样式 */
.search-mode-dialog :deep(.el-dialog) {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.search-mode-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #2f2f2f;
}

.search-mode-dialog :deep(.el-dialog__title) {
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.search-mode-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.search-mode-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #2f2f2f;
}

.search-mode-selection {
  display: flex;
  justify-content: center;
}

.mode-radio-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-radio-item {
  width: 100%;
  margin: 0 !important;
  padding: 18px 20px !important;
  background-color: var(--bg-secondary) !important;
  border: 2px solid var(--border-default) !important;
  border-radius: 8px !important;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.mode-radio-item:hover {
  border-color: var(--accent-green) !important;
  background-color: var(--bg-tertiary) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.mode-radio-item.is-checked {
  border-color: var(--accent-green) !important;
  background-color: rgba(76, 175, 80, 0.1) !important;
  box-shadow: 0 0 16px rgba(76, 175, 80, 0.3);
}

.mode-radio-item :deep(.el-radio__input) {
  display: none;
}

.mode-radio-item :deep(.el-radio__label) {
  padding-left: 0;
  width: 100%;
}

.mode-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  width: 100%;
  text-align: center;
}

.mode-radio-item.is-checked .mode-title {
  color: var(--accent-green);
}

/* 第三方网站链接样式 */
.third-party-links {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem 0;
  align-items: center;
  justify-content: center;
  min-height: 70px;
}

.third-party-links .el-button {
  width: 85px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

/* 价格走势图表占位样式 */
.price-trend-container {
  width: 100%;
  height: 100%;
  padding: 0.5rem 0;
}

.price-trend-chart-placeholder {
  width: 100%;
  height: 100px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-secondary) 100%);
  border: 2px dashed var(--border-default);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.price-trend-chart-placeholder:hover {
  border-color: var(--accent-green);
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.2);
}

/* 模拟图表线条 */
.chart-mock {
  width: 90%;
  height: 60px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-line {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    transparent 20%,
    var(--accent-green) 20%,
    var(--accent-green) 40%,
    #8BC34A 60%,
    #FFC107 80%,
    #FF9800 100%
  );
  clip-path: polygon(
    0% 80%,
    20% 60%,
    40% 30%,
    60% 45%,
    80% 20%,
    100% 40%,
    100% 100%,
    0% 100%
  );
  opacity: 0.3;
}

.chart-line::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--accent-green) 20%,
    var(--accent-green) 40%,
    #8BC34A 60%,
    #FFC107 80%,
    #FF9800 100%
  );
  top: 0;
  left: 0;
  clip-path: polygon(
    0% 80%,
    20% 60%,
    40% 30%,
    60% 45%,
    80% 20%,
    100% 40%
  );
  opacity: 0.8;
  filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.6));
}

.chart-dots {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.chart-dots .dot {
  width: 6px;
  height: 6px;
  background: var(--accent-green);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.8);
  animation: pulse 2s ease-in-out infinite;
}

.chart-dots .dot:nth-child(1) {
  margin-top: 48px;
}

.chart-dots .dot:nth-child(2) {
  margin-top: 36px;
  animation-delay: 0.2s;
  background: var(--accent-green);
  box-shadow: 0 0 6px rgba(102, 187, 106, 0.8);
}

.chart-dots .dot:nth-child(3) {
  margin-top: 18px;
  animation-delay: 0.4s;
  background: #8BC34A;
  box-shadow: 0 0 6px rgba(139, 195, 74, 0.8);
}

.chart-dots .dot:nth-child(4) {
  margin-top: 27px;
  animation-delay: 0.6s;
  background: #FFC107;
  box-shadow: 0 0 6px rgba(255, 193, 7, 0.8);
}

.chart-dots .dot:nth-child(5) {
  margin-top: 12px;
  animation-delay: 0.8s;
  background: #FF9800;
  box-shadow: 0 0 6px rgba(255, 152, 0, 0.8);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.chart-placeholder-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
  margin-top: 0.25rem;
}

.price-trend-chart-placeholder:hover .chart-placeholder-text {
  color: var(--accent-green);
}

/* 对话框按钮样式 */
.search-mode-dialog :deep(.el-button) {
  min-width: 80px;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
}

.search-mode-dialog :deep(.el-button--primary) {
  background-color: var(--accent-green);
  border-color: var(--accent-green);
}

.search-mode-dialog :deep(.el-button--primary):hover {
  background-color: var(--accent-green);
  border-color: var(--accent-green);
}
</style>


