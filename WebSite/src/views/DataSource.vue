<template>
  <div>
    <div class="data-source-container">
      <div class="data-sources-list" :class="{ collapsed: isListCollapsed }">
        <!-- 空状态提示 -->
        <div v-if="dataSources.length === 0" class="card">
          <div class="empty-state">
            <el-empty description="暂无数据源">
              <div class="empty-actions">
                <el-button type="primary" @click="openAddDialogForNewSteam" size="large">
                  <el-icon :size="20" style="margin-right: 8px;"><Plus /></el-icon>
                  创建第一个数据源
                </el-button>
              </div>
            </el-empty>
          </div>
        </div>

        <!-- 按SteamID分组显示（有数据时） - 每个分组独立的BOX -->
        <template v-else>
          <div v-for="(group, steamID) in groupedDataSources" :key="steamID" class="steam-group-box">
            <div class="card">
              <div class="steam-group-header">
                <div class="steam-group-header-left">
                  <h4>
                    <el-icon><User /></el-icon>
                    SteamID: {{ steamID === '未设置' ? '未设置' : steamID }}
                    <el-tag size="small" type="info" style="margin-left: 10px;">{{ group.length }} 个数据源</el-tag>
                  </h4>
                </div>
                <div class="steam-group-header-right">
                  <div class="add-source-button" @click="openAddDialog(steamID)">
                    <el-icon :size="20"><Plus /></el-icon>
                    <span>添加数据源</span>
                  </div>
                </div>
              </div>
              <div class="grid grid-datasource">
                <!-- 现有数据源卡片 -->
                <div 
                  v-for="source in group" 
                  :key="source.dataID" 
                  class="source-card"
                >
                  <div class="source-header">
                    <div class="source-info">
                      <h4>{{ source.dataName }}</h4>
                      <el-tag :type="getSourceTypeColor(source.enabled)">{{ getSourceTypeLabel(source.type) }}</el-tag>
                    </div>
                  </div>
                  
                  
                  <div class="source-actions">
                    <el-button type="primary" size="small" @click="editSource(source)">
                      编辑
                    </el-button>
                    <el-button 
                      v-if="source.type !== 'perfectworld'"
                      type="warning" 
                      size="small" 
                      @click="startCollection(source)" 
                      :loading="collectingSourceIds.has(source.dataID)"
                    >
                      {{ collectingSourceIds.has(source.dataID) ? '采集中...' : '采集' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 新建SteamID分组区域 -->
      <div class="additional-box">
        <div class="card new-steam-group-card" @click="openAddDialogForNewSteam">
          <el-icon :size="32"><Plus /></el-icon>
          <span>新建SteamID分组</span>
        </div>
      </div>

    </div>

    <!-- 编辑数据源对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑数据源"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="handleEditDialogClose"
    >
      <el-form :model="editForm" label-width="120px" ref="editFormRef">
        <el-form-item label="数据源名称" required>
          <el-input 
            v-model="editForm.name" 
            placeholder="请输入数据源名称"
          />
        </el-form-item>
        <el-form-item label="数据源类型">
          <el-select v-model="editForm.type" placeholder="选择数据源类型" style="width: 100%;" disabled>
            <el-option label="Steam市场" value="steam" />
            <el-option label="Steam市场(登录)" value="steam_login" />
            <el-option label="完美世界APP" value="perfectworld" />
            <el-option label="网易BUFF" value="buff" />
            <el-option label="悠悠有品" value="youpin" />
          </el-select>
        </el-form-item>

        <!-- 悠悠有品特有配置 -->
        <template v-if="editForm.type === 'youpin'">
          <el-form-item>
            <el-button 
              type="success" 
              @click="startYyypTokenCollection(true)" 
              :loading="yyypTokenLoading"
              :disabled="yyypTokenStatus === 'success'"
              style="width: 100%;"
            >
              <el-icon style="margin-right: 5px;"><Grid /></el-icon>
              {{ yyypTokenLoading ? '正在获取令牌...' : yyypTokenStatus === 'success' ? '✓ 令牌已获取' : '重新获取悠悠有品令牌' }}
            </el-button>
            <div v-if="yyypTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
              <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
                <el-icon><Loading /></el-icon> 等待手机APP访问...
              </div>
              <div style="color: #666; font-size: 12px;">
                1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
                2. 打开悠悠有品APP并登录<br/>
                3. 系统将自动获取令牌
              </div>
            </div>
            <div v-if="yyypTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
              <div style="color: #52c41a; font-weight: 500;">
                <el-icon><CircleCheck /></el-icon> 令牌获取成功!
              </div>
            </div>
          </el-form-item>
          
          
          <!-- 基础配置 -->
          <el-collapse v-model="editYyypBasicCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="基础配置" name="basic">
              <el-form-item label="手机号" required>
                <el-input v-model="editForm.phone" placeholder="请输入手机号" />
              </el-form-item>
              <el-form-item label="应用版本" required>
                <el-input v-model="editForm.appVersion" placeholder="请输入应用版本" />
              </el-form-item>
              <el-form-item label="应用类型" required>
                <el-input v-model="editForm.appType" placeholder="请输入应用类型" />
              </el-form-item>
              <el-form-item label="用户ID" required>
                <el-input v-model="editForm.userId" placeholder="请输入用户ID" />
              </el-form-item>
              <el-form-item label="SteamID" required>
                <el-input v-model="editForm.steamId" placeholder="请输入SteamID" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 认证令牌配置 -->
          <el-collapse v-model="editYyypTokenCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="认证令牌配置" name="token">
              <el-form-item label="Session ID" required>
                <el-input v-model="editForm.sessionid" placeholder="请输入Session ID" />
              </el-form-item>
              <el-form-item label="Token" required>
                <el-input 
                  v-model="editForm.token" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入Token"
                />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 设备信息配置 -->
          <el-collapse v-model="editYyypDeviceCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="设备信息配置" name="device">
              <el-form-item label="设备名称" required>
                <el-input v-model="editForm.deviceName" placeholder="请输入设备名称" />
              </el-form-item>
              <el-form-item label="Device Token" required>
                <el-input v-model="editForm.devicetoken" placeholder="请输入Device Token" />
              </el-form-item>
              <el-form-item label="Device ID" required>
                <el-input v-model="editForm.deviceid" placeholder="请输入Device ID" />
              </el-form-item>
              <el-form-item label="Device Info" required>
                <el-input 
                  v-model="editForm.deviceInfo" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入Device Info (JSON格式)"
                />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 高级密钥配置 -->
          <el-collapse v-model="editYyypAdvancedCollapse">
            <el-collapse-item title="高级密钥配置" name="advanced">
              <el-form-item label="Device UK" required>
                <el-input 
                  v-model="editForm.deviceuk" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入Device UK"
                />
              </el-form-item>
              <el-form-item label="UK" required>
                <el-input 
                  v-model="editForm.uk" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入UK"
                />
              </el-form-item>
              <el-form-item label="SK" required>
                <el-input 
                  v-model="editForm.sk" 
                  type="textarea"
                  :rows="3"
                  placeholder="请输入SK"
                />
              </el-form-item>
              <el-form-item label="Tracestate" required>
                <el-input 
                  v-model="editForm.tracestate" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入Tracestate"
                />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>

        <!-- BUFF特有配置 -->
        <template v-else-if="editForm.type === 'buff'">
          <el-form-item>
            <el-button 
              type="success" 
              @click="startBuffTokenCollection(true)" 
              :loading="buffTokenLoading"
              :disabled="buffTokenStatus === 'success'"
              style="width: 100%;"
            >
              <el-icon style="margin-right: 5px;"><Grid /></el-icon>
              {{ buffTokenLoading ? '正在获取令牌...' : buffTokenStatus === 'success' ? '✓ 令牌已获取' : '重新获取BUFF令牌' }}
            </el-button>
            <div v-if="buffTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
              <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
                <el-icon><Loading /></el-icon> 等待手机APP访问...
              </div>
              <div style="color: #666; font-size: 12px;">
                1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
                2. 打开BUFF APP并登录<br/>
                3. 系统将自动获取令牌
              </div>
            </div>
            <div v-if="buffTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
              <div style="color: #52c41a; font-weight: 500;">
                <el-icon><CircleCheck /></el-icon> 令牌获取成功!
              </div>
            </div>
          </el-form-item>
          
          
          <!-- 基础配置 -->
          <el-collapse v-model="editBuffBasicCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="基础配置" name="basic">
              <el-form-item label="SteamID" required>
                <el-input v-model="editForm.steamID" placeholder="请输入SteamID" />
              </el-form-item>
              <el-form-item label="Cookie" required>
                <el-input 
                  v-model="editForm.cookie" 
                  type="textarea"
                  :rows="3"
                  placeholder="请输入Cookie"
                />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 应用信息配置 -->
          <el-collapse v-model="editBuffAppCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="应用信息配置" name="app">
              <el-form-item label="app-version" required>
                <el-input v-model="editForm.buffAppVersion" placeholder="请输入app-version" />
              </el-form-item>
              <el-form-item label="app-version-code">
                <el-input v-model="editForm.buffAppVersionCode" placeholder="请输入app-version-code" />
              </el-form-item>
              <el-form-item label="channel">
                <el-input v-model="editForm.buffChannel" placeholder="请输入channel" />
              </el-form-item>
              <el-form-item label="user-agent">
                <el-input v-model="editForm.buffUserAgent" placeholder="请输入user-agent" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 设备信息配置 -->
          <el-collapse v-model="editBuffDeviceCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="设备信息配置" name="device">
              <el-form-item label="device-id">
                <el-input v-model="editForm.buffDeviceId" placeholder="请输入device-id" />
              </el-form-item>
              <el-form-item label="device-id-weak">
                <el-input v-model="editForm.buffDeviceIdWeak" placeholder="请输入device-id-weak" />
              </el-form-item>
              <el-form-item label="devicename">
                <el-input v-model="editForm.buffDevicename" placeholder="请输入devicename" />
              </el-form-item>
              <el-form-item label="brand">
                <el-input v-model="editForm.buffBrand" placeholder="请输入brand" />
              </el-form-item>
              <el-form-item label="manufacturer">
                <el-input v-model="editForm.buffManufacturer" placeholder="请输入manufacturer" />
              </el-form-item>
              <el-form-item label="model">
                <el-input v-model="editForm.buffModel" placeholder="请输入model" />
              </el-form-item>
              <el-form-item label="product">
                <el-input v-model="editForm.buffProduct" placeholder="请输入product" />
              </el-form-item>
              <el-form-item label="build-fingerprint">
                <el-input v-model="editForm.buffBuildFingerprint" placeholder="请输入build-fingerprint" />
              </el-form-item>
              <el-form-item label="seed">
                <el-input v-model="editForm.buffSeed" placeholder="请输入seed" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 系统信息配置 -->
          <el-collapse v-model="editBuffSystemCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="系统信息配置" name="system">
              <el-form-item label="system-type">
                <el-input v-model="editForm.buffSystemType" placeholder="请输入system-type" />
              </el-form-item>
              <el-form-item label="system-version">
                <el-input v-model="editForm.buffSystemVersion" placeholder="请输入system-version" />
              </el-form-item>
              <el-form-item label="rom">
                <el-input v-model="editForm.buffRom" placeholder="请输入rom" />
              </el-form-item>
              <el-form-item label="rom-id">
                <el-input v-model="editForm.buffRomId" placeholder="请输入rom-id" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 显示与网络配置 -->
          <el-collapse v-model="editBuffDisplayCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="显示与网络配置" name="display">
              <el-form-item label="resolution">
                <el-input v-model="editForm.buffResolution" placeholder="请输入resolution" />
              </el-form-item>
              <el-form-item label="screen-density">
                <el-input v-model="editForm.buffScreenDensity" placeholder="请输入screen-density" />
              </el-form-item>
              <el-form-item label="screen-size">
                <el-input v-model="editForm.buffScreenSize" placeholder="请输入screen-size" />
              </el-form-item>
              <el-form-item label="network">
                <el-input v-model="editForm.buffNetwork" placeholder="请输入network" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
          
          <!-- 时区与本地化配置 -->
          <el-collapse v-model="editBuffLocaleCollapse" style="margin-bottom: 20px;">
            <el-collapse-item title="时区与本地化配置" name="locale">
              <el-form-item label="timestamp">
                <el-input v-model="editForm.buffTimestamp" placeholder="请输入timestamp" />
              </el-form-item>
              <el-form-item label="timezone">
                <el-input v-model="editForm.buffTimezone" placeholder="请输入timezone" />
              </el-form-item>
              <el-form-item label="timezone-offset">
                <el-input v-model="editForm.buffTimezoneOffset" placeholder="请输入timezone-offset" />
              </el-form-item>
              <el-form-item label="timezone-offset-dst">
                <el-input v-model="editForm.buffTimezoneOffsetDst" placeholder="请输入timezone-offset-dst" />
              </el-form-item>
              <el-form-item label="locale">
                <el-input v-model="editForm.buffLocale" placeholder="请输入locale" />
              </el-form-item>
              <el-form-item label="locale-supported">
                <el-input v-model="editForm.buffLocaleSupported" placeholder="请输入locale-supported" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>

        <!-- Steam特有配置 -->
        <template v-else-if="editForm.type === 'steam'">
          <!-- Steam配置 -->
          <el-collapse v-model="editSteamCollapse">
            <el-collapse-item title="Steam配置" name="config">
              <!-- Cookie获取方式选择 -->
              <el-form-item label="Cookie获取方式" required>
                <el-radio-group v-model="editForm.steamCookieMethod">
                  <el-radio label="qrcode">扫码登录</el-radio>
                  <el-radio label="password" disabled>账号密码登录（暂不可用）</el-radio>
                  <el-radio label="manual">手动输入</el-radio>
                </el-radio-group>
              </el-form-item>

              <!-- 扫码登录 -->
              <template v-if="editForm.steamCookieMethod === 'qrcode'">
            <el-form-item label="登录二维码">
              <div 
                @click="steamQRStatus !== 'success' ? handleEditGenerateQRCode() : null"
                :style="{
                  textAlign: 'center', 
                  padding: '20px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  cursor: steamQRStatus === 'success' ? 'default' : 'pointer',
                  transition: 'all 0.3s'
                }"
                @mouseenter="$event.currentTarget.style.background = steamQRStatus === 'success' ? '#f5f5f5' : '#e8e8e8'"
                @mouseleave="$event.currentTarget.style.background = '#f5f5f5'"
              >
                <div v-if="!steamQRCode && !steamQRLoading">
                  <el-icon :size="80" color="#409EFF"><Grid /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px; font-weight: 500;">点击获取Steam登录二维码</p>
                </div>
                <div v-else-if="steamQRLoading">
                  <el-icon :size="80" class="is-loading" color="#409EFF"><Loading /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px;">正在获取二维码...</p>
                </div>
                <div v-else>
                  <img :src="steamQRCode" alt="Steam登录二维码" style="width: 200px; height: 200px;" />
                  <p style="color: #666; margin-top: 10px; font-size: 14px;">
                    请使用Steam手机APP扫描二维码
                  </p>
                  <el-tag :type="steamQRStatus === 'waiting' ? 'info' : steamQRStatus === 'success' ? 'success' : 'warning'" style="margin-top: 10px;">
                    {{ getSteamQRStatusText() }}
                  </el-tag>
                  <div v-if="steamQRStatus === 'expired'" style="margin-top: 10px;">
                    <el-link type="primary" :underline="false" @click.stop="handleEditGenerateQRCode">
                      点击刷新二维码
                    </el-link>
                  </div>
                </div>
              </div>
            </el-form-item>
          </template>

          <!-- 账号密码登录 -->
          <template v-else-if="editForm.steamCookieMethod === 'password'">
            <el-form-item label="Steam用户名" required>
              <el-input 
                v-model="editForm.steamUsername" 
                placeholder="请输入Steam用户名"
              />
            </el-form-item>
            <el-form-item label="Steam密码" required>
              <el-input 
                v-model="editForm.steamPassword" 
                type="password"
                show-password
                placeholder="请输入Steam密码"
              />
            </el-form-item>
            <el-form-item label="Steam Guard验证码">
              <el-input 
                v-model="editForm.steamTwofactorCode" 
                placeholder="请输入5位Steam Guard验证码（如需要）"
                maxlength="5"
              />
              <div style="color: #999; font-size: 12px; margin-top: 5px;">
                如果您的账号启用了Steam Guard手机令牌，请在此输入验证码
              </div>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="success" 
                @click="handleEditSteamLogin" 
                :loading="steamLoginLoading"
                style="width: 100%;"
              >
                {{ steamLoginLoading ? '登录中...' : '重新登录获取Cookie' }}
              </el-button>
            </el-form-item>
          </template>

          <!-- 手动输入Cookie -->
          <template v-else-if="editForm.steamCookieMethod === 'manual'">
            <el-form-item label="Cookies" required>
              <el-input 
                v-model="editForm.cookies" 
                type="textarea"
                :rows="3"
                placeholder="请输入Steam市场的Cookies"
              />
            </el-form-item>
          </template>

              <el-form-item label="SteamID" required>
                <el-input 
                  v-model="editForm.steamID" 
                  placeholder="请输入SteamID"
                />
              </el-form-item>
              
              <el-form-item label="更新频率">
                <el-select v-model="editForm.updateFreq" placeholder="选择更新频率" style="width: 100%;">
                  <el-option label="每15分钟" value="15min" />
                  <el-option label="每小时" value="1hour" />
                  <el-option label="每3小时" value="3hour" />
                  <el-option label="每6小时" value="6hour" />
                  <el-option label="每12小时" value="12hour" />
                  <el-option label="每天" value="daily" />
                </el-select>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>

        <!-- Steam登录特有配置（兼容旧数据，使用与steam相同的表单） -->
        <template v-else-if="editForm.type === 'steam_login'">
          <!-- Steam配置 -->
          <el-collapse v-model="editSteamLoginCollapse">
            <el-collapse-item title="Steam配置" name="config">
              <!-- Cookie获取方式选择 -->
              <el-form-item label="Cookie获取方式" required>
                <el-radio-group v-model="editForm.steamCookieMethod">
                  <el-radio label="qrcode">扫码登录</el-radio>
                  <el-radio label="password" disabled>账号密码登录（暂不可用）</el-radio>
                  <el-radio label="manual">手动输入</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 扫码登录 -->
          <template v-if="editForm.steamCookieMethod === 'qrcode'">
            <el-form-item label="登录二维码">
              <div 
                @click="steamQRStatus !== 'success' ? handleEditGenerateQRCode() : null"
                :style="{
                  textAlign: 'center', 
                  padding: '20px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  cursor: steamQRStatus === 'success' ? 'default' : 'pointer',
                  transition: 'all 0.3s'
                }"
                @mouseenter="$event.currentTarget.style.background = steamQRStatus === 'success' ? '#f5f5f5' : '#e8e8e8'"
                @mouseleave="$event.currentTarget.style.background = '#f5f5f5'"
              >
                <div v-if="!steamQRCode && !steamQRLoading">
                  <el-icon :size="80" color="#409EFF"><Grid /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px; font-weight: 500;">点击获取Steam登录二维码</p>
                </div>
                <div v-else-if="steamQRLoading">
                  <el-icon :size="80" class="is-loading" color="#409EFF"><Loading /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px;">正在获取二维码...</p>
                </div>
                <div v-else>
                  <img :src="steamQRCode" alt="Steam登录二维码" style="width: 200px; height: 200px;" />
                  <p style="color: #666; margin-top: 10px; font-size: 14px;">
                    请使用Steam手机APP扫描二维码
                  </p>
                  <el-tag :type="steamQRStatus === 'waiting' ? 'info' : steamQRStatus === 'success' ? 'success' : 'warning'" style="margin-top: 10px;">
                    {{ getSteamQRStatusText() }}
                  </el-tag>
                  <div v-if="steamQRStatus === 'expired'" style="margin-top: 10px;">
                    <el-link type="primary" :underline="false" @click.stop="handleEditGenerateQRCode">
                      点击刷新二维码
                    </el-link>
                  </div>
                </div>
              </div>
            </el-form-item>
          </template>

          <!-- 账号密码登录 -->
          <template v-else-if="editForm.steamCookieMethod === 'password'">
            <el-form-item label="Steam用户名" required>
              <el-input 
                v-model="editForm.steamUsername" 
                placeholder="请输入Steam用户名"
              />
            </el-form-item>
            <el-form-item label="Steam密码" required>
              <el-input 
                v-model="editForm.steamPassword" 
                type="password"
                show-password
                placeholder="请输入Steam密码"
              />
            </el-form-item>
            <el-form-item label="Steam Guard验证码">
              <el-input 
                v-model="editForm.steamTwofactorCode" 
                placeholder="请输入5位Steam Guard验证码（如需要）"
                maxlength="5"
              />
              <div style="color: #999; font-size: 12px; margin-top: 5px;">
                如果您的账号启用了Steam Guard手机令牌，请在此输入验证码
              </div>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="success" 
                @click="handleEditSteamLogin" 
                :loading="steamLoginLoading"
                style="width: 100%;"
              >
                {{ steamLoginLoading ? '登录中...' : '重新登录获取Cookie' }}
              </el-button>
            </el-form-item>
          </template>

          <!-- 手动输入Cookie -->
          <template v-else-if="editForm.steamCookieMethod === 'manual'">
            <el-form-item label="Cookies" required>
              <el-input 
                v-model="editForm.cookies" 
                type="textarea"
                :rows="3"
                placeholder="请输入Steam市场的Cookies"
              />
            </el-form-item>
          </template>

              <el-form-item label="SteamID" required>
                <el-input 
                  v-model="editForm.steamID" 
                  placeholder="请输入SteamID"
                />
              </el-form-item>
              
              <el-form-item label="更新频率">
                <el-select v-model="editForm.updateFreq" placeholder="选择更新频率" style="width: 100%;">
                  <el-option label="每15分钟" value="15min" />
                  <el-option label="每小时" value="1hour" />
                  <el-option label="每3小时" value="3hour" />
                  <el-option label="每6小时" value="6hour" />
                  <el-option label="每12小时" value="12hour" />
                  <el-option label="每天" value="daily" />
                </el-select>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>

        <!-- 完美世界APP特有配置 -->
        <template v-else-if="editForm.type === 'perfectworld'">
          <el-form-item>
            <el-button 
              type="success" 
              @click="startPerfectWorldTokenCollection(true)" 
              :loading="perfectWorldTokenLoading"
              :disabled="perfectWorldTokenStatus === 'success'"
              style="width: 100%;"
            >
              <el-icon style="margin-right: 5px;"><Grid /></el-icon>
              {{ perfectWorldTokenLoading ? '正在获取令牌...' : perfectWorldTokenStatus === 'success' ? '✓ 令牌已获取' : '重新获取完美世界APP令牌' }}
            </el-button>
            <div v-if="perfectWorldTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
              <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
                <el-icon><Loading /></el-icon> 等待手机APP访问...
              </div>
              <div style="color: #666; font-size: 12px;">
                1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
                2. 打开完美世界APP并登录<br/>
                3. 系统将自动获取令牌
              </div>
            </div>
            <div v-if="perfectWorldTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
              <div style="color: #52c41a; font-weight: 500;">
                <el-icon><CircleCheck /></el-icon> 令牌获取成功!
              </div>
            </div>
          </el-form-item>
          
          <!-- 完美世界配置 -->
          <el-collapse v-model="editPerfectWorldCollapse">
            <el-collapse-item title="完美世界APP配置" name="config">
              <el-form-item label="appversion" required>
                <el-input v-model="editForm.appversion" placeholder="请输入appversion" />
              </el-form-item>
              <el-form-item label="device" required>
                <el-input v-model="editForm.device" placeholder="请输入device" />
              </el-form-item>
              <el-form-item label="gameType" required>
                <el-input v-model="editForm.gameType" placeholder="请输入gameType" />
              </el-form-item>
              <el-form-item label="platform" required>
                <el-input v-model="editForm.platform" placeholder="请输入platform" />
              </el-form-item>
              <el-form-item label="token" required>
                <el-input 
                  v-model="editForm.pwToken" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入token"
                />
              </el-form-item>
              <el-form-item label="tdSign" required>
                <el-input 
                  v-model="editForm.tdSign" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入tdSign"
                />
              </el-form-item>
              <el-form-item label="SteamID" required>
                <el-input v-model="editForm.pwSteamID" placeholder="请输入SteamID" />
              </el-form-item>
              <el-form-item label="更新频率">
                <el-select v-model="editForm.updateFreq" placeholder="选择更新频率" style="width: 100%;">
                  <el-option label="每15分钟" value="15min" />
                  <el-option label="每小时" value="1hour" />
                  <el-option label="每3小时" value="3hour" />
                  <el-option label="每6小时" value="6hour" />
                  <el-option label="每12小时" value="12hour" />
                  <el-option label="每天" value="daily" />
                </el-select>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>

        <!-- 通用配置 -->
        <template v-else>
          <el-form-item label="API地址">
            <el-input v-model="editForm.apiUrl" placeholder="请输入API地址" />
          </el-form-item>
          <el-form-item label="API密钥">
            <el-input 
              v-model="editForm.apiKey" 
              type="textarea"
              :rows="2"
              placeholder="请输入API密钥"
            />
          </el-form-item>
          <el-form-item label="休眠时间(秒)">
            <el-input-number v-model="editForm.sleepTime" :min="1" :max="86400" style="width: 100%;" />
          </el-form-item>
        </template>

        <el-form-item v-if="editForm.type === 'youpin' || editForm.type === 'buff'" label="是否自动采集">
          <el-switch v-model="editForm.enabled" />
        </el-form-item>

      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <div class="dialog-footer-left">
            <el-button 
              v-if="editForm.type === 'youpin'" 
              type="warning" 
              @click="handleEditCollectAll"
              :loading="collectingSourceIds.has(editingSourceId)"
            >
              全部采集
            </el-button>
            <el-button 
              v-if="editForm.type === 'buff'" 
              type="warning" 
              @click="handleEditBuffCollectAll"
              :loading="collectingSourceIds.has(editingSourceId)"
            >
              全部获取
            </el-button>
            <el-button 
              v-if="editForm.type === 'steam'" 
              type="warning" 
              @click="handleEditSteamCollectAll"
              :loading="collectingSourceIds.has(editingSourceId)"
            >
              全部采集
            </el-button>
            <el-button 
              type="danger" 
              @click="handleEditDelete"
            >
              删除数据源
            </el-button>
          </div>
          <div class="dialog-footer-right">
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleEditSubmit" :loading="editSubmitting">
              保存更改
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 添加数据源对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加新数据源"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="handleAddDialogClose"
    >
      <el-form :model="inputForm" label-width="120px" @submit.prevent="handleSubmit">
        <el-form-item label="数据源名称" required>
          <el-input 
            v-model="inputForm.name" 
            placeholder="请输入数据源名称"
          />
        </el-form-item>
        <el-form-item label="数据源类型" required>
          <el-select v-model="inputForm.type" placeholder="选择数据源类型" style="width: 100%;">
            <el-option 
              label="Steam市场" 
              value="steam" 
              :disabled="isTypeDisabled('steam')"
            >
              <span>Steam市场</span>
              <span v-if="isTypeDisabled('steam')" style="color: #909399; font-size: 12px; margin-left: 10px;">(已存在)</span>
            </el-option>
            <el-option 
              label="完美世界APP" 
              value="perfectworld" 
              :disabled="isTypeDisabled('perfectworld')"
            >
              <span>完美世界APP</span>
              <span v-if="isTypeDisabled('perfectworld')" style="color: #909399; font-size: 12px; margin-left: 10px;">(已存在)</span>
            </el-option>
            <el-option 
              label="网易BUFF" 
              value="buff" 
              :disabled="isTypeDisabled('buff')"
            >
              <span>网易BUFF</span>
              <span v-if="isTypeDisabled('buff')" style="color: #909399; font-size: 12px; margin-left: 10px;">(已存在)</span>
            </el-option>
            <el-option 
              label="悠悠有品" 
              value="youpin" 
              :disabled="isTypeDisabled('youpin')"
            >
              <span>悠悠有品</span>
              <span v-if="isTypeDisabled('youpin')" style="color: #909399; font-size: 12px; margin-left: 10px;">(已存在)</span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <!-- BUFF特有配置 -->
        <template v-if="inputForm.type === 'buff'">
          <el-form-item>
            <el-button 
              type="success" 
              @click="startBuffTokenCollection(false)" 
              :loading="buffTokenLoading"
              :disabled="buffTokenStatus === 'success'"
              style="width: 100%;"
            >
              <el-icon style="margin-right: 5px;"><Grid /></el-icon>
              {{ buffTokenLoading ? '正在获取令牌...' : buffTokenStatus === 'success' ? '✓ 令牌已获取' : '一键获取BUFF令牌' }}
            </el-button>
            <div v-if="buffTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
              <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
                <el-icon><Loading /></el-icon> 等待手机APP访问...
              </div>
              <div style="color: #666; font-size: 12px;">
                1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
                2. 打开BUFF APP并登录<br/>
                3. 系统将自动获取令牌
              </div>
            </div>
            <div v-if="buffTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
              <div style="color: #52c41a; font-weight: 500;">
                <el-icon><CircleCheck /></el-icon> 令牌获取成功!
              </div>
            </div>
          </el-form-item>
          
          <!-- BUFF配置 -->
          <el-collapse v-model="inputBuffCollapse">
            <el-collapse-item title="BUFF配置" name="config">
              <el-form-item label="app-version" required>
                <el-input v-model="inputForm.buffAppVersion" placeholder="请输入app-version" />
              </el-form-item>
              <el-form-item label="app-version-code">
                <el-input v-model="inputForm.buffAppVersionCode" placeholder="请输入app-version-code" />
              </el-form-item>
              <el-form-item label="brand">
                <el-input v-model="inputForm.buffBrand" placeholder="请输入brand" />
              </el-form-item>
              <el-form-item label="build-fingerprint">
                <el-input v-model="inputForm.buffBuildFingerprint" placeholder="请输入build-fingerprint" />
              </el-form-item>
              <el-form-item label="channel">
                <el-input v-model="inputForm.buffChannel" placeholder="请输入channel" />
              </el-form-item>
              <el-form-item label="device-id">
                <el-input v-model="inputForm.buffDeviceId" placeholder="请输入device-id" />
              </el-form-item>
              <el-form-item label="device-id-weak">
                <el-input v-model="inputForm.buffDeviceIdWeak" placeholder="请输入device-id-weak" />
              </el-form-item>
              <el-form-item label="manufacturer">
                <el-input v-model="inputForm.buffManufacturer" placeholder="请输入manufacturer" />
              </el-form-item>
              <el-form-item label="model">
                <el-input v-model="inputForm.buffModel" placeholder="请输入model" />
              </el-form-item>
              <el-form-item label="network">
                <el-input v-model="inputForm.buffNetwork" placeholder="请输入network" />
              </el-form-item>
              <el-form-item label="product">
                <el-input v-model="inputForm.buffProduct" placeholder="请输入product" />
              </el-form-item>
              <el-form-item label="resolution">
                <el-input v-model="inputForm.buffResolution" placeholder="请输入resolution" />
              </el-form-item>
              <el-form-item label="rom">
                <el-input v-model="inputForm.buffRom" placeholder="请输入rom" />
              </el-form-item>
              <el-form-item label="rom-id">
                <el-input v-model="inputForm.buffRomId" placeholder="请输入rom-id" />
              </el-form-item>
              <el-form-item label="screen-density">
                <el-input v-model="inputForm.buffScreenDensity" placeholder="请输入screen-density" />
              </el-form-item>
              <el-form-item label="screen-size">
                <el-input v-model="inputForm.buffScreenSize" placeholder="请输入screen-size" />
              </el-form-item>
              <el-form-item label="seed">
                <el-input v-model="inputForm.buffSeed" placeholder="请输入seed" />
              </el-form-item>
              <el-form-item label="system-type">
                <el-input v-model="inputForm.buffSystemType" placeholder="请输入system-type" />
              </el-form-item>
              <el-form-item label="system-version">
                <el-input v-model="inputForm.buffSystemVersion" placeholder="请输入system-version" />
              </el-form-item>
              <el-form-item label="timestamp">
                <el-input v-model="inputForm.buffTimestamp" placeholder="请输入timestamp" />
              </el-form-item>
              <el-form-item label="timezone">
                <el-input v-model="inputForm.buffTimezone" placeholder="请输入timezone" />
              </el-form-item>
              <el-form-item label="timezone-offset">
                <el-input v-model="inputForm.buffTimezoneOffset" placeholder="请输入timezone-offset" />
              </el-form-item>
              <el-form-item label="timezone-offset-dst">
                <el-input v-model="inputForm.buffTimezoneOffsetDst" placeholder="请输入timezone-offset-dst" />
              </el-form-item>
              <el-form-item label="user-agent">
                <el-input v-model="inputForm.buffUserAgent" placeholder="请输入user-agent" />
              </el-form-item>
              <el-form-item label="locale">
                <el-input v-model="inputForm.buffLocale" placeholder="请输入locale" />
              </el-form-item>
              <el-form-item label="locale-supported">
                <el-input v-model="inputForm.buffLocaleSupported" placeholder="请输入locale-supported" />
              </el-form-item>
              <el-form-item label="devicename">
                <el-input v-model="inputForm.buffDevicename" placeholder="请输入devicename" />
              </el-form-item>
              <el-form-item label="Cookie" required>
                <el-input 
                  v-model="inputForm.cookie" 
                  type="textarea"
                  :rows="3"
                  placeholder="请输入Cookie"
                />
              </el-form-item>
              <el-form-item label="SteamID" required>
                <el-input v-model="inputForm.steamID" placeholder="请输入SteamID" />
              </el-form-item>
              <el-form-item label="更新频率">
                <el-select v-model="inputForm.updateFreq" placeholder="选择更新频率" style="width: 100%;">
                  <el-option label="每15分钟" value="15min" />
                  <el-option label="每小时" value="1hour" />
                  <el-option label="每3小时" value="3hour" />
                  <el-option label="每6小时" value="6hour" />
                  <el-option label="每12小时" value="12hour" />
                  <el-option label="每天" value="daily" />
                </el-select>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>
        
        <!-- Steam特有配置 -->
        <template v-else-if="inputForm.type === 'steam'">
          <!-- Cookie获取方式选择 -->
          <el-form-item label="Cookie获取方式" required>
            <el-radio-group v-model="inputForm.steamCookieMethod">
              <el-radio label="qrcode">扫码登录</el-radio>
              <el-radio label="password" disabled>账号密码登录（暂不可用）</el-radio>
              <el-radio label="manual">手动输入</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 扫码登录 -->
          <template v-if="inputForm.steamCookieMethod === 'qrcode'">
            <el-form-item label="登录二维码">
              <div 
                @click="steamQRStatus !== 'success' ? handleGenerateQRCode() : null"
                :style="{
                  textAlign: 'center', 
                  padding: '20px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  cursor: steamQRStatus === 'success' ? 'default' : 'pointer',
                  transition: 'all 0.3s'
                }"
                @mouseenter="$event.currentTarget.style.background = steamQRStatus === 'success' ? '#f5f5f5' : '#e8e8e8'"
                @mouseleave="$event.currentTarget.style.background = '#f5f5f5'"
              >
                <div v-if="!steamQRCode && !steamQRLoading">
                  <el-icon :size="80" color="#409EFF"><Grid /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px; font-weight: 500;">点击获取Steam登录二维码</p>
                </div>
                <div v-else-if="steamQRLoading">
                  <el-icon :size="80" class="is-loading" color="#409EFF"><Loading /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px;">正在获取二维码...</p>
                </div>
                <div v-else>
                  <img :src="steamQRCode" alt="Steam登录二维码" style="width: 200px; height: 200px;" />
                  <p style="color: #666; margin-top: 10px; font-size: 14px;">
                    请使用Steam手机APP扫描二维码
                  </p>
                  <el-tag :type="steamQRStatus === 'waiting' ? 'info' : steamQRStatus === 'success' ? 'success' : 'warning'" style="margin-top: 10px;">
                    {{ getSteamQRStatusText() }}
                  </el-tag>
                  <div v-if="steamQRStatus === 'expired'" style="margin-top: 10px;">
                    <el-link type="primary" :underline="false" @click.stop="handleGenerateQRCode">
                      点击刷新二维码
                    </el-link>
                  </div>
                </div>
              </div>
            </el-form-item>
          </template>

          <!-- 账号密码登录 -->
          <template v-else-if="inputForm.steamCookieMethod === 'password'">
            <el-form-item label="Steam用户名" required>
              <el-input 
                v-model="inputForm.steamUsername" 
                placeholder="请输入Steam用户名"
              />
            </el-form-item>
            <el-form-item label="Steam密码" required>
              <el-input 
                v-model="inputForm.steamPassword" 
                type="password"
                show-password
                placeholder="请输入Steam密码"
              />
            </el-form-item>
            <el-form-item label="Steam Guard验证码">
              <el-input 
                v-model="inputForm.steamTwofactorCode" 
                placeholder="请输入5位Steam Guard验证码（如需要）"
                maxlength="5"
              />
              <div style="color: #999; font-size: 12px; margin-top: 5px;">
                如果您的账号启用了Steam Guard手机令牌，请在此输入验证码
              </div>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="success" 
                @click="handleSteamLogin" 
                :loading="steamLoginLoading"
                style="width: 100%;"
              >
                {{ steamLoginLoading ? '登录中...' : '立即登录获取Cookie' }}
              </el-button>
            </el-form-item>
          </template>

          <!-- 手动输入Cookie -->
          <template v-else-if="inputForm.steamCookieMethod === 'manual'">
            <el-form-item label="Cookies" required>
              <el-input 
                v-model="inputForm.cookies" 
                type="textarea"
                :rows="3"
                placeholder="请输入Steam市场的Cookies"
              />
            </el-form-item>
          </template>

          <el-form-item label="SteamID" required>
            <el-input 
              v-model="inputForm.steamID" 
              placeholder="请输入SteamID"
            />
          </el-form-item>
          
          
          <!-- 登录状态提示 -->
          <el-alert
            v-if="inputForm.steamLoginMessage"
            :title="inputForm.steamLoginMessage"
            :type="inputForm.steamLoginSuccess ? 'success' : 'warning'"
            :closable="false"
            show-icon
            style="margin-top: 10px;"
          />
        </template>

        <!-- Steam登录特有配置（已废弃，保留兼容） -->
        <template v-else-if="inputForm.type === 'steam_login'">
          <!-- 登录方式选择 -->
          <el-form-item label="登录方式" required>
            <el-radio-group v-model="inputForm.steamLoginMethod">
              <el-radio label="qrcode">扫码登录（推荐）</el-radio>
              <el-radio label="password">账号密码登录</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 扫码登录 -->
          <template v-if="inputForm.steamLoginMethod === 'qrcode'">
            <el-form-item label="登录二维码">
              <div 
                @click="steamQRStatus !== 'success' ? handleGenerateQRCode() : null"
                :style="{
                  textAlign: 'center', 
                  padding: '20px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  cursor: steamQRStatus === 'success' ? 'default' : 'pointer',
                  transition: 'all 0.3s'
                }"
                @mouseenter="$event.currentTarget.style.background = steamQRStatus === 'success' ? '#f5f5f5' : '#e8e8e8'"
                @mouseleave="$event.currentTarget.style.background = '#f5f5f5'"
              >
                <div v-if="!steamQRCode && !steamQRLoading">
                  <el-icon :size="80" color="#409EFF"><Grid /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px; font-weight: 500;">点击获取Steam登录二维码</p>
                </div>
                <div v-else-if="steamQRLoading">
                  <el-icon :size="80" class="is-loading" color="#409EFF"><Loading /></el-icon>
                  <p style="color: #409EFF; margin-top: 10px;">正在获取二维码...</p>
                </div>
                <div v-else>
                  <img :src="steamQRCode" alt="Steam登录二维码" style="width: 200px; height: 200px;" />
                  <p style="color: #666; margin-top: 10px; font-size: 14px;">
                    请使用Steam手机APP扫描二维码
                  </p>
                  <el-tag :type="steamQRStatus === 'waiting' ? 'info' : steamQRStatus === 'success' ? 'success' : 'warning'" style="margin-top: 10px;">
                    {{ getSteamQRStatusText() }}
                  </el-tag>
                  <div v-if="steamQRStatus === 'expired'" style="margin-top: 10px;">
                    <el-link type="primary" :underline="false" @click.stop="handleGenerateQRCode">
                      点击刷新二维码
                    </el-link>
                  </div>
                </div>
              </div>
            </el-form-item>
          </template>

          <!-- 账号密码登录 -->
          <template v-else-if="inputForm.steamLoginMethod === 'password'">
            <el-form-item label="Steam用户名" required>
              <el-input 
                v-model="inputForm.steamUsername" 
                placeholder="请输入Steam用户名"
              />
            </el-form-item>
            <el-form-item label="Steam密码" required>
              <el-input 
                v-model="inputForm.steamPassword" 
                type="password"
                show-password
                placeholder="请输入Steam密码"
              />
            </el-form-item>
            <el-form-item label="Steam Guard验证码">
              <el-input 
                v-model="inputForm.steamTwofactorCode" 
                placeholder="请输入5位Steam Guard验证码（如需要）"
                maxlength="5"
              />
              <div style="color: #999; font-size: 12px; margin-top: 5px;">
                如果您的账号启用了Steam Guard手机令牌，请在此输入验证码
              </div>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="success" 
                @click="handleSteamLogin" 
                :loading="steamLoginLoading"
                style="width: 100%;"
              >
                {{ steamLoginLoading ? '登录中...' : '立即登录获取Cookie' }}
              </el-button>
            </el-form-item>
          </template>

          <el-form-item label="SteamID" required>
            <el-input 
              v-model="inputForm.steamID" 
              placeholder="请输入SteamID"
            />
          </el-form-item>
          
          
          <!-- 登录状态提示 -->
          <el-alert
            v-if="inputForm.steamLoginMessage"
            :title="inputForm.steamLoginMessage"
            :type="inputForm.steamLoginSuccess ? 'success' : 'warning'"
            :closable="false"
            show-icon
            style="margin-top: 10px;"
          />
        </template>

        <!-- 完美世界APP特有配置 -->
        <template v-else-if="inputForm.type === 'perfectworld'">
          <el-form-item>
            <el-button 
              type="success" 
              @click="startPerfectWorldTokenCollection(false)" 
              :loading="perfectWorldTokenLoading"
              :disabled="perfectWorldTokenStatus === 'success'"
              style="width: 100%;"
            >
              <el-icon style="margin-right: 5px;"><Grid /></el-icon>
              {{ perfectWorldTokenLoading ? '正在获取令牌...' : perfectWorldTokenStatus === 'success' ? '✓ 令牌已获取' : '一键获取完美世界APP令牌' }}
            </el-button>
            <div v-if="perfectWorldTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
              <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
                <el-icon><Loading /></el-icon> 等待手机APP访问...
              </div>
              <div style="color: #666; font-size: 12px;">
                1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
                2. 打开完美世界APP并登录<br/>
                3. 系统将自动获取令牌
              </div>
            </div>
            <div v-if="perfectWorldTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
              <div style="color: #52c41a; font-weight: 500;">
                <el-icon><CircleCheck /></el-icon> 令牌获取成功!
              </div>
            </div>
          </el-form-item>
          
          <!-- 完美世界配置 -->
          <el-collapse v-model="inputPerfectWorldCollapse">
            <el-collapse-item title="完美世界APP配置" name="config">
              <el-form-item label="appversion" required>
                <el-input 
                  v-model="inputForm.appversion" 
                  placeholder="请输入appversion"
                />
              </el-form-item>
              <el-form-item label="device" required>
                <el-input 
                  v-model="inputForm.device" 
                  placeholder="请输入device"
                />
              </el-form-item>
              <el-form-item label="gameType" required>
                <el-input 
                  v-model="inputForm.gameType" 
                  placeholder="请输入gameType"
                />
              </el-form-item>
              <el-form-item label="platform" required>
                <el-input 
                  v-model="inputForm.platform" 
                  placeholder="请输入platform"
                />
              </el-form-item>
              <el-form-item label="token" required>
                <el-input 
                  v-model="inputForm.pwToken" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入token"
                />
              </el-form-item>
              <el-form-item label="tdSign" required>
                <el-input 
                  v-model="inputForm.tdSign" 
                  type="textarea"
                  :rows="2"
                  placeholder="请输入tdSign"
                />
              </el-form-item>
              <el-form-item label="SteamID" required>
                <el-input 
                  v-model="inputForm.pwSteamID" 
                  placeholder="请输入SteamID"
                />
              </el-form-item>
              <el-form-item label="更新频率">
                <el-select v-model="inputForm.updateFreq" placeholder="选择更新频率" style="width: 100%;">
                  <el-option label="每15分钟" value="15min" />
                  <el-option label="每小时" value="1hour" />
                  <el-option label="每3小时" value="3hour" />
                  <el-option label="每6小时" value="6hour" />
                  <el-option label="每12小时" value="12hour" />
                  <el-option label="每天" value="daily" />
                </el-select>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </template>
        
        <!-- 通用配置 -->
        <template v-else-if="inputForm.type && inputForm.type !== 'youpin' && inputForm.type !== 'steam' && inputForm.type !== 'perfectworld'">
          <el-form-item label="API地址">
            <el-input 
              v-model="inputForm.apiUrl" 
              placeholder="请输入API地址"
            />
          </el-form-item>
          <el-form-item label="API密钥">
            <el-input 
              v-model="inputForm.apiKey" 
              type="password"
              show-password
              placeholder="请输入API密钥"
            />
          </el-form-item>
        </template>
        
        <!-- 悠悠有品特有配置 -->
        <template v-if="inputForm.type === 'youpin'">
          <el-form-item>
            <el-button 
              type="success" 
              @click="startYyypTokenCollection(false)" 
              :loading="yyypTokenLoading"
              :disabled="yyypTokenStatus === 'success'"
              style="width: 100%;"
            >
              <el-icon style="margin-right: 5px;"><Grid /></el-icon>
              {{ yyypTokenLoading ? '正在获取令牌...' : yyypTokenStatus === 'success' ? '✓ 令牌已获取' : '一键获取悠悠有品令牌' }}
            </el-button>
            <div v-if="yyypTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
              <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
                <el-icon><Loading /></el-icon> 等待手机APP访问...
              </div>
              <div style="color: #666; font-size: 12px;">
                1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
                2. 打开悠悠有品APP并登录<br/>
                3. 系统将自动获取令牌
              </div>
            </div>
            <div v-if="yyypTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
              <div style="color: #52c41a; font-weight: 500;">
                <el-icon><CircleCheck /></el-icon> 令牌获取成功!
              </div>
            </div>
          </el-form-item>
          <el-form-item label="手机号" required>
            <el-input 
              v-model="inputForm.phone" 
              placeholder="请输入手机号"
            />
          </el-form-item>
          <el-form-item label="Session ID" required>
            <el-input 
              v-model="inputForm.sessionid" 
              placeholder="请输入Session ID"
            />
          </el-form-item>
          <el-form-item label="Token" required>
            <el-input 
              v-model="inputForm.token" 
              type="textarea"
              :rows="2"
              placeholder="请输入Token"
            />
          </el-form-item>
          <el-form-item label="设备名称" required>
            <el-input 
              v-model="inputForm.deviceName" 
              placeholder="请输入设备名称"
            />
          </el-form-item>
          <el-form-item label="应用版本" required>
            <el-input 
              v-model="inputForm.appVersion" 
              placeholder="请输入应用版本"
            />
          </el-form-item>
          <el-form-item label="应用类型" required>
            <el-input 
              v-model="inputForm.appType" 
              placeholder="请输入应用类型"
            />
          </el-form-item>
          <el-form-item label="用户ID" required>
            <el-input 
              v-model="inputForm.userId" 
              placeholder="请输入用户ID"
            />
          </el-form-item>
          <el-form-item label="SteamID" required>
            <el-input 
              v-model="inputForm.steamId" 
              placeholder="请输入SteamID"
            />
          </el-form-item>
          <el-form-item label="Device Token" required>
            <el-input 
              v-model="inputForm.devicetoken" 
              placeholder="请输入Device Token"
            />
          </el-form-item>
          <el-form-item label="Device ID" required>
            <el-input 
              v-model="inputForm.deviceid" 
              placeholder="请输入Device ID"
            />
          </el-form-item>
          <el-form-item label="Device UK" required>
            <el-input 
              v-model="inputForm.deviceuk" 
              type="textarea"
              :rows="2"
              placeholder="请输入Device UK"
            />
          </el-form-item>
          <el-form-item label="UK" required>
            <el-input 
              v-model="inputForm.uk" 
              type="textarea"
              :rows="2"
              placeholder="请输入UK"
            />
          </el-form-item>
          <el-form-item label="SK" required>
            <el-input 
              v-model="inputForm.sk" 
              type="textarea"
              :rows="3"
              placeholder="请输入SK"
            />
          </el-form-item>
          <el-form-item label="Tracestate" required>
            <el-input 
              v-model="inputForm.tracestate" 
              type="textarea"
              :rows="2"
              placeholder="请输入Tracestate"
            />
          </el-form-item>
          <el-form-item label="Device Info" required>
            <el-input 
              v-model="inputForm.deviceInfo" 
              type="textarea"
              :rows="2"
              placeholder="请输入Device Info (JSON格式)"
            />
          </el-form-item>
        </template>
        
        <el-form-item v-if="inputForm.type === 'youpin' || inputForm.type === 'buff'" label="是否自动采集">
          <el-switch v-model="inputForm.enabled" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            添加数据源
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User, Grid, Loading, CircleCheck } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'
import { useCollectionState } from '@/composables/useCollectionState.js'

export default {
  name: 'DataSource',
  components: {
    Plus,
    User,
    Grid,
    Loading,
    CircleCheck
  },
  setup() {
    // 使用采集状态管理 composable（持久化到 localStorage）
    const { collectingSourceIds, startCollecting, stopCollecting, isCollecting } = useCollectionState()
    
    const submitting = ref(false)
    const testing = ref(false)
    const refreshing = ref(false)
    const editingSourceId = ref(null)
    const editDialogVisible = ref(false)
    const isListCollapsed = ref(false) // 列表收起状态
    const editSubmitting = ref(false)
    const addDialogVisible = ref(false)
    const steamLoginLoading = ref(false)
    const steamQRCode = ref('') // 二维码图片base64
    const steamQRLoading = ref(false) // 二维码生成loading
    const steamQRStatus = ref('') // 二维码状态: waiting, success, expired
    const steamQRCheckTimer = ref(null) // 二维码状态检查定时器
    const autoRefreshTimer = ref(null) // 数据源列表自动刷新定时器
    
    // 注意：全局自动采集定时器在 main.js 中初始化，无需在组件中管理
    
    // GetAppToken 相关状态
    const buffTokenLoading = ref(false)  // BUFF Token 获取loading
    const yyypTokenLoading = ref(false)  // youpin Token 获取loading
    const perfectWorldTokenLoading = ref(false)  // 完美世界APP Token 获取loading
    const buffTokenStatus = ref('')  // BUFF Token 获取状态: waiting, success, failed
    const yyypTokenStatus = ref('')  // youpin Token 获取状态: waiting, success, failed
    const perfectWorldTokenStatus = ref('')  // 完美世界APP Token 获取状态: waiting, success, failed
    const tokenCheckTimer = ref(null)  // Token 获取状态检查定时器
    const proxyAddress = ref('')  // 代理地址 (从后端获取)
    
    // 编辑对话框折叠面板状态
    const editYyypBasicCollapse = ref([])
    const editYyypTokenCollapse = ref([])
    const editYyypDeviceCollapse = ref([])
    const editYyypAdvancedCollapse = ref([])
    const editBuffBasicCollapse = ref([])
    const editBuffAppCollapse = ref([])
    const editBuffDeviceCollapse = ref([])
    const editBuffSystemCollapse = ref([])
    const editBuffDisplayCollapse = ref([])
    const editBuffLocaleCollapse = ref([])
    const inputBuffCollapse = ref(['config'])
    const inputPerfectWorldCollapse = ref([])
    const editSteamCollapse = ref(['config'])
    const editSteamLoginCollapse = ref(['config'])
    const editPerfectWorldCollapse = ref([])
    
    const editForm = ref({
      name: '',
      type: '',
      apiUrl: '',
      apiKey: '',
      enabled: true,
      // 悠悠有品特有字段
      phone: '',
      sessionid: '',
      token: '',
      deviceName: '',
      appVersion: '',
      sleepTime: 6000,
      appType: '',
      userId: '',
      steamId: '',
      devicetoken: '',
      deviceid: '',
      deviceuk: '',
      uk: '',
      sk: '',
      tracestate: '',
      deviceInfo: '',
      // BUFF特有字段
      cookie: '',
      systemVersion: '',
      systemType: '',
      steamID: '',
      // Steam特有字段
      cookies: '',
      steamCookieMethod: 'manual', // Cookie获取方式：qrcode/password/manual
      // Steam登录特有字段
      steamUsername: '',
      steamPassword: '',
      steamTwofactorCode: '',
      steamLoginMethod: 'password', // 编辑时默认账号密码登录
      steamQRSessionId: '', // 二维码会话ID
      // 完美世界APP特有字段
      appversion: '',
      device: '',
      gameType: '',
      platform: '',
      pwToken: '',
      tdSign: '',
      pwSteamID: ''
    })
    
    const inputForm = ref({
      name: '',
      type: '',
      apiUrl: '',
      apiKey: '',
      enabled: false,
      // 悠悠有品特有字段
      phone: '',
      sessionid: '',
      token: '',
      deviceName: '',
      appVersion: '',
      sleepTime: 6000,
      appType: '',
      userId: '',
      steamId: '',
      devicetoken: '',
      deviceid: '',
      deviceuk: '',
      uk: '',
      sk: '',
      tracestate: '',
      deviceInfo: '',
      // BUFF特有字段
      cookie: '',
      systemVersion: '',
      systemType: '',
      steamID: '',
      // Steam特有字段
      cookies: '',
      steamCookieMethod: 'manual', // Cookie获取方式：qrcode/password/manual
      // Steam登录特有字段
      steamUsername: '',
      steamPassword: '',
      steamTwofactorCode: '',
      steamLoginMessage: '',
      steamLoginSuccess: false,
      steamLoginMethod: 'qrcode', // 默认使用二维码登录
      steamQRSessionId: '', // 二维码会话ID
      // 完美世界APP特有字段
      appversion: '',
      device: '',
      gameType: '',
      platform: '',
      pwToken: '',
      tdSign: '',
      pwSteamID: ''
    })

    const dataSources = ref([])
    const currentSteamID = ref(null) // 当前要添加数据源的SteamID

    // 按SteamID分组的计算属性
    const groupedDataSources = computed(() => {
      const groups = {}
      
      dataSources.value.forEach(source => {
        const steamID = source.steamID || '未设置'
        if (!groups[steamID]) {
          groups[steamID] = []
        }
        groups[steamID].push(source)
      })
      
      return groups
    })

    // 获取当前分组已有的数据源类型
    const existingTypesInCurrentGroup = computed(() => {
      if (!currentSteamID.value) return []
      const group = groupedDataSources.value[currentSteamID.value] || []
      return group.map(source => source.type)
    })

    // 检查某个类型是否已存在于当前分组
    const isTypeDisabled = (type) => {
      return existingTypesInCurrentGroup.value.includes(type)
    }

    const getSourceTypeLabel = (type) => {
      const labels = {
        steam: 'Steam市场',
        steam_login: 'Steam市场(登录)',
        perfectworld: '完美世界APP',
        buff: '网易BUFF',
        youpin: 'youpin'
      }
      return labels[type] || type
    }

    const getSourceTypeColor = (enabled) => {
      return enabled ? 'success' : 'warning'
    }

    const getUpdateFreqLabel = (freq) => {
      const labels = {
        '15min': '每15分钟',
        '1hour': '每小时',
        '3hour': '每3小时',
        '6hour': '每6小时',
        '12hour': '每12小时',
        daily: '每天'
      }
      return labels[freq] || freq
    }

    const formatTime = (time) => {
      if (!time) {
        return '从未更新'
      }
      return new Date(time).toLocaleString('zh-CN')
    }

    // 将更新频率转换为毫秒
    const getUpdateFreqMs = (updateFreq) => {
      const freqMap = {
        '15min': 15 * 60 * 1000,
        '1hour': 60 * 60 * 1000,
        '3hour': 3 * 60 * 60 * 1000,
        '6hour': 6 * 60 * 60 * 1000,
        '12hour': 12 * 60 * 60 * 1000,
        'daily': 24 * 60 * 60 * 1000
      }
      return freqMap[updateFreq] || 15 * 60 * 1000 // 默认15分钟
    }

    // 注意：自动采集定时器已移至全局管理（useAutoCollection.js）
    // 前端组件不再需要管理单独的定时器

    // 更新数据库中的 lastUpdate 时间
    // 注意: 此功能已被禁用，因为后端更新接口已删除
    const updateLastUpdateInDatabase = async (dataID, lastUpdateTime) => {
      console.log(`[updateLastUpdate] 更新功能已禁用 - dataID=${dataID}, time=${lastUpdateTime}`)
      // 功能已禁用，不再调用后端更新接口
    }

    const handleSubmit = async () => {
      if (!inputForm.value.name || !inputForm.value.type) {
        ElMessage.error('请填写必要信息')
        return
      }

      // BUFF类型的字段校验 - 简化验证，只检查必要字段
      if (inputForm.value.type === 'buff') {
        console.log('[BUFF验证] cookie:', inputForm.value.cookie)
        console.log('[BUFF验证] buffAppVersion:', inputForm.value.buffAppVersion)
        
        if (!inputForm.value.cookie && !inputForm.value.buffAppVersion) {
          ElMessage.error('请先获取BUFF令牌或填写必要信息')
          return
        }
      }

      // Steam类型的字段校验
      if (inputForm.value.type === 'steam') {
        // 检查Cookie（无论哪种方式都需要Cookie）
        if (!inputForm.value.cookies) {
          ElMessage.error('请先获取Cookie（扫码/账号密码登录）或手动输入Cookie')
          return
        }
        if (!inputForm.value.steamID) {
          ElMessage.error('请填写SteamID')
          return
        }
      }

      // Steam登录类型的字段校验
      if (inputForm.value.type === 'steam_login') {
        // 检查是否已完成登录
        if (!inputForm.value.cookies) {
          ElMessage.error('请先完成Steam登录（扫码或账号密码登录）')
          return
        }
        if (!inputForm.value.steamID) {
          ElMessage.error('请填写SteamID')
          return
        }
      }

      // 悠悠有品类型的字段校验
      if (inputForm.value.type === 'youpin') {
        if (!inputForm.value.phone) {
          ElMessage.error('请填写手机号')
          return
        }
        if (!inputForm.value.sessionid) {
          ElMessage.error('请填写Session ID')
          return
        }
        if (!inputForm.value.token) {
          ElMessage.error('请填写Token')
          return
        }
        if (!inputForm.value.deviceName) {
          ElMessage.error('请填写设备名称')
          return
        }
        if (!inputForm.value.appVersion) {
          ElMessage.error('请填写应用版本')
          return
        }
        if (!inputForm.value.appType) {
          ElMessage.error('请填写应用类型')
          return
        }
        if (!inputForm.value.userId) {
          ElMessage.error('请填写用户ID')
          return
        }
        if (!inputForm.value.steamId) {
          ElMessage.error('请填写SteamID')
          return
        }
        if (!inputForm.value.devicetoken) {
          ElMessage.error('请填写Device Token')
          return
        }
        if (!inputForm.value.deviceid) {
          ElMessage.error('请填写Device ID')
          return
        }
        if (!inputForm.value.deviceuk) {
          ElMessage.error('请填写Device UK')
          return
        }
        if (!inputForm.value.uk) {
          ElMessage.error('请填写UK')
          return
        }
        if (!inputForm.value.sk) {
          ElMessage.error('请填写SK')
          return
        }
        if (!inputForm.value.tracestate) {
          ElMessage.error('请填写Tracestate')
          return
        }
        if (!inputForm.value.deviceInfo) {
          ElMessage.error('请填写Device Info')
          return
        }
      }

      // 完美世界APP类型的字段校验
      if (inputForm.value.type === 'perfectworld') {
        if (!inputForm.value.appversion) {
          ElMessage.error('请填写appversion')
          return
        }
        if (!inputForm.value.device) {
          ElMessage.error('请填写device')
          return
        }
        if (!inputForm.value.gameType) {
          ElMessage.error('请填写gameType')
          return
        }
        if (!inputForm.value.platform) {
          ElMessage.error('请填写platform')
          return
        }
        if (!inputForm.value.pwToken) {
          ElMessage.error('请填写token')
          return
        }
        if (!inputForm.value.tdSign) {
          ElMessage.error('请填写tdSign')
          return
        }
        if (!inputForm.value.pwSteamID) {
          ElMessage.error('请填写SteamID')
          return
        }
      }

      submitting.value = true
      try {
        // 获取当前时间作为创建时间
        const now = new Date().toISOString()
        
        let requestData = {
          dataName: inputForm.value.name,
          type: inputForm.value.type,
          enabled: inputForm.value.enabled
        }

        // 根据数据源类型构建配置JSON字符串
        if (inputForm.value.type === 'youpin') {
          // 悠悠有品特殊配置
          requestData.configJson = JSON.stringify({
            phone: inputForm.value.phone,
            Sessionid: inputForm.value.sessionid,
            token: inputForm.value.token,
            DeviceName: inputForm.value.deviceName,
            app_version: inputForm.value.appVersion,
            sleep_time: inputForm.value.sleepTime.toString(),
            app_type: inputForm.value.appType,
            userId: inputForm.value.userId,
            steamId: inputForm.value.steamId,
            devicetoken: inputForm.value.devicetoken,
            deviceid: inputForm.value.deviceid,
            deviceuk: inputForm.value.deviceuk,
            uk: inputForm.value.uk,
            sk: inputForm.value.sk,
            tracestate: inputForm.value.tracestate,
            device_info: inputForm.value.deviceInfo
          })
        } else if (inputForm.value.type === 'perfectworld') {
          // 完美世界APP特殊配置
          requestData.configJson = JSON.stringify({
            appversion: inputForm.value.appversion,
            device: inputForm.value.device,
            gameType: inputForm.value.gameType,
            platform: inputForm.value.platform,
            token: inputForm.value.pwToken,
            tdSign: inputForm.value.tdSign,
            steamID: inputForm.value.pwSteamID,
            sleep_time: '6000'
          })
        } else if (inputForm.value.type === 'buff') {
          // BUFF特殊配置
          requestData.configJson = JSON.stringify({
            app_version: inputForm.value.buffAppVersion,
            app_version_code: inputForm.value.buffAppVersionCode,
            brand: inputForm.value.buffBrand,
            build_fingerprint: inputForm.value.buffBuildFingerprint,
            channel: inputForm.value.buffChannel,
            device_id: inputForm.value.buffDeviceId,
            device_id_weak: inputForm.value.buffDeviceIdWeak,
            manufacturer: inputForm.value.buffManufacturer,
            model: inputForm.value.buffModel,
            network: inputForm.value.buffNetwork,
            product: inputForm.value.buffProduct,
            resolution: inputForm.value.buffResolution,
            rom: inputForm.value.buffRom,
            rom_id: inputForm.value.buffRomId,
            screen_density: inputForm.value.buffScreenDensity,
            screen_size: inputForm.value.buffScreenSize,
            seed: inputForm.value.buffSeed,
            system_type: inputForm.value.buffSystemType,
            system_version: inputForm.value.buffSystemVersion,
            timestamp: inputForm.value.buffTimestamp,
            timezone: inputForm.value.buffTimezone,
            timezone_offset: inputForm.value.buffTimezoneOffset,
            timezone_offset_dst: inputForm.value.buffTimezoneOffsetDst,
            user_agent: inputForm.value.buffUserAgent,
            locale: inputForm.value.buffLocale,
            locale_supported: inputForm.value.buffLocaleSupported,
            devicename: inputForm.value.buffDevicename,
            cookie: inputForm.value.cookie,
            steamID: inputForm.value.steamID,
            sleep_time: '6000'
          })
        } else if (inputForm.value.type === 'steam') {
          // Steam特殊配置（支持三种Cookie获取方式）
          requestData.configJson = JSON.stringify({
            cookies: inputForm.value.cookies,
            steamID: inputForm.value.steamID,
            steamCookieMethod: inputForm.value.steamCookieMethod, // 记录获取方式
            steamUsername: inputForm.value.steamUsername || '',
            steamPassword: inputForm.value.steamPassword || '',
            sleep_time: '6000'
          })
        } else if (inputForm.value.type === 'steam_login') {
          // Steam登录特殊配置
          requestData.configJson = JSON.stringify({
            cookies: inputForm.value.cookies,
            steamID: inputForm.value.steamID,
            steamUsername: inputForm.value.steamUsername,
            steamPassword: inputForm.value.steamPassword,
            sleep_time: '6000'
          })
        } else {
          requestData.configJson = JSON.stringify({
            apiUrl: inputForm.value.apiUrl,
            apiKey: inputForm.value.apiKey,
            sleep_time: '6000'
          })
        }

        let response
        if (editingSourceId.value) {
          const url = apiUrls.dataSourceById(editingSourceId.value)
          response = await axios.put(url, requestData)
        } else {
          const url = apiUrls.dataSource()
          response = await axios.post(url, requestData)
        }

        const result = response.data
        
        if (result.success) {
          const action = editingSourceId.value ? '更新' : '添加'
          ElMessage.success(`数据源${action}成功`)
          resetForm()
          editingSourceId.value = null
          addDialogVisible.value = false // 关闭添加对话框
          loadDataSources()
        } else {
          const action = editingSourceId.value ? '更新' : '添加'
          ElMessage.error(result.message || `${action}数据源失败`)
        }
      } catch (error) {
        console.error('操作数据源失败:', error)
        let errorMessage = '操作失败'
        
        if (error.response) {
          // 服务器返回了错误响应
          errorMessage = error.response.data?.message || `服务器错误 (${error.response.status})`
          console.error('服务器响应错误:', error.response.data)
        } else if (error.request) {
          // 请求发送了但没有收到响应
          errorMessage = '网络连接失败，请检查API服务器是否运行'
          console.error('网络请求错误:', error.request)
        } else {
          // 其他错误
          errorMessage = error.message || '未知错误'
          console.error('其他错误:', error.message)
        }
        
        ElMessage.error(errorMessage)
      } finally {
        submitting.value = false
      }
    }

    // ===== BUFF Token 获取相关函数 =====
    const startBuffTokenCollection = async (isEdit = false) => {
      try {
        buffTokenLoading.value = true
        buffTokenStatus.value = 'waiting'
        
        const url = apiUrls.getAppTokenStartBuff()
        const response = await axios.post(url)
        
        if (response.data.code === 200) {
          // 保存代理地址
          if (response.data.data && response.data.data.proxy_address) {
            proxyAddress.value = response.data.data.proxy_address
          }
          ElMessage.success('BUFF 代理服务器已启动，请在手机上配置代理')
          if (proxyAddress.value) {
            ElMessage.info({
              message: `代理地址: ${proxyAddress.value}`,
              duration: 5000
            })
          }
          
          // 开始轮询获取数据
          startBuffTokenPolling(isEdit)
        } else {
          ElMessage.error(response.data.msg || '启动BUFF代理失败')
          buffTokenLoading.value = false
          buffTokenStatus.value = 'failed'
        }
      } catch (error) {
        console.error('启动BUFF代理失败:', error)
        ElMessage.error('启动BUFF代理失败: ' + (error.message || '网络错误'))
        buffTokenLoading.value = false
        buffTokenStatus.value = 'failed'
      }
    }

    const startBuffTokenPolling = (isEdit = false) => {
      // 清除旧的定时器
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
      }
      
      // 每3秒检查一次数据是否收集完成
      tokenCheckTimer.value = setInterval(async () => {
        try {
          const url = apiUrls.getAppTokenGetBuffData()
          const response = await axios.get(url)
          
          console.log('[BUFF轮询] API响应:', response.data)
          console.log('[BUFF轮询] code:', response.data.code)
          console.log('[BUFF轮询] data:', response.data.data)
          
          if (response.data.code === 200) {
            // 数据收集完成
            const data = response.data.data
            
            // 填充表单
            if (isEdit) {
              editForm.value.buffAppVersion = data.app_version || editForm.value.buffAppVersion
              editForm.value.buffAppVersionCode = data.app_version_code || editForm.value.buffAppVersionCode
              editForm.value.buffBrand = data.brand || editForm.value.buffBrand
              editForm.value.buffBuildFingerprint = data.build_fingerprint || editForm.value.buffBuildFingerprint
              editForm.value.buffChannel = data.channel || editForm.value.buffChannel
              editForm.value.buffDeviceId = data.device_id || editForm.value.buffDeviceId
              editForm.value.buffDeviceIdWeak = data.device_id_weak || editForm.value.buffDeviceIdWeak
              editForm.value.buffManufacturer = data.manufacturer || editForm.value.buffManufacturer
              editForm.value.buffModel = data.model || editForm.value.buffModel
              editForm.value.buffNetwork = data.network || editForm.value.buffNetwork
              editForm.value.buffProduct = data.product || editForm.value.buffProduct
              editForm.value.buffResolution = data.resolution || editForm.value.buffResolution
              editForm.value.buffRom = data.rom || editForm.value.buffRom
              editForm.value.buffRomId = data.rom_id || editForm.value.buffRomId
              editForm.value.buffScreenDensity = data.screen_density || editForm.value.buffScreenDensity
              editForm.value.buffScreenSize = data.screen_size || editForm.value.buffScreenSize
              editForm.value.buffSeed = data.seed || editForm.value.buffSeed
              editForm.value.buffSystemType = data.system_type || editForm.value.buffSystemType
              editForm.value.buffSystemVersion = data.system_version || editForm.value.buffSystemVersion
              editForm.value.buffTimestamp = data.timestamp || editForm.value.buffTimestamp
              editForm.value.buffTimezone = data.timezone || editForm.value.buffTimezone
              editForm.value.buffTimezoneOffset = data.timezone_offset || editForm.value.buffTimezoneOffset
              editForm.value.buffTimezoneOffsetDst = data.timezone_offset_dst || editForm.value.buffTimezoneOffsetDst
              editForm.value.buffUserAgent = data.user_agent || editForm.value.buffUserAgent
              editForm.value.buffLocale = data.locale || editForm.value.buffLocale
              editForm.value.buffLocaleSupported = data.locale_supported || editForm.value.buffLocaleSupported
              editForm.value.buffDevicename = data.devicename || editForm.value.buffDevicename
              editForm.value.cookie = data.cookie || editForm.value.cookie
              editForm.value.steamID = data.steamid || editForm.value.steamID
            } else {
              inputForm.value.buffAppVersion = data.app_version || inputForm.value.buffAppVersion
              inputForm.value.buffAppVersionCode = data.app_version_code || inputForm.value.buffAppVersionCode
              inputForm.value.buffBrand = data.brand || inputForm.value.buffBrand
              inputForm.value.buffBuildFingerprint = data.build_fingerprint || inputForm.value.buffBuildFingerprint
              inputForm.value.buffChannel = data.channel || inputForm.value.buffChannel
              inputForm.value.buffDeviceId = data.device_id || inputForm.value.buffDeviceId
              inputForm.value.buffDeviceIdWeak = data.device_id_weak || inputForm.value.buffDeviceIdWeak
              inputForm.value.buffManufacturer = data.manufacturer || inputForm.value.buffManufacturer
              inputForm.value.buffModel = data.model || inputForm.value.buffModel
              inputForm.value.buffNetwork = data.network || inputForm.value.buffNetwork
              inputForm.value.buffProduct = data.product || inputForm.value.buffProduct
              inputForm.value.buffResolution = data.resolution || inputForm.value.buffResolution
              inputForm.value.buffRom = data.rom || inputForm.value.buffRom
              inputForm.value.buffRomId = data.rom_id || inputForm.value.buffRomId
              inputForm.value.buffScreenDensity = data.screen_density || inputForm.value.buffScreenDensity
              inputForm.value.buffScreenSize = data.screen_size || inputForm.value.buffScreenSize
              inputForm.value.buffSeed = data.seed || inputForm.value.buffSeed
              inputForm.value.buffSystemType = data.system_type || inputForm.value.buffSystemType
              inputForm.value.buffSystemVersion = data.system_version || inputForm.value.buffSystemVersion
              inputForm.value.buffTimestamp = data.timestamp || inputForm.value.buffTimestamp
              inputForm.value.buffTimezone = data.timezone || inputForm.value.buffTimezone
              inputForm.value.buffTimezoneOffset = data.timezone_offset || inputForm.value.buffTimezoneOffset
              inputForm.value.buffTimezoneOffsetDst = data.timezone_offset_dst || inputForm.value.buffTimezoneOffsetDst
              inputForm.value.buffUserAgent = data.user_agent || inputForm.value.buffUserAgent
              inputForm.value.buffLocale = data.locale || inputForm.value.buffLocale
              inputForm.value.buffLocaleSupported = data.locale_supported || inputForm.value.buffLocaleSupported
              inputForm.value.buffDevicename = data.devicename || inputForm.value.buffDevicename
              inputForm.value.cookie = data.cookie || inputForm.value.cookie
              inputForm.value.steamID = data.steamid || inputForm.value.steamID
            }
            
            ElMessage.success('BUFF Token 获取成功!')
            buffTokenStatus.value = 'success'
            buffTokenLoading.value = false
            
            // 停止轮询
            if (tokenCheckTimer.value) {
              clearInterval(tokenCheckTimer.value)
              tokenCheckTimer.value = null
            }
            
            // 停止代理服务器
            stopBuffTokenCollection()
            
            // 自动保存
            ElMessage.info('正在自动保存数据源配置...')
            setTimeout(() => {
              if (isEdit) {
                handleEditSubmit()
              } else {
                handleSubmit()
              }
            }, 1000)
          } else if (response.data.code === 202) {
            // 数据正在收集中
            console.log('BUFF Token 收集中...')
          }
        } catch (error) {
          console.error('获取BUFF数据失败:', error)
        }
      }, 3000)
    }

    const stopBuffTokenCollection = async () => {
      try {
        const url = apiUrls.getAppTokenStopBuff()
        await axios.post(url)
      } catch (error) {
        console.error('停止BUFF代理失败:', error)
      }
    }

    // ===== youpin Token 获取相关函数 =====
    const startYyypTokenCollection = async (isEdit = false) => {
      try {
        yyypTokenLoading.value = true
        yyypTokenStatus.value = 'waiting'
        
        const url = apiUrls.getAppTokenStartYyyp()
        const response = await axios.post(url)
        
        if (response.data.code === 200) {
          // 保存代理地址
          if (response.data.data && response.data.data.proxy_address) {
            proxyAddress.value = response.data.data.proxy_address
          }
          ElMessage.success('悠悠有品代理服务器已启动，请在手机上配置代理')
          if (proxyAddress.value) {
            ElMessage.info({
              message: `代理地址: ${proxyAddress.value}`,
              duration: 5000
            })
          }
          
          // 开始轮询获取数据
          startYyypTokenPolling(isEdit)
        } else {
          ElMessage.error(response.data.msg || '启动悠悠有品代理失败')
          yyypTokenLoading.value = false
          yyypTokenStatus.value = 'failed'
        }
      } catch (error) {
        console.error('启动悠悠有品代理失败:', error)
        ElMessage.error('启动悠悠有品代理失败: ' + (error.message || '网络错误'))
        yyypTokenLoading.value = false
        yyypTokenStatus.value = 'failed'
      }
    }

    const startYyypTokenPolling = (isEdit = false) => {
      // 清除旧的定时器
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
      }
      
      // 每3秒检查一次数据是否收集完成
      tokenCheckTimer.value = setInterval(async () => {
        try {
          const url = apiUrls.getAppTokenGetYyypData()
          const response = await axios.get(url)
          
          if (response.data.code === 200) {
            // 数据收集完成
            const data = response.data.data
            
            // 填充表单
            if (isEdit) {
              editForm.value.sessionid = data.Sessionid
              editForm.value.token = data.authorization
              editForm.value.deviceName = `${data.device_manu} ${data.device_model}`
              editForm.value.appVersion = data.app_version
              editForm.value.appType = data.apptype
              editForm.value.userId = data.userId
              editForm.value.steamId = data.steamId
              // 新增字段
              editForm.value.devicetoken = data.devicetoken
              editForm.value.deviceid = data.deviceid
              editForm.value.deviceuk = data.deviceuk
              editForm.value.uk = data.uk
              editForm.value.sk = data.sk
              editForm.value.tracestate = data.tracestate
              editForm.value.deviceInfo = data.device_info
            } else {
              inputForm.value.sessionid = data.Sessionid
              inputForm.value.token = data.authorization
              inputForm.value.deviceName = `${data.device_manu} ${data.device_model}`
              inputForm.value.appVersion = data.app_version
              inputForm.value.appType = data.apptype
              inputForm.value.userId = data.userId
              inputForm.value.steamId = data.steamId
              // 新增字段
              inputForm.value.devicetoken = data.devicetoken
              inputForm.value.deviceid = data.deviceid
              inputForm.value.deviceuk = data.deviceuk
              inputForm.value.uk = data.uk
              inputForm.value.sk = data.sk
              inputForm.value.tracestate = data.tracestate
              inputForm.value.deviceInfo = data.device_info
            }
            
            ElMessage.success('youpin Token 获取成功!')
            yyypTokenStatus.value = 'success'
            yyypTokenLoading.value = false
            
            // 停止轮询
            if (tokenCheckTimer.value) {
              clearInterval(tokenCheckTimer.value)
              tokenCheckTimer.value = null
            }
            
            // 停止代理服务器
            stopYyypTokenCollection()
            
            // 自动保存
            ElMessage.info('正在自动保存数据源配置...')
            setTimeout(() => {
              if (isEdit) {
                handleEditSubmit()
              } else {
                handleSubmit()
              }
            }, 1000)
          } else if (response.data.code === 202) {
            // 数据正在收集中
            console.log('youpin Token 收集中...')
          }
        } catch (error) {
          console.error('获取悠悠有品数据失败:', error)
        }
      }, 3000)
    }

    const stopYyypTokenCollection = async () => {
      try {
        const url = apiUrls.getAppTokenStopYyyp()
        await axios.post(url)
      } catch (error) {
        console.error('停止悠悠有品代理失败:', error)
      }
    }

    // 完美世界APP令牌获取相关函数
    const startPerfectWorldTokenCollection = async (isEdit) => {
      try {
        perfectWorldTokenLoading.value = true
        perfectWorldTokenStatus.value = ''
        
        const url = apiUrls.getAppTokenStartPerfectWorld()
        const response = await axios.post(url)
        
        if (response.data.code === 200) {
          // 保存代理地址
          if (response.data.data && response.data.data.proxy_address) {
            proxyAddress.value = response.data.data.proxy_address
          }
          perfectWorldTokenStatus.value = 'waiting'
          ElMessage.success('完美世界APP代理已启动,请在手机上配置代理并登录APP')
          if (proxyAddress.value) {
            ElMessage.info({
              message: `代理地址: ${proxyAddress.value}`,
              duration: 5000
            })
          }
          // 开始轮询检查是否获取到数据
          startPerfectWorldTokenPolling(isEdit)
        } else {
          ElMessage.error(response.data.msg || '启动完美世界APP代理失败')
          perfectWorldTokenLoading.value = false
        }
      } catch (error) {
        console.error('启动完美世界APP代理失败:', error)
        ElMessage.error('启动完美世界APP代理失败')
        perfectWorldTokenLoading.value = false
      }
    }

    const startPerfectWorldTokenPolling = (isEdit) => {
      tokenCheckTimer.value = setInterval(async () => {
        try {
          const url = apiUrls.getAppTokenGetPerfectWorldData()
          const response = await axios.get(url)
          
          if (response.data.code === 200 && response.data.data) {
            // 获取到数据,停止轮询
            clearInterval(tokenCheckTimer.value)
            perfectWorldTokenLoading.value = false
            perfectWorldTokenStatus.value = 'success'
            ElMessage.success('完美世界APP令牌获取成功!')
            
            // 填充表单
            const data = response.data.data
            if (isEdit) {
              editForm.value.platform = data.platform || editForm.value.platform
              editForm.value.device = data.device || editForm.value.device
              editForm.value.appversion = data.appVersion || editForm.value.appversion
              editForm.value.pwToken = data.token || editForm.value.pwToken
              editForm.value.gameType = data.gameTypeStr || editForm.value.gameType
              editForm.value.tdSign = data.tdSign || editForm.value.tdSign
              editForm.value.pwSteamID = data.steamId || editForm.value.pwSteamID
            } else {
              inputForm.value.platform = data.platform || inputForm.value.platform
              inputForm.value.device = data.device || inputForm.value.device
              inputForm.value.appversion = data.appVersion || inputForm.value.appversion
              inputForm.value.pwToken = data.token || inputForm.value.pwToken
              inputForm.value.gameType = data.gameTypeStr || inputForm.value.gameType
              inputForm.value.tdSign = data.tdSign || inputForm.value.tdSign
              inputForm.value.pwSteamID = data.steamId || inputForm.value.pwSteamID
            }
            
            // 停止代理
            stopPerfectWorldTokenCollection()
            
            // 自动保存
            ElMessage.info('正在自动保存数据源配置...')
            setTimeout(() => {
              if (isEdit) {
                handleEditSubmit()
              } else {
                handleSubmit()
              }
            }, 1000)
          } else if (response.data.code === 202) {
            // 数据正在收集中
            console.log('完美世界APP Token 收集中...')
          }
        } catch (error) {
          console.error('获取完美世界APP数据失败:', error)
        }
      }, 3000)
    }

    const stopPerfectWorldTokenCollection = async () => {
      try {
        const url = apiUrls.getAppTokenStopPerfectWorld()
        await axios.post(url)
      } catch (error) {
        console.error('停止完美世界APP代理失败:', error)
      }
    }

    const resetForm = () => {
      inputForm.value = {
        name: '',
        type: '',
        apiUrl: '',
        apiKey: '',
        enabled: false,
        // 悠悠有品特有字段
        phone: '',
        sessionid: '',
        token: '',
        deviceName: '',
        appVersion: '',
        sleepTime: 6000,
        appType: '',
        userId: '',
        steamId: '',
        devicetoken: '',
        deviceid: '',
        deviceuk: '',
        uk: '',
        sk: '',
        tracestate: '',
        deviceInfo: '',
        // BUFF特有字段
        cookie: '',
        systemVersion: '',
        systemType: '',
        steamID: '',
        // Steam特有字段
        cookies: '',
        // Steam登录特有字段
        steamUsername: '',
        steamPassword: '',
        steamTwofactorCode: '',
        steamLoginMessage: '',
        steamLoginSuccess: false,
        // 完美世界APP特有字段
        appversion: '',
        device: '',
        gameType: '',
        platform: '',
        pwToken: '',
        tdSign: '',
        pwSteamID: ''
      }
      editingSourceId.value = null
    }

    const testConnection = async () => {
      if (!inputForm.value.apiUrl) {
        ElMessage.error('请输入API地址')
        return
      }

      testing.value = true
      try {
        const response = await axios.post(apiUrls.dataSourceTest(), {
          type: inputForm.value.type,
          apiUrl: inputForm.value.apiUrl,
          apiKey: inputForm.value.apiKey
        })

        const result = response.data
        
        if (result.success) {
          ElMessage.success('连接测试成功')
        } else {
          ElMessage.error(result.message || '连接测试失败')
        }
      } catch (error) {
        console.error('连接测试失败:', error)
        let errorMessage = '连接测试失败'
        
        if (error.response) {
          errorMessage = error.response.data?.message || `测试失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '测试失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        testing.value = false
      }
    }

    const testSourceConnection = async (source) => {
      ElMessage.info(`正在测试 ${source.dataName} 连接...`)
      
      try {
        const response = await axios.post(apiUrls.dataSourceTest(), {
          type: source.type,
          apiUrl: source.apiUrl,
          apiKey: '' // 不发送实际的API密钥
        })

        const result = response.data
        
        if (result.success) {
          ElMessage.success(`${source.dataName} 连接正常`)
        } else {
          ElMessage.error(`${source.dataName} 连接失败: ${result.message}`)
        }
      } catch (error) {
        console.error('测试数据源连接失败:', error)
        let errorMessage = `${source.dataName} 连接测试失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `测试失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '测试失败'
        }
        
        ElMessage.error(errorMessage)
      }
    }

    // 悠悠有品专用爬虫采集函数
    const startYoupinSpiderCollection = async (source) => {
      if (!source.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      if (collectingSourceIds.value.has(source.dataID)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(source.dataID)
        
        ElMessage.info(`开始使用爬虫采集悠悠有品数据: ${source.dataName}`)
        
        // 准备发送给爬虫的数据 - 按照后端API期望的字段名
        const spiderData = {
          // 后端API需要的字段
          phone: source.config?.yyyp_phone || '',
          sessionid: source.config?.yyyp_Sessionid || '',
          token: source.config?.yyyp_token || '',
          app_version: source.config?.yyyp_app_version || '',
          app_type: source.config?.yyyp_app_type || '',
          userId: source.config?.yyyp_userId || '',
          steamId: source.config?.yyyp_steamId || '',
          
          // 额外的数据源信息（可选）
          dataID: source.dataID,
          dataName: source.dataName,
          type: source.type,
          enabled: source.enabled,
          deviceName: source.config?.yyyp_DeviceName || '',
          sleepTime: source.config?.yyyp_sleep_time || '6000'
        }
        
        console.log('发送给爬虫的数据:', spiderData)
        
        // 调用爬虫API
        const response = await axios.post(apiUrls.youpinSpider(), spiderData)

        // 后端成功返回 200 状态码和 "获取完成" 消息
        if (response.status === 200) {
          ElMessage.success(`${source.dataName} 悠悠有品爬虫采集完成！`)
          console.log('悠悠有品爬虫采集响应:', response.data)
          
          // 更新数据源的最后更新时间
          const now = new Date()
          source.lastUpdate = now
          
          // 更新数据库中的 lastUpdate
          await updateLastUpdateInDatabase(source.dataID, now.toISOString())
        } else {
          ElMessage.error(`悠悠有品爬虫采集失败: ${response.data}`)
        }
      } catch (error) {
        console.error('悠悠有品爬虫采集失败:', error)
        let errorMessage = `悠悠有品爬虫采集 ${source.dataName} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `悠悠有品爬虫采集失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到悠悠有品爬虫服务器'
        } else {
          errorMessage = error.message || '悠悠有品爬虫采集失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(source.dataID)
      }
    }

    // BUFF专用爬虫采集函数
    const startBuffSpiderCollection = async (source) => {
      if (!source.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      if (collectingSourceIds.value.has(source.dataID)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(source.dataID)
        
        ElMessage.info(`开始使用爬虫采集BUFF数据: ${source.dataName}`)

        // 准备发送给爬虫的数据 - 只需要发送steamID即可
        // 后端会根据steamID自动从数据库获取完整配置
        const spiderData = {
          steamID: source.steamID || ''
        }
        
        console.log('发送给BUFF爬虫的数据:', spiderData)
        
        // 调用爬虫API
        const response = await axios.post(apiUrls.buffSpider(), spiderData)

        // 后端成功返回 200 状态码和 "获取完成" 消息
        if (response.status === 200) {
          ElMessage.success(`${source.dataName} BUFF爬虫采集完成！`)
          console.log('BUFF爬虫采集响应:', response.data)
          
          // 更新数据源的最后更新时间
          const now = new Date()
          source.lastUpdate = now
          
          // 更新数据库中的 lastUpdate
          await updateLastUpdateInDatabase(source.dataID, now.toISOString())
        } else {
          ElMessage.error(`BUFF爬虫采集失败: ${response.data}`)
        }
      } catch (error) {
        console.error('BUFF爬虫采集失败:', error)
        let errorMessage = `BUFF爬虫采集 ${source.dataName} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `BUFF爬虫采集失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到BUFF爬虫服务器'
        } else {
          errorMessage = error.message || 'BUFF爬虫采集失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(source.dataID)
      }
    }

    // Steam专用爬虫采集函数（增量采集 - 只获取新数据）
    const startSteamSpiderCollection = async (source) => {
      if (!source.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      if (collectingSourceIds.value.has(source.dataID)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(source.dataID)
        
        ElMessage.info(`开始增量采集Steam新数据: ${source.dataName}`)

        // 准备发送给爬虫的数据 - 按照后端API期望的字段名
        const spiderData = {
          // 后端API只需要 steamId，会自动从配置中读取cookie
          steamId: source.config?.steamID || '',
        }
        
        console.log('Steam数据源完整信息:', source)
        console.log('Steam配置对象:', source.config)
        console.log('发送给Steam爬虫的数据:', spiderData)
        
        // 验证必要参数
        if (!spiderData.steamId) {
          ElMessage.error('Steam ID 未配置，请先在数据源配置中添加 Steam ID')
          stopCollecting(source.dataID)
          return
        }
        
        // 调用增量采集爬虫API（getNewData接口）
        const response = await axios.post(apiUrls.steamSpider(), spiderData)

        // 后端成功返回 200 状态码
        if (response.status === 200) {
          const message = response.data?.message || 'Steam增量采集完成'
          ElMessage.success(`${source.dataName} - ${message}`)
          console.log('Steam增量采集响应:', response.data)
          
          // 更新数据源的最后更新时间
          const now = new Date()
          source.lastUpdate = now
          
          // 更新数据库中的 lastUpdate
          await updateLastUpdateInDatabase(source.dataID, now.toISOString())
        } else {
          ElMessage.error(`Steam增量采集失败: ${response.data}`)
        }
      } catch (error) {
        console.error('Steam增量采集失败:', error)
        let errorMessage = `Steam增量采集 ${source.dataName} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `Steam增量采集失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到Steam爬虫服务器'
        } else {
          errorMessage = error.message || 'Steam增量采集失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(source.dataID)
      }
    }

    const startCollection = async (source) => {
      // 如果是悠悠有品，调用爬虫采集
      if (source.type === 'youpin') {
        return startYoupinSpiderCollection(source)
      }
      
      // 如果是BUFF，调用BUFF爬虫采集
      if (source.type === 'buff') {
        return startBuffSpiderCollection(source)
      }
      
      // 如果是Steam，调用Steam爬虫采集
      if (source.type === 'steam') {
        return startSteamSpiderCollection(source)
      }
      
      // 其他数据源使用原有的采集逻辑
      if (!source.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      if (collectingSourceIds.value.has(source.dataID)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(source.dataID)
        
        ElMessage.info(`开始采集数据源: ${source.dataName}`)
        
        // 调用采集API
        const response = await axios.post(apiUrls.dataSourceCollect(source.dataID), {
          dataSourceId: source.dataID,
          dataSourceName: source.dataName,
          type: source.type
        })

        const result = response.data
        
        if (result.success) {
          ElMessage.success(`${source.dataName} 采集完成！采集到 ${result.data?.count || 0} 条数据`)
          
          // 更新数据源的最后更新时间
          const now = new Date()
          source.lastUpdate = now
          
          // 更新数据库中的 lastUpdate
          await updateLastUpdateInDatabase(source.dataID, now.toISOString())
        } else {
          ElMessage.error(`采集失败: ${result.message}`)
        }
      } catch (error) {
        console.error('采集失败:', error)
        let errorMessage = `采集 ${source.dataName} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `采集失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '采集失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(source.dataID)
      }
    }

    const toggleSource = async (source) => {
      try {
        const response = await axios.put(apiUrls.dataSourceToggle(source.dataID), {
          enabled: source.enabled
        })

        const result = response.data
        
        if (result.success) {
          ElMessage.success(`${source.dataName} ${source.enabled ? '已启用' : '已禁用'}`)
        } else {
          ElMessage.error(result.message || '状态更新失败')
          source.enabled = !source.enabled
        }
      } catch (error) {
        console.error('状态更新失败:', error)
        let errorMessage = '状态更新失败'
        
        if (error.response) {
          errorMessage = error.response.data?.message || `更新失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '状态更新失败'
        }
        
        ElMessage.error(errorMessage)
        // 恢复原状态
        source.enabled = !source.enabled
      }
    }

    const editSource = (source) => {
      // 记录当前编辑的数据源ID
      editingSourceId.value = source.dataID
      
      // 自动收起列表
      isListCollapsed.value = true
      
      // 填充编辑表单，显示所有现有配置
      const config = source.config || {}
      
      console.log('开始编辑数据源:', {
        source: source,
        config: config,
        type: source.type,
        configKeys: Object.keys(config)
      })

      // 基础信息
      editForm.value.name = source.dataName
      editForm.value.type = source.type
      editForm.value.enabled = source.enabled
      
      
      // 根据数据源类型解析不同的配置
      if (source.type === 'youpin') {
        // 解析悠悠有品的配置 - 现在从JSON展开的字段中读取
        editForm.value.phone = config.yyyp_phone || ''
        editForm.value.sessionid = config.yyyp_Sessionid || ''
        editForm.value.token = config.yyyp_token || ''
        editForm.value.deviceName = config.yyyp_DeviceName || ''
        editForm.value.appVersion = config.yyyp_app_version || ''
        editForm.value.sleepTime = parseInt(config.yyyp_sleep_time || '6000')
        editForm.value.appType = config.yyyp_app_type || ''
        editForm.value.userId = config.yyyp_userId || ''
        editForm.value.steamId = config.yyyp_steamId || ''
        editForm.value.devicetoken = config.yyyp_devicetoken || ''
        editForm.value.deviceid = config.yyyp_deviceid || ''
        editForm.value.deviceuk = config.yyyp_deviceuk || ''
        editForm.value.uk = config.yyyp_uk || ''
        editForm.value.sk = config.yyyp_sk || ''
        editForm.value.tracestate = config.yyyp_tracestate || ''
        editForm.value.deviceInfo = config.yyyp_device_info || ''
        
        console.log('悠悠有品配置解析结果:', {
          phone: editForm.value.phone,
          sessionid: editForm.value.sessionid,
          token: editForm.value.token,
          deviceName: editForm.value.deviceName,
          appVersion: editForm.value.appVersion,
          sleepTime: editForm.value.sleepTime,
          appType: editForm.value.appType,
          userId: editForm.value.userId
        })
      } else if (source.type === 'buff') {
        // BUFF配置
        console.log('BUFF配置解析:', config)
        editForm.value.buffAppVersion = config.app_version || ''
        editForm.value.buffAppVersionCode = config.app_version_code || ''
        editForm.value.buffBrand = config.brand || ''
        editForm.value.buffBuildFingerprint = config.build_fingerprint || ''
        editForm.value.buffChannel = config.channel || ''
        editForm.value.buffDeviceId = config.device_id || ''
        editForm.value.buffDeviceIdWeak = config.device_id_weak || ''
        editForm.value.buffManufacturer = config.manufacturer || ''
        editForm.value.buffModel = config.model || ''
        editForm.value.buffNetwork = config.network || ''
        editForm.value.buffProduct = config.product || ''
        editForm.value.buffResolution = config.resolution || ''
        editForm.value.buffRom = config.rom || ''
        editForm.value.buffRomId = config.rom_id || ''
        editForm.value.buffScreenDensity = config.screen_density || ''
        editForm.value.buffScreenSize = config.screen_size || ''
        editForm.value.buffSeed = config.seed || ''
        editForm.value.buffSystemType = config.system_type || ''
        editForm.value.buffSystemVersion = config.system_version || ''
        editForm.value.buffTimestamp = config.timestamp || ''
        editForm.value.buffTimezone = config.timezone || ''
        editForm.value.buffTimezoneOffset = config.timezone_offset || ''
        editForm.value.buffTimezoneOffsetDst = config.timezone_offset_dst || ''
        editForm.value.buffUserAgent = config.user_agent || ''
        editForm.value.buffLocale = config.locale || ''
        editForm.value.buffLocaleSupported = config.locale_supported || ''
        editForm.value.buffDevicename = config.devicename || ''
        editForm.value.cookie = config.cookie || ''
        editForm.value.steamID = config.steamID || ''
        editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
      } else if (source.type === 'steam') {
        // Steam配置
        console.log('Steam配置解析:', {
          cookies: config.cookies,
          steamID: config.steamID,
          steamCookieMethod: config.steamCookieMethod
        })
        editForm.value.cookies = config.cookies || ''
        editForm.value.steamID = config.steamID || ''
        // 如果是password方式，自动转为manual（因为password已禁用）
        const cookieMethod = config.steamCookieMethod || 'manual'
        editForm.value.steamCookieMethod = cookieMethod === 'password' ? 'manual' : cookieMethod
        editForm.value.steamUsername = config.steamUsername || ''
        editForm.value.steamPassword = config.steamPassword || ''
        editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
      } else if (source.type === 'steam_login') {
        // Steam登录配置（兼容旧数据，使用与steam相同的逻辑）
        console.log('Steam登录配置解析:', {
          cookies: config.cookies,
          steamID: config.steamID,
          steamCookieMethod: config.steamCookieMethod,
          steamUsername: config.steamUsername,
          updateFreq: config.updateFreq
        })
        editForm.value.cookies = config.cookies || ''
        editForm.value.steamID = config.steamID || ''
        // 如果有steamCookieMethod则使用，否则根据是否有用户名密码来判断
        let cookieMethod
        if (config.steamCookieMethod) {
          cookieMethod = config.steamCookieMethod
        } else if (config.steamUsername) {
          cookieMethod = 'password'
        } else {
          cookieMethod = 'manual'
        }
        // 如果是password方式，自动转为manual（因为password已禁用）
        editForm.value.steamCookieMethod = cookieMethod === 'password' ? 'manual' : cookieMethod
        editForm.value.steamUsername = config.steamUsername || ''
        editForm.value.steamPassword = config.steamPassword || ''
        editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
      } else if (source.type === 'perfectworld') {
        // 完美世界APP配置
        console.log('完美世界APP配置解析:', {
          appversion: config.appversion,
          device: config.device,
          gameType: config.gameType,
          platform: config.platform,
          token: config.token,
          tdSign: config.tdSign,
          steamID: config.steamID,
          updateFreq: config.updateFreq
        })
        editForm.value.appversion = config.appversion || ''
        editForm.value.device = config.device || ''
        editForm.value.gameType = config.gameType || ''
        editForm.value.platform = config.platform || ''
        editForm.value.pwToken = config.token || ''
        editForm.value.tdSign = config.tdSign || ''
        editForm.value.pwSteamID = config.steamID || ''
        editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
      } else {
        // 通用配置 - 检查多种可能的字段名
        editForm.value.apiUrl = config.api_url || source.apiUrl || ''
        editForm.value.apiKey = config.api_key || config.token || ''
        editForm.value.sleepTime = parseInt(config.sleep_time || '6000')
      }
      
      console.log('编辑表单数据:', editForm.value)
      
      // 打开编辑对话框
      editDialogVisible.value = true
    }

    const handleEditDialogClose = () => {
      // 清除 Token 获取定时器
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
        tokenCheckTimer.value = null
      }
      
      // 重置 Token 获取状态
      buffTokenStatus.value = ''
      yyypTokenStatus.value = ''
      perfectWorldTokenStatus.value = ''
      buffTokenLoading.value = false
      yyypTokenLoading.value = false
      perfectWorldTokenLoading.value = false
      
      // 展开列表
      isListCollapsed.value = false
      
      // 对话框关闭时清理状态
      editingSourceId.value = null
      editForm.value = {
        name: '',
        type: '',
        apiUrl: '',
        apiKey: '',
        enabled: true,
        // 悠悠有品特有字段
        phone: '',
        sessionid: '',
        token: '',
        deviceName: '',
        appVersion: '',
        sleepTime: 6000,
        appType: '',
        userId: '',
        steamId: '',
        devicetoken: '',
        deviceid: '',
        deviceuk: '',
        uk: '',
        sk: '',
        tracestate: '',
        deviceInfo: '',
        // BUFF特有字段
        cookie: '',
        systemVersion: '',
        systemType: '',
        steamID: '',
        // Steam特有字段
        cookies: '',
        steamCookieMethod: 'manual',
        steamUsername: '',
        steamPassword: '',
        steamTwofactorCode: '',
        steamLoginMethod: 'password',
        steamQRSessionId: '',
        // 完美世界APP特有字段
        appversion: '',
        device: '',
        gameType: '',
        platform: '',
        pwToken: '',
        tdSign: '',
        pwSteamID: ''
      }
    }

    // 打开添加数据源对话框
    const openAddDialog = (steamID) => {
      currentSteamID.value = steamID // 记录当前分组的steamID
      resetForm() // 先重置表单
      addDialogVisible.value = true
    }

    // 打开新建SteamID分组的对话框（不限制类型）
    const openAddDialogForNewSteam = () => {
      currentSteamID.value = null // 清空steamID，不限制类型
      resetForm() // 先重置表单
      addDialogVisible.value = true
    }

    // 关闭添加数据源对话框
    const handleAddDialogClose = () => {
      // 清除二维码轮询定时器
      if (steamQRCheckTimer.value) {
        clearInterval(steamQRCheckTimer.value)
        steamQRCheckTimer.value = null
      }
      
      // 清除 Token 获取定时器
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
        tokenCheckTimer.value = null
      }
      
      // 重置二维码相关状态
      steamQRCode.value = ''
      steamQRStatus.value = ''
      steamQRLoading.value = false
      
      // 重置 Token 获取状态
      buffTokenStatus.value = ''
      yyypTokenStatus.value = ''
      perfectWorldTokenStatus.value = ''
      buffTokenLoading.value = false
      yyypTokenLoading.value = false
      perfectWorldTokenLoading.value = false
      
      resetForm() // 关闭时重置表单
    }

    // 编辑对话框中的"全部采集"功能
    const handleEditCollectAll = async () => {
      if (!editForm.value.name) {
        ElMessage.error('数据源信息不完整')
        return
      }

      if (!editForm.value.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      // 确保只有悠悠有品类型才能调用全部采集
      if (editForm.value.type !== 'youpin') {
        ElMessage.error('只有悠悠有品数据源才支持全部采集功能')
        return
      }

      if (collectingSourceIds.value.has(editingSourceId.value)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(editingSourceId.value)
        
        ElMessage.info(`开始执行悠悠有品全部采集: ${editForm.value.name}`)
        
        // 准备发送给爬虫的数据 - 按照采集接口一样的传值方法
        const spiderData = {
          // 后端API需要的字段
          phone: editForm.value.phone || '',
          sessionid: editForm.value.sessionid || '',
          token: editForm.value.token || '',
          app_version: editForm.value.appVersion || '',
          app_type: editForm.value.appType || '',
          userId: editForm.value.userId || '',
          steamId: editForm.value.steamId || '',

          // 额外的数据源信息（可选）
          dataID: editingSourceId.value,
          dataName: editForm.value.name,
          type: editForm.value.type,
          enabled: editForm.value.enabled,
          deviceName: editForm.value.deviceName || '',
          sleepTime: editForm.value.sleepTime?.toString() || '6000'
        }
        
        console.log('发送给悠悠有品全部采集爬虫的数据:', spiderData)
        
        // 调用全部采集爬虫API
        const response = await axios.post(apiUrls.youpinFullSpider(), spiderData)

        // 后端成功返回 200 状态码
        if (response.status === 200) {
          ElMessage.success(`${editForm.value.name} 悠悠有品全部采集完成！`)
          console.log('悠悠有品全部采集响应:', response.data)
        } else {
          ElMessage.error(`悠悠有品全部采集失败: ${response.data}`)
        }
      } catch (error) {
        console.error('悠悠有品全部采集失败:', error)
        let errorMessage = `悠悠有品全部采集 ${editForm.value.name} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `悠悠有品全部采集失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到悠悠有品爬虫服务器'
        } else {
          errorMessage = error.message || '悠悠有品全部采集失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(editingSourceId.value)
      }
    }

    // 编辑对话框中的BUFF"全部获取"功能
    const handleEditBuffCollectAll = async () => {
      if (!editForm.value.name) {
        ElMessage.error('数据源信息不完整')
        return
      }

      if (!editForm.value.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      // 确保只有BUFF类型才能调用全部获取
      if (editForm.value.type !== 'buff') {
        ElMessage.error('只有BUFF数据源才支持全部获取功能')
        return
      }

      if (collectingSourceIds.value.has(editingSourceId.value)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(editingSourceId.value)
        
        ElMessage.info(`开始执行BUFF全部获取: ${editForm.value.name}`)
        
        // 准备发送给爬虫的数据 - 按照采集接口一样的传值方法
        const spiderData = {
          // 后端API需要的字段
          cookie: editForm.value.cookie || '',
          system_version: editForm.value.systemVersion || '',
          system_type: editForm.value.systemType || '',
          steamID: editForm.value.steamID || '',

          // 额外的数据源信息（可选）
          dataID: editingSourceId.value,
          dataName: editForm.value.name,
          type: editForm.value.type,
          enabled: editForm.value.enabled
        }
        
        console.log('发送给BUFF全部获取爬虫的数据:', spiderData)
        
        // 调用全部获取爬虫API
        const response = await axios.post(apiUrls.buffFullSpider(), spiderData)

        // 后端成功返回 200 状态码
        if (response.status === 200) {
          ElMessage.success(`${editForm.value.name} BUFF全部获取完成！`)
          console.log('BUFF全部获取响应:', response.data)
        } else {
          ElMessage.error(`BUFF全部获取失败: ${response.data}`)
        }
      } catch (error) {
        console.error('BUFF全部获取失败:', error)
        let errorMessage = `BUFF全部获取 ${editForm.value.name} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `BUFF全部获取失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到BUFF爬虫服务器'
        } else {
          errorMessage = error.message || 'BUFF全部获取失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(editingSourceId.value)
      }
    }

    // 编辑对话框中的Steam"全部采集"功能（全量采集 - 从数据库已有数据的下一页开始获取所有数据）
    const handleEditSteamCollectAll = async () => {
      if (!editForm.value.name) {
        ElMessage.error('数据源信息不完整')
        return
      }

      if (!editForm.value.enabled) {
        ElMessage.warning('请先启用数据源')
        return
      }

      // 确保只有Steam类型才能调用全部采集
      if (editForm.value.type !== 'steam') {
        ElMessage.error('只有Steam数据源才支持全部采集功能')
        return
      }

      if (collectingSourceIds.value.has(editingSourceId.value)) {
        ElMessage.info('该数据源正在采集中...')
        return
      }

      try {
        // 添加到采集中的列表
        startCollecting(editingSourceId.value)
        
        ElMessage.info(`开始执行Steam全量采集（从数据库已有数据继续获取）: ${editForm.value.name}`)
        
        // 准备发送给爬虫的数据 - 按照采集接口一样的传值方法
        const spiderData = {
          // 后端API只需要 steamId，会自动从配置中读取cookie
          steamId: editForm.value.steamID || '',
        }
        
        console.log('发送给Steam全量采集爬虫的数据:', spiderData)
        
        // 调用全量采集爬虫API（NoneData接口）
        const response = await axios.post(apiUrls.steamFullSpider(), spiderData)

        // 后端成功返回 200 状态码
        if (response.status === 200) {
          ElMessage.success(`${editForm.value.name} Steam全量采集完成！`)
          console.log('Steam全量采集响应:', response.data)
        } else {
          ElMessage.error(`Steam全量采集失败: ${response.data}`)
        }
      } catch (error) {
        console.error('Steam全量采集失败:', error)
        let errorMessage = `Steam全量采集 ${editForm.value.name} 失败`
        
        if (error.response) {
          errorMessage = error.response.data?.message || `Steam全量采集失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到Steam爬虫服务器'
        } else {
          errorMessage = error.message || 'Steam全量采集失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        // 从采集中的列表移除
        stopCollecting(editingSourceId.value)
      }
    }

    // 编辑对话框中的删除功能
    const handleEditDelete = () => {
      if (!editForm.value.name || !editingSourceId.value) {
        ElMessage.error('数据源信息不完整')
        return
      }

      ElMessageBox.confirm(
        `确定要删除数据源 "${editForm.value.name}" 吗？\n\n删除后将无法恢复，该数据源的所有配置信息都会被永久删除。`,
        '⚠️ 危险操作 - 确认删除',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'error',
          buttonSize: 'default',
          showClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
              ElMessageBox.confirm(
                '这是最后确认，删除后无法恢复！',
                '最终确认',
                {
                  confirmButtonText: '我确定要删除',
                  cancelButtonText: '取消',
                  type: 'error'
                }
              ).then(() => {
                done()
              }).catch(() => {
                // 取消最终确认，不关闭第一个对话框
              })
            } else {
              done()
            }
          }
        }
      ).then(async () => {
        try {
          const response = await axios.delete(apiUrls.dataSourceById(editingSourceId.value))

          const result = response.data
          
          if (result.success) {
            const index = dataSources.value.findIndex(s => s.dataID === editingSourceId.value)
            if (index > -1) {
              dataSources.value.splice(index, 1)
              ElMessage.success('数据源删除成功')
              editDialogVisible.value = false // 关闭编辑对话框
            }
          } else {
            ElMessage.error(result.message || '删除数据源失败')
          }
        } catch (error) {
          console.error('删除数据源失败:', error)
          let errorMessage = '删除数据源失败'
          
          if (error.response) {
            errorMessage = error.response.data?.message || `删除失败 (${error.response.status})`
          } else if (error.request) {
            errorMessage = '无法连接到API服务器'
          } else {
            errorMessage = error.message || '删除失败'
          }
          
          ElMessage.error(errorMessage)
        }
      })
    }

    const handleEditSubmit = async () => {
      if (!editForm.value.name) {
        ElMessage.error('请填写数据源名称')
        return
      }

      // BUFF类型的字段校验 - 简化验证，只检查必要字段
      if (editForm.value.type === 'buff') {
        console.log('[BUFF编辑验证] cookie:', editForm.value.cookie)
        console.log('[BUFF编辑验证] buffAppVersion:', editForm.value.buffAppVersion)
        
        if (!editForm.value.cookie && !editForm.value.buffAppVersion) {
          ElMessage.error('请先获取BUFF令牌或填写必要信息')
          return
        }
      }

      // Steam类型的字段校验
      if (editForm.value.type === 'steam') {
        // 检查Cookie（无论哪种方式都需要Cookie）
        if (!editForm.value.cookies) {
          ElMessage.error('请先获取Cookie（扫码/账号密码登录）或手动输入Cookie')
          return
        }
        if (!editForm.value.steamID) {
          ElMessage.error('请填写SteamID')
          return
        }
      }

      // Steam登录类型的字段校验（兼容旧数据，使用与steam相同的逻辑）
      if (editForm.value.type === 'steam_login') {
        // 检查Cookie（无论哪种方式都需要Cookie）
        if (!editForm.value.cookies) {
          ElMessage.error('请先获取Cookie（扫码/账号密码登录）或手动输入Cookie')
          return
        }
        if (!editForm.value.steamID) {
          ElMessage.error('请填写SteamID')
          return
        }
      }

      // 悠悠有品类型的字段校验
      if (editForm.value.type === 'youpin') {
        if (!editForm.value.phone) {
          ElMessage.error('请填写手机号')
          return
        }
        if (!editForm.value.sessionid) {
          ElMessage.error('请填写Session ID')
          return
        }
        if (!editForm.value.token) {
          ElMessage.error('请填写Token')
          return
        }
        if (!editForm.value.deviceName) {
          ElMessage.error('请填写设备名称')
          return
        }
        if (!editForm.value.appVersion) {
          ElMessage.error('请填写应用版本')
          return
        }
        if (!editForm.value.appType) {
          ElMessage.error('请填写应用类型')
          return
        }
        if (!editForm.value.userId) {
          ElMessage.error('请填写用户ID')
          return
        }
        if (!editForm.value.steamId) {
          ElMessage.error('请填写SteamID')
          return
        }
        if (!editForm.value.devicetoken) {
          ElMessage.error('请填写Device Token')
          return
        }
        if (!editForm.value.deviceid) {
          ElMessage.error('请填写Device ID')
          return
        }
        if (!editForm.value.deviceuk) {
          ElMessage.error('请填写Device UK')
          return
        }
        if (!editForm.value.uk) {
          ElMessage.error('请填写UK')
          return
        }
        if (!editForm.value.sk) {
          ElMessage.error('请填写SK')
          return
        }
        if (!editForm.value.tracestate) {
          ElMessage.error('请填写Tracestate')
          return
        }
        if (!editForm.value.deviceInfo) {
          ElMessage.error('请填写Device Info')
          return
        }
      }

      // 完美世界APP类型的字段校验
      if (editForm.value.type === 'perfectworld') {
        if (!editForm.value.appversion) {
          ElMessage.error('请填写appversion')
          return
        }
        if (!editForm.value.device) {
          ElMessage.error('请填写device')
          return
        }
        if (!editForm.value.gameType) {
          ElMessage.error('请填写gameType')
          return
        }
        if (!editForm.value.platform) {
          ElMessage.error('请填写platform')
          return
        }
        if (!editForm.value.pwToken) {
          ElMessage.error('请填写token')
          return
        }
        if (!editForm.value.tdSign) {
          ElMessage.error('请填写tdSign')
          return
        }
        if (!editForm.value.pwSteamID) {
          ElMessage.error('请填写SteamID')
          return
        }
      }

      editSubmitting.value = true
      try {
        let requestData = {
          dataName: editForm.value.name,
          type: editForm.value.type,
          enabled: editForm.value.enabled
        }

        // 根据数据源类型构建配置JSON字符串
        if (editForm.value.type === 'youpin') {
          // 修复：编辑时也使用不带前缀的字段名，与添加时保持一致
          // 后端会统一添加 yyyp_ 前缀
          requestData.configJson = JSON.stringify({
            phone: editForm.value.phone,
            Sessionid: editForm.value.sessionid,
            token: editForm.value.token,
            DeviceName: editForm.value.deviceName,
            app_version: editForm.value.appVersion,
            sleep_time: editForm.value.sleepTime.toString(),
            app_type: editForm.value.appType,
            userId: editForm.value.userId,
            steamId: editForm.value.steamId,
            devicetoken: editForm.value.devicetoken,
            deviceid: editForm.value.deviceid,
            deviceuk: editForm.value.deviceuk,
            uk: editForm.value.uk,
            sk: editForm.value.sk,
            tracestate: editForm.value.tracestate,
            device_info: editForm.value.deviceInfo
          })
        } else if (editForm.value.type === 'perfectworld') {
          // 完美世界APP特殊配置
          requestData.configJson = JSON.stringify({
            appversion: editForm.value.appversion,
            device: editForm.value.device,
            gameType: editForm.value.gameType,
            platform: editForm.value.platform,
            token: editForm.value.pwToken,
            tdSign: editForm.value.tdSign,
            steamID: editForm.value.pwSteamID,
            updateFreq: editForm.value.updateFreq,
            sleep_time: '6000'
          })
        } else if (editForm.value.type === 'buff') {
          // BUFF特殊配置
          requestData.configJson = JSON.stringify({
            app_version: editForm.value.buffAppVersion,
            app_version_code: editForm.value.buffAppVersionCode,
            brand: editForm.value.buffBrand,
            build_fingerprint: editForm.value.buffBuildFingerprint,
            channel: editForm.value.buffChannel,
            device_id: editForm.value.buffDeviceId,
            device_id_weak: editForm.value.buffDeviceIdWeak,
            manufacturer: editForm.value.buffManufacturer,
            model: editForm.value.buffModel,
            network: editForm.value.buffNetwork,
            product: editForm.value.buffProduct,
            resolution: editForm.value.buffResolution,
            rom: editForm.value.buffRom,
            rom_id: editForm.value.buffRomId,
            screen_density: editForm.value.buffScreenDensity,
            screen_size: editForm.value.buffScreenSize,
            seed: editForm.value.buffSeed,
            system_type: editForm.value.buffSystemType,
            system_version: editForm.value.buffSystemVersion,
            timestamp: editForm.value.buffTimestamp,
            timezone: editForm.value.buffTimezone,
            timezone_offset: editForm.value.buffTimezoneOffset,
            timezone_offset_dst: editForm.value.buffTimezoneOffsetDst,
            user_agent: editForm.value.buffUserAgent,
            locale: editForm.value.buffLocale,
            locale_supported: editForm.value.buffLocaleSupported,
            devicename: editForm.value.buffDevicename,
            cookie: editForm.value.cookie,
            steamID: editForm.value.steamID,
            updateFreq: editForm.value.updateFreq,
            sleep_time: '6000'
          })
        } else if (editForm.value.type === 'steam') {
          // Steam特殊配置（支持三种Cookie获取方式）
          requestData.configJson = JSON.stringify({
            cookies: editForm.value.cookies,
            steamID: editForm.value.steamID,
            steamCookieMethod: editForm.value.steamCookieMethod, // 记录获取方式
            steamUsername: editForm.value.steamUsername || '',
            steamPassword: editForm.value.steamPassword || '',
            updateFreq: editForm.value.updateFreq,
            sleep_time: '6000'
          })
        } else if (editForm.value.type === 'steam_login') {
          // Steam登录特殊配置（兼容旧数据，使用与steam相同的配置）
          requestData.configJson = JSON.stringify({
            cookies: editForm.value.cookies,
            steamID: editForm.value.steamID,
            steamCookieMethod: editForm.value.steamCookieMethod, // 记录获取方式
            steamUsername: editForm.value.steamUsername || '',
            steamPassword: editForm.value.steamPassword || '',
            updateFreq: editForm.value.updateFreq,
            sleep_time: '6000'
          })
        } else {
          requestData.configJson = JSON.stringify({
            apiUrl: editForm.value.apiUrl,
            apiKey: editForm.value.apiKey,
            updateFreq: editForm.value.updateFreq,
            sleep_time: editForm.value.sleepTime?.toString() || '6000'
          })
        }

        const response = await axios.put(
          apiUrls.dataSourceById(editingSourceId.value), 
          requestData
        )

        const result = response.data
        
        if (result.success) {
          ElMessage.success('数据源更新成功')
          editDialogVisible.value = false
          loadDataSources() // 重新加载数据源列表
        } else {
          ElMessage.error(result.message || '更新数据源失败')
        }
      } catch (error) {
        console.error('更新数据源失败:', error)
        let errorMessage = '更新失败'
        
        if (error.response) {
          errorMessage = error.response.data?.message || `更新失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '更新失败'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        editSubmitting.value = false
      }
    }

    const removeSource = (source) => {
      ElMessageBox.confirm(
        `确定要删除数据源 "${source.dataName}" 吗？\n\n删除后将无法恢复，该数据源的所有配置信息都会被永久删除。`,
        '⚠️ 危险操作 - 确认删除',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'error',
          buttonSize: 'default',
          showClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
              ElMessageBox.confirm(
                '这是最后确认，删除后无法恢复！',
                '最终确认',
                {
                  confirmButtonText: '我确定要删除',
                  cancelButtonText: '取消',
                  type: 'error'
                }
              ).then(() => {
                done()
              }).catch(() => {
                // 取消最终确认，不关闭第一个对话框
              })
            } else {
              done()
            }
          }
        }
      ).then(async () => {
        try {
          const response = await axios.delete(apiUrls.dataSourceById(source.dataID))

          const result = response.data
          
          if (result.success) {
            const index = dataSources.value.findIndex(s => s.dataID === source.dataID)
            if (index > -1) {
              dataSources.value.splice(index, 1)
              ElMessage.success('数据源删除成功')
            }
          } else {
            ElMessage.error(result.message || '删除数据源失败')
          }
        } catch (error) {
          console.error('删除数据源失败:', error)
          let errorMessage = '删除数据源失败'
          
          if (error.response) {
            errorMessage = error.response.data?.message || `删除失败 (${error.response.status})`
          } else if (error.request) {
            errorMessage = '无法连接到API服务器'
          } else {
            errorMessage = error.message || '删除失败'
          }
          
          ElMessage.error(errorMessage)
        }
      })
    }

    const refreshAllSources = async () => {
      refreshing.value = true
      try {
        await loadDataSources()
        ElMessage.success('所有数据源已刷新')
      } catch (error) {
        ElMessage.error('刷新失败')
      } finally {
        refreshing.value = false
      }
    }

    const loadDataSources = async () => {
      try {
        console.log('开始请求数据源API...')
        const response = await axios.get(apiUrls.dataSource())
        console.log('Axios response:', response)
        
        const result = response.data
        console.log('API响应结果:', result)
        
        if (result.success) {
          console.log('成功获取数据源，数量:', result.data.length)
          console.log('[DEBUG] 原始返回数据:', JSON.stringify(result.data, null, 2))
          
          dataSources.value = result.data.map(item => {
            console.log(`[DEBUG] 数据源 ${item.dataName}:`)
            console.log(`  - 原始steamID值:`, item.steamID)
            console.log(`  - steamID类型:`, typeof item.steamID)
            
            return {
              id: item.dataID,
              dataID: item.dataID,
              name: item.dataName,
              dataName: item.dataName,
              type: item.type || 'other',  // 直接使用后端返回的type字段
              apiUrl: item.config?.apiUrl || '',
              updateFreq: item.updateFreq || '15min',
              enabled: item.enabled,
              status: item.enabled ? 'online' : 'offline',
              lastUpdate: item.lastUpdate ? new Date(item.lastUpdate) : null,
              config: item.config || {},
              steamID: item.steamID || ''  // 直接使用config表的steamID字段
            }
          })
          console.log('处理后的数据源:', dataSources.value)
          console.log('分组数据:', groupedDataSources.value)
          
          // 注意：全局定时器已在 main.js 中初始化，无需在组件中调用
        } else {
          console.error('API返回失败:', result.message)
          ElMessage.error(result.message || '获取数据源失败')
        }
      } catch (error) {
        console.error('获取数据源失败:', error)
        let errorMessage = '获取数据源失败'
        
        if (error.response) {
          // 服务器返回了错误响应
          errorMessage = error.response.data?.message || `服务器错误 (${error.response.status})`
          console.error('服务器响应错误:', error.response.data)
        } else if (error.request) {
          // 请求发送了但没有收到响应
          errorMessage = '无法连接到API服务器，请检查服务器是否运行在端口9001'
          console.error('网络请求错误，无响应')
        } else {
          // 其他错误
          errorMessage = error.message || '未知错误'
          console.error('请求设置错误:', error.message)
        }
        
        console.error('详细错误信息:', {
          name: error.name,
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        
        ElMessage.error(errorMessage)
      }
    }


    // Steam登录处理函数（添加数据源时）
    const handleSteamLogin = async () => {
      if (!inputForm.value.steamUsername || !inputForm.value.steamPassword) {
        ElMessage.error('请输入Steam用户名和密码')
        return
      }

      steamLoginLoading.value = true
      inputForm.value.steamLoginMessage = ''
      inputForm.value.steamLoginSuccess = false

      try {
        const loginData = {
          username: inputForm.value.steamUsername,
          password: inputForm.value.steamPassword,
          twofactor_code: inputForm.value.steamTwofactorCode || '',
          save_to_db: false  // 不直接保存，等用户保存数据源时再保存
        }

        const response = await axios.post(apiUrls.steamLogin(), loginData)
        const result = response.data

        if (result.success) {
          // 登录成功
          inputForm.value.cookies = result.cookies
          inputForm.value.steamLoginMessage = '✅ Steam登录成功！Cookie已获取'
          inputForm.value.steamLoginSuccess = true
          ElMessage.success('Steam登录成功！请手动输入SteamID')
        } else if (result.requires_twofactor) {
          // 需要Steam Guard验证码
          inputForm.value.steamLoginMessage = '⚠️ 需要Steam Guard手机令牌验证码，请输入后重试'
          inputForm.value.steamLoginSuccess = false
          ElMessage.warning('需要Steam Guard验证码')
        } else if (result.requires_emailauth) {
          // 需要邮箱验证码
          inputForm.value.steamLoginMessage = '⚠️ 需要邮箱验证码，请查收邮件后输入'
          inputForm.value.steamLoginSuccess = false
          ElMessage.warning('需要邮箱验证码')
        } else if (result.requires_captcha) {
          // 需要图形验证码
          inputForm.value.steamLoginMessage = '⚠️ 需要图形验证码，请稍后重试或手动输入Cookie'
          inputForm.value.steamLoginSuccess = false
          ElMessage.warning('需要图形验证码')
        } else {
          // 其他错误
          inputForm.value.steamLoginMessage = `❌ 登录失败: ${result.message}`
          inputForm.value.steamLoginSuccess = false
          ElMessage.error(result.message || '登录失败')
        }
      } catch (error) {
        console.error('Steam登录失败:', error)
        inputForm.value.steamLoginMessage = `❌ 登录失败: ${error.message || '网络错误'}`
        inputForm.value.steamLoginSuccess = false
        ElMessage.error('Steam登录失败，请检查网络连接')
      } finally {
        steamLoginLoading.value = false
      }
    }

    // 生成Steam二维码
    const handleGenerateQRCode = async () => {
      steamQRLoading.value = true
      steamQRCode.value = ''
      steamQRStatus.value = ''

      try {
        ElMessage.info('正在生成Steam登录二维码...')
        
        // 调用后端API生成二维码
        const response = await axios.post(apiUrls.steamQRGenerate())
        
        if (response.data.success) {
          steamQRCode.value = response.data.data.qr_code
          steamQRStatus.value = 'waiting'
          inputForm.value.steamQRSessionId = response.data.data.session_id
          
          ElMessage.success('二维码生成成功，请使用Steam APP扫码')
          
          // 开始轮询检查二维码状态
          startQRCodePolling()
        } else {
          ElMessage.error(response.data.message || '生成二维码失败')
        }
      } catch (error) {
        console.error('生成二维码失败:', error)
        ElMessage.error('生成二维码失败，请检查网络连接')
      } finally {
        steamQRLoading.value = false
      }
    }

    // 获取二维码状态文本
    const getSteamQRStatusText = () => {
      const statusMap = {
        'waiting': '等待扫码中...',
        'success': '✅ 登录成功',
        'expired': '❌ 二维码已过期'
      }
      return statusMap[steamQRStatus.value] || '未知状态'
    }

    // 开始轮询检查二维码状态
    const startQRCodePolling = () => {
      // 清除已有定时器
      if (steamQRCheckTimer.value) {
        clearInterval(steamQRCheckTimer.value)
      }

      // 每3秒检查一次
      steamQRCheckTimer.value = setInterval(async () => {
        try {
          const response = await axios.post(apiUrls.steamQRPoll(), {
            session_id: inputForm.value.steamQRSessionId
          })
          
          if (response.data.success) {
            if (response.data.status === 'success') {
              // 登录成功
              steamQRStatus.value = 'success'
              
              // 填充Cookie
              inputForm.value.cookies = response.data.data.cookies
              inputForm.value.steamLoginSuccess = true
              
              // 显示成功消息
              const accountName = response.data.data.account_name || ''
              inputForm.value.steamLoginMessage = `✅ 扫码登录成功！${accountName ? '账号: ' + accountName : ''}`
              
              clearInterval(steamQRCheckTimer.value)
              ElMessage.success('Steam扫码登录成功！请手动输入SteamID')
            } else if (response.data.status === 'waiting') {
              // 继续等待
              steamQRStatus.value = 'waiting'
            }
          } else {
            // 出错或过期
            steamQRStatus.value = 'expired'
            clearInterval(steamQRCheckTimer.value)
            ElMessage.warning(response.data.message || '二维码已过期，请重新生成')
          }
        } catch (error) {
          console.error('检查二维码状态失败:', error)
          clearInterval(steamQRCheckTimer.value)
          steamQRStatus.value = 'expired'
          ElMessage.error('检查二维码状态失败')
        }
      }, 3000) // 每3秒检查一次
    }

    // 编辑表单 - 生成Steam二维码
    const handleEditGenerateQRCode = async () => {
      steamQRLoading.value = true
      steamQRCode.value = ''
      steamQRStatus.value = ''

      try {
        ElMessage.info('正在生成Steam登录二维码...')
        
        // 调用后端API生成二维码
        const response = await axios.post(apiUrls.steamQRGenerate())
        
        if (response.data.success) {
          steamQRCode.value = response.data.data.qr_code
          steamQRStatus.value = 'waiting'
          editForm.value.steamQRSessionId = response.data.data.session_id
          
          ElMessage.success('二维码生成成功，请使用Steam APP扫码')
          
          // 开始轮询检查二维码状态（编辑表单版本）
          startEditQRCodePolling()
        } else {
          ElMessage.error(response.data.message || '生成二维码失败')
        }
      } catch (error) {
        console.error('生成二维码失败:', error)
        ElMessage.error('生成二维码失败，请检查网络连接')
      } finally {
        steamQRLoading.value = false
      }
    }

    // 编辑表单 - 开始轮询检查二维码状态
    const startEditQRCodePolling = () => {
      // 清除已有定时器
      if (steamQRCheckTimer.value) {
        clearInterval(steamQRCheckTimer.value)
      }

      // 每3秒检查一次
      steamQRCheckTimer.value = setInterval(async () => {
        try {
          const response = await axios.post(apiUrls.steamQRPoll(), {
            session_id: editForm.value.steamQRSessionId
          })
          
          if (response.data.success) {
            if (response.data.status === 'success') {
              // 登录成功
              steamQRStatus.value = 'success'
              
              // 更新Cookie
              editForm.value.cookies = response.data.data.cookies
              
              clearInterval(steamQRCheckTimer.value)
              ElMessage.success('Steam扫码登录成功！Cookie已更新，请手动输入SteamID')
            } else if (response.data.status === 'waiting') {
              // 继续等待
              steamQRStatus.value = 'waiting'
            }
          } else {
            // 出错或过期
            steamQRStatus.value = 'expired'
            clearInterval(steamQRCheckTimer.value)
            ElMessage.warning(response.data.message || '二维码已过期，请重新生成')
          }
        } catch (error) {
          console.error('检查二维码状态失败:', error)
          clearInterval(steamQRCheckTimer.value)
          steamQRStatus.value = 'expired'
          ElMessage.error('检查二维码状态失败')
        }
      }, 3000) // 每3秒检查一次
    }

    // Steam登录处理函数（编辑数据源时）
    const handleEditSteamLogin = async () => {
      if (!editForm.value.steamUsername || !editForm.value.steamPassword) {
        ElMessage.error('请输入Steam用户名和密码')
        return
      }

      steamLoginLoading.value = true

      try {
        const loginData = {
          username: editForm.value.steamUsername,
          password: editForm.value.steamPassword,
          twofactor_code: editForm.value.steamTwofactorCode || '',
          save_to_db: false
        }

        const response = await axios.post(apiUrls.steamLogin(), loginData)
        const result = response.data

        if (result.success) {
          // 登录成功
          editForm.value.cookies = result.cookies
          ElMessage.success('Steam重新登录成功！Cookie已更新，请手动输入SteamID')
        } else if (result.requires_twofactor) {
          ElMessage.warning('需要Steam Guard验证码，请输入后重试')
        } else if (result.requires_emailauth) {
          ElMessage.warning('需要邮箱验证码，请查收邮件后输入')
        } else if (result.requires_captcha) {
          ElMessage.warning('需要图形验证码，请稍后重试')
        } else {
          ElMessage.error(result.message || '登录失败')
        }
      } catch (error) {
        console.error('Steam登录失败:', error)
        ElMessage.error('Steam登录失败，请检查网络连接')
      } finally {
        steamLoginLoading.value = false
      }
    }

    // 启动数据源列表自动刷新
    const startAutoRefresh = () => {
      // 清除已有定时器
      if (autoRefreshTimer.value) {
        clearInterval(autoRefreshTimer.value)
      }
      
      // 每30分钟自动刷新数据源列表
      autoRefreshTimer.value = setInterval(() => {
        console.log('自动刷新数据源列表（每30分钟）')
        loadDataSources()
      }, 1800000) // 30分钟 = 1800秒 = 1800000毫秒
    }

    // 停止自动刷新
    const stopAutoRefresh = () => {
      if (autoRefreshTimer.value) {
        clearInterval(autoRefreshTimer.value)
        autoRefreshTimer.value = null
      }
    }

    onMounted(() => {
      loadDataSources()
      startAutoRefresh() // 启动自动刷新
    })
    
    // 页面卸载时清理定时器
    onBeforeUnmount(() => {
      stopAutoRefresh()
      if (steamQRCheckTimer.value) {
        clearInterval(steamQRCheckTimer.value)
      }
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
      }
      // 注意：全局定时器不需要在组件卸载时清理，它会持续运行
    })

    return {
      submitting,
      testing,
      refreshing,
      editingSourceId,
      collectingSourceIds,
      editDialogVisible,
      editSubmitting,
      addDialogVisible,
      isListCollapsed,
      editForm,
      inputForm,
      dataSources,
      groupedDataSources,
      currentSteamID,
      existingTypesInCurrentGroup,
      isTypeDisabled,
      getSourceTypeLabel,
      getSourceTypeColor,
      getUpdateFreqLabel,
      formatTime,
      handleSubmit,
      resetForm,
      testConnection,
      testSourceConnection,
      startCollection,
      editSource,
      handleEditDialogClose,
      handleEditSubmit,
      handleEditCollectAll,
      // GetAppToken 相关
      buffTokenLoading,
      yyypTokenLoading,
      perfectWorldTokenLoading,
      buffTokenStatus,
      yyypTokenStatus,
      perfectWorldTokenStatus,
      startBuffTokenCollection,
      startYyypTokenCollection,
      startPerfectWorldTokenCollection,
      proxyAddress,
      // 编辑对话框折叠面板
      editYyypBasicCollapse,
      editYyypTokenCollapse,
      editYyypDeviceCollapse,
      editYyypAdvancedCollapse,
      editBuffBasicCollapse,
      editBuffAppCollapse,
      editBuffDeviceCollapse,
      editBuffSystemCollapse,
      editBuffDisplayCollapse,
      editBuffLocaleCollapse,
      inputBuffCollapse,
      inputPerfectWorldCollapse,
      editSteamCollapse,
      editSteamLoginCollapse,
      editPerfectWorldCollapse,
      handleEditBuffCollectAll,
      handleEditSteamCollectAll,
      handleEditDelete,
      openAddDialog,
      openAddDialogForNewSteam,
      handleAddDialogClose,
      removeSource,
      refreshAllSources,
      steamLoginLoading,
      handleSteamLogin,
      handleEditSteamLogin,
      handleEditGenerateQRCode,
      steamQRCode,
      steamQRLoading,
      steamQRStatus,
      handleGenerateQRCode,
      getSteamQRStatusText
    }
  }
}
</script>

<style scoped>
.data-source-container {
  width: 100%;
}

.header-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.data-sources-list {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2.5vw, 1.5rem);
  margin-bottom: clamp(1.5rem, 4vw, 1.875rem);
}

.steam-group-box {
  width: 100%;
}

.steam-group-box .card {
  background-color: #1e1e1e;
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 1px solid #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.additional-box {
  margin-bottom: clamp(1.5rem, 4vw, 1.875rem);
}

.additional-box .card {
  background-color: #1e1e1e;
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 1px solid #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 新建SteamID分组卡片 - 整个BOX作为按钮 */
.new-steam-group-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  height: 120px;
  cursor: pointer;
  border: 2px dashed #666 !important;
  background-color: transparent !important;
  transition: all 0.3s;
  padding: 1rem !important;
}

.new-steam-group-card .el-icon {
  color: #999;
  transition: all 0.3s;
}

.new-steam-group-card span {
  color: #999;
  font-size: clamp(1rem, 2vw, 1.25rem);
  font-weight: 500;
  transition: all 0.3s;
}

.new-steam-group-card:hover {
  border-color: #4CAF50 !important;
  background-color: rgba(76, 175, 80, 0.05) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2) !important;
}

.new-steam-group-card:hover .el-icon {
  color: #4CAF50;
  transform: scale(1.1);
}

.new-steam-group-card:hover span {
  color: #4CAF50;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(1rem, 3vw, 1.25rem);
  flex-wrap: wrap;
  gap: 1rem;
}

.source-card {
  background-color: #2a2a2a;
  border-radius: 0.5rem;
  padding: clamp(1rem, 2.5vw, 1.25rem);
  border: 1px solid #333;
  transition: all 0.3s;
  width: 250px;
  height: fit-content;
  box-sizing: border-box;
}

.source-card:hover {
  border-color: #4CAF50;
}

.source-card.disabled {
  opacity: 0.6;
}

/* 添加数据源卡片样式 */
.add-source-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: 2px dashed #666 !important;
  background-color: transparent !important;
  transition: all 0.3s;
  padding: clamp(1rem, 2.5vw, 1.25rem) !important;
  min-height: 180px;
}

.add-source-card:hover {
  border-color: #4CAF50 !important;
  background-color: rgba(76, 175, 80, 0.05) !important;
}

.add-icon-container {
  color: #666;
  margin-bottom: 12px;
  transition: color 0.3s;
}

.add-source-card:hover .add-icon-container {
  color: #4CAF50;
}

.add-text {
  color: #999;
  font-size: 14px;
  margin: 0;
  transition: color 0.3s;
}

.add-source-card:hover .add-text {
  color: #4CAF50;
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: clamp(0.75rem, 2vw, 0.9375rem);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.source-info h4 {
  margin-bottom: clamp(0.5rem, 1vw, 0.5rem);
  color: #fff;
  font-size: clamp(1rem, 1.8vw, 1.125rem);
}

.source-details {
  margin-bottom: clamp(1rem, 3vw, 1.25rem);
}

.source-details p {
  margin: clamp(0.5rem, 1vw, 0.5rem) 0;
  color: #ccc;
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  line-height: 1.5;
}

.source-actions {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 0.625rem);
  flex-wrap: wrap;
}

/* 数据源网格布局 - 固定宽度，左对齐 */
.grid-datasource {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-start;
  align-items: start;
}

/* 响应式调整 - flexbox布局无需额外设置 */

/* 确保卡片内容自适应 */
.source-card .source-header,
.source-card .source-details,
.source-card .source-actions {
  width: 100%;
  flex-shrink: 1;
}

.source-card .source-actions {
  justify-content: flex-start;
}

/* 文字内容自适应 */
.source-card h4 {
  word-break: break-word;
  overflow-wrap: break-word;
}

.source-card p {
  word-break: break-word;
  overflow-wrap: break-word;
}


:deep(.el-form-item__label) {
  color: #ccc;
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
}

:deep(.el-input__inner) {
  background-color: #2a2a2a !important;
  border-color: #444 !important;
  color: #ffffff !important;
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
}

:deep(.el-select .el-input__inner) {
  background-color: #2a2a2a !important;
  border-color: #444 !important;
  color: #ffffff !important;
}


:deep(.el-switch.is-checked .el-switch__core) {
  background-color: #4CAF50;
}

:deep(.el-button) {
  font-size: clamp(0.625rem, 1vw, 0.75rem);
  padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);
}

:deep(.el-form-item) {
  margin-bottom: clamp(1rem, 2.5vw, 1.125rem);
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-buttons {
    justify-content: center;
    margin-top: 10px;
  }
  
  .source-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .source-actions {
    justify-content: center;
  }
  
  .source-actions .el-button {
    flex: 1;
    min-width: 0;
    font-size: 0.625rem;
  }
  
  :deep(.el-button) {
    width: 100%;
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  
  :deep(.el-form-item__label) {
    font-size: 0.75rem;
  }
  
  :deep(.el-input__inner) {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .source-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .source-actions .el-switch {
    align-self: center;
  }
}

/* SteamID分组样式 */
.steam-group {
  margin-bottom: 2rem;
}

.steam-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid #4CAF50;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.steam-group-header-left {
  flex: 1;
}

.steam-group-header-right {
  margin-left: auto;
}

.add-source-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: transparent;
  border: 2px dashed #666;
  border-radius: 6px;
  cursor: pointer;
  color: #999;
  transition: all 0.3s;
}

.add-source-button:hover {
  border-color: #4CAF50;
  color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.05);
}

.steam-group-header h4 {
  margin: 0;
  color: #fff;
  font-size: clamp(1rem, 1.8vw, 1.125rem);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.steam-group-header .el-icon {
  color: #4CAF50;
  font-size: 1.2em;
}

/* 空状态样式 */
.empty-state {
  padding: 4rem 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-actions {
  margin-top: 1rem;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.dialog-footer-left {
  flex: 1;
  display: flex;
  gap: 10px;
  justify-content: flex-start;
}

.dialog-footer-right {
  display: flex;
  gap: 10px;
}

/* 编辑对话框黑暗主题样式 */
:deep(.el-dialog) {
  background-color: #1e1e1e !important;
  border: 1px solid #333 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8) !important;
}

:deep(.el-dialog__header) {
  background-color: #1e1e1e !important;
  border-bottom: 1px solid #333 !important;
  padding: 20px 20px 15px 20px !important;
}

:deep(.el-dialog__title) {
  color: #ffffff !important;
  font-weight: 600 !important;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #cccccc !important;
}

:deep(.el-dialog__headerbtn .el-dialog__close:hover) {
  color: #ffffff !important;
}

:deep(.el-dialog__body) {
  background-color: #1e1e1e !important;
  padding: 20px !important;
}

:deep(.el-dialog__footer) {
  background-color: #1e1e1e !important;
  border-top: 1px solid #333 !important;
  padding: 15px 20px 20px 20px !important;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  color: #cccccc !important;
  font-size: 14px !important;
}

/* 输入框包装器 - Element Plus 新版本结构 */
:deep(.el-input__wrapper) {
  background-color: #2a2a2a !important;
  border: 1px solid #444 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #666 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #4CAF50 !important;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2) !important;
}

:deep(.el-input__inner) {
  background-color: transparent !important;
  border: none !important;
  color: #ffffff !important;
  font-size: 14px !important;
}

:deep(.el-input__inner:focus) {
  border: none !important;
  box-shadow: none !important;
}

:deep(.el-input__inner:hover) {
  border: none !important;
}

:deep(.el-input.is-disabled .el-input__inner) {
  background-color: #1a1a1a !important;
  border-color: #333 !important;
  color: #888 !important;
}

:deep(.el-textarea__inner) {
  background-color: #2a2a2a !important;
  border-color: #444 !important;
  color: #ffffff !important;
  font-size: 14px !important;
}

:deep(.el-textarea__inner:focus) {
  border-color: #4CAF50 !important;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2) !important;
}

/* 下拉框特定样式 */
:deep(.el-select .el-input__wrapper) {
  background-color: #2a2a2a !important;
  border: 1px solid #444 !important;
  box-shadow: none !important;
}

:deep(.el-select .el-input__wrapper:hover) {
  border-color: #666 !important;
  box-shadow: none !important;
}

:deep(.el-select .el-input__wrapper.is-focus) {
  border-color: #4CAF50 !important;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2) !important;
}

:deep(.el-select .el-input__inner) {
  background-color: transparent !important;
  border: none !important;
  color: #ffffff !important;
}

:deep(.el-select .el-input.is-focus .el-input__inner) {
  background-color: transparent !important;
  border: none !important;
  color: #ffffff !important;
}

:deep(.el-select .el-input__inner:hover) {
  background-color: transparent !important;
  border: none !important;
  color: #ffffff !important;
}

:deep(.el-select-dropdown) {
  background-color: #2a2a2a !important;
  border: 1px solid #444 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important;
}

:deep(.el-option) {
  background-color: #2a2a2a !important;
  color: #ffffff !important;
}

:deep(.el-option:hover) {
  background-color: #4CAF50 !important;
}

:deep(.el-option.selected),
:deep(.el-option.is-selected) {
  background-color: #3a3a3a !important;
  color: #4CAF50 !important;
  font-weight: 500 !important;
}

/* 数字输入器样式 */
:deep(.el-input-number) {
  width: 100% !important;
}

:deep(.el-input-number .el-input__inner) {
  background-color: #2a2a2a !important;
  border-color: #444 !important;
  color: #ffffff !important;
}

:deep(.el-input-number__increase),
:deep(.el-input-number__decrease) {
  background-color: #333 !important;
  border-left: 1px solid #444 !important;
  color: #cccccc !important;
}

:deep(.el-input-number__increase:hover),
:deep(.el-input-number__decrease:hover) {
  background-color: #4CAF50 !important;
  color: #ffffff !important;
}

/* 开关样式 */
:deep(.el-switch__core) {
  background-color: #444 !important;
  border-color: #666 !important;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: #4CAF50 !important;
  border-color: #4CAF50 !important;
}

/* 按钮样式 */
:deep(.el-button) {
  font-size: 14px !important;
  padding: 8px 20px !important;
  border-radius: 4px !important;
}

:deep(.el-button--default) {
  background-color: #2a2a2a !important;
  border-color: #444 !important;
  color: #cccccc !important;
}

:deep(.el-button--default:hover) {
  background-color: #333 !important;
  border-color: #666 !important;
  color: #ffffff !important;
}

:deep(.el-button--primary) {
  background-color: #4CAF50 !important;
  border-color: #4CAF50 !important;
  color: #ffffff !important;
}

:deep(.el-button--primary:hover) {
  background-color: #45a049 !important;
  border-color: #45a049 !important;
}

:deep(.el-button.is-loading) {
  background-color: #666 !important;
  border-color: #666 !important;
}

/* 折叠面板样式 */
:deep(.el-collapse) {
  border: none;
  background-color: transparent;
}

:deep(.el-collapse-item__header) {
  background-color: #2a2a2a;
  color: #409EFF;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 0 15px;
  margin-bottom: 10px;
  font-weight: 500;
}

:deep(.el-collapse-item__header:hover) {
  background-color: #333;
}

:deep(.el-collapse-item__wrap) {
  background-color: transparent;
  border: none;
}

:deep(.el-collapse-item__content) {
  padding: 10px 0;
  color: #ccc;
}

:deep(.el-collapse-item) {
  margin-bottom: 10px;
}

/* 遮罩层样式 */
:deep(.el-overlay) {
  background-color: rgba(0, 0, 0, 0.7) !important;
}

</style>