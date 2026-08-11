// API 配置文件

export const API_CONFIG = {

  // API 基础地址（通过代理访问）
  BASE_URL: '/api',

  // 业务后端地址（Flask backEnd，通常由前端代理到 9001 端口）
  BACKEND_BASE_URL: '/api',

  

  // 爬虫服务器地址（通过代理访问）
  SPIDER_BASE_URL: '/spider',

  

  // API 端点

  ENDPOINTS: {

    // 数据源相关（V2 API）

    DATA_SOURCE_V2_LIST: '/backENDV2/src/use_webside/settings/data_source/units/data/getDataSourceList',

    DATA_SOURCE_V2_CREATE: '/backENDV2/src/use_webside/settings/data_source/units/data/createDataSource',

    DATA_SOURCE_V2_BY_ID: (id) => `/backENDV2/src/use_webside/settings/data_source/units/data/getDataSourceById/${id}`,

    DATA_SOURCE_V2_UPDATE: (id) => `/backENDV2/src/use_webside/settings/data_source/units/data/updateDataSource/${id}`,

    DATA_SOURCE_V2_DELETE: (id) => `/backENDV2/src/use_webside/settings/data_source/units/data/deleteDataSource/${id}`,

    DATA_SOURCE_V2_TEST: '/backENDV2/src/use_webside/settings/data_source/units/ops/testConnection',

    DATA_SOURCE_V2_COLLECT: (id) => `/backENDV2/src/use_webside/settings/data_source/units/ops/collectDataSource/${id}`,

    DATA_SOURCE_V2_TOGGLE: (id) => `/backENDV2/src/use_webside/settings/data_source/units/ops/toggleDataSource/${id}`,

    // 自动化管理相关（V2 API）
    AUTO_MANAGER_V2_TASK_LIST: '/backENDV2/src/use_webside/settings/auto_manager/units/data/getTaskList',
    AUTO_MANAGER_V2_CREATE_TASK: '/backENDV2/src/use_webside/settings/auto_manager/units/data/createTask',
    AUTO_MANAGER_V2_UPDATE_TASK: (id) => `/backENDV2/src/use_webside/settings/auto_manager/units/data/updateTask/${id}`,
    AUTO_MANAGER_V2_DELETE_TASK: (id) => `/backENDV2/src/use_webside/settings/auto_manager/units/data/deleteTask/${id}`,
    AUTO_MANAGER_V2_TOGGLE_TASK: (id) => `/backENDV2/src/use_webside/settings/auto_manager/units/ops/toggleTask/${id}`,
    AUTO_MANAGER_V2_EXECUTING_TASKS: '/backENDV2/src/use_webside/settings/auto_manager/units/ops/getExecutingTasks',
    AUTO_MANAGER_V2_STEAM_ACCOUNTS: '/backENDV2/src/use_webside/settings/auto_manager/units/filters/getSteamAccounts',
    AUTO_MANAGER_V2_SEARCH_CONFIGS: '/backENDV2/src/use_webside/settings/auto_manager/units/filters/getSearchConfigs',

    // Steam库存历史相关（V2 API）
    STEAM_INVENTORY_HISTORY_V2_LIST: '/backENDV2/src/use_webside/settings/steam_inventory_history/units/data/getList',

    // 购买数据相关（V2 API）

    BUY_DATA_USER_LIST: '/backENDV2/src/use_webside/buy/units/filters/getDataUserList',

    

    // 销售数据相关（V2 API）

    SELL_DATA_FILTERED: '/backENDV2/src/use_webside/sell/units/data/getSellDataFiltered',

    SELL_STATS_FILTERED: '/backENDV2/src/use_webside/sell/units/stats/getSellStatsFiltered',

    SELL_SEARCH_TIME_RANGE: (startDate, endDate) => `/backENDV2/src/use_webside/sell/units/data/searchSellByTimeRange/${startDate}/${endDate}`,

    SELL_STATS_TIME_RANGE: (startDate, endDate) => `/backENDV2/src/use_webside/sell/units/stats/getSellStatsByTimeRange/${startDate}/${endDate}`,

    SELL_DATA_USER_LIST: '/backENDV2/src/use_webside/sell/units/filters/getDataUserList',

    SELL_SEARCH_BY_TYPE_WEAR: '/backENDV2/src/use_webside/sell/units/data/searchByTypeAndWear',

    SELL_STATS_BY_TYPE_WEAR: '/backENDV2/src/use_webside/sell/units/stats/getStatsByTypeAndWear',

    SELL_WEAPON_TYPES: '/backENDV2/src/use_webside/sell/units/filters/getWeaponTypes',

    SELL_FLOAT_RANGES: '/backENDV2/src/use_webside/sell/units/filters/getFloatRanges',

    SELL_STATUS_LIST: '/backENDV2/src/use_webside/sell/units/filters/getStatusList',

    SELL_STATUS_SUB_LIST: (status) => `/backENDV2/src/use_webside/sell/units/filters/getStatusSubList?status=${encodeURIComponent(status)}`,

    SELL_YYYP_PRICE_INFO: (steamHashName) => `/backENDV2/src/use_webside/sell/units/price_info/getYyypPriceInfo/${encodeURIComponent(steamHashName)}`,

    BUY_STATS_FILTERED: '/backENDV2/src/use_webside/buy/units/stats/getBuyStatsFiltered',

    BUY_DATA_FILTERED: '/backENDV2/src/use_webside/buy/units/data/getBuyDataFiltered',

    BUY_COUNT_NUMBER: '/backENDV2/src/use_webside/buy/units/data/countBuyNumber',

    BUY_SEARCH_TIME_RANGE: (startDate, endDate) => `/backENDV2/src/use_webside/buy/units/data/searchBuyByTimeRange/${startDate}/${endDate}`,

    BUY_STATS_TIME_RANGE: (startDate, endDate) => `/backENDV2/src/use_webside/buy/units/stats/getBuyStatsByTimeRange/${startDate}/${endDate}`,

    // 出租数据查询（V2 API）
    LENT_DATA: (min, max) => `/backENDV2/src/use_webside/lent/units/data/getLentData/${min}/${max}`,
    LENT_DATA_BY_STATUS: (status, min, max) => `/backENDV2/src/use_webside/lent/units/data/getLentDataByStatus/${encodeURIComponent(status)}/${min}/${max}`,
    LENT_DATA_BY_STATUS_SUB: (statusSub, min, max) => `/backENDV2/src/use_webside/lent/units/data/getLentDataByStatusSub/${encodeURIComponent(statusSub)}/${min}/${max}`,
    LENT_SEARCH_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/lent/units/data/searchLentByTimeRange/${startDate}/${endDate}`,
    LENT_STATS_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/lent/units/stats/getLentStatsByTimeRange/${startDate}/${endDate}`,
    LENT_STATS_FILTERED: '/backENDV2/src/use_webside/lent/units/stats/getLentStatsFiltered',
    LENT_DATA_FILTERED: '/backENDV2/src/use_webside/lent/units/data/getLentDataFiltered',



    // 消息数据相关

    MESSAGE_DATA: (page, limit) => `/backENDV2/src/use_webside/settings/yyyp_message_box/units/data/getMessageData/${page}/${limit}`,

    MESSAGE_STATS: '/backENDV2/src/use_webside/settings/yyyp_message_box/units/data/getMessageStats',

    MESSAGE_TYPES: '/backENDV2/src/use_webside/settings/yyyp_message_box/units/data/getMessageTypes',

    MESSAGE_SEARCH_BY_KEYWORD: '/backENDV2/src/use_webside/settings/yyyp_message_box/units/data/searchByKeyword',

    MESSAGE_SEARCH_BY_TIME: '/backENDV2/src/use_webside/settings/yyyp_message_box/units/data/searchByTime',

    MESSAGE_SEARCH_BY_TYPE: '/backENDV2/src/use_webside/settings/yyyp_message_box/units/data/searchByType',



    // BUFF 消息数据相关（buff_messagebox 表）

    BUFF_MESSAGE_DATA: (page, limit) => `/backENDV2/src/use_webside/settings/buff_message_box/units/data/getMessageData/${page}/${limit}`,

    BUFF_MESSAGE_TYPES: '/backENDV2/src/use_webside/settings/buff_message_box/units/data/getMessageTypes',

    

    // Steam市场数据相关

    STEAM_BUY_GAME_NAMES: '/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyGameNames',

    STEAM_BUY_DATA: (page, limit) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyData/${page}/${limit}`,

    STEAM_BUY_STATS: '/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyStats',

    STEAM_BUY_STATS_BY_SEARCH: (keyword) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyStatsBySearch/${encodeURIComponent(keyword)}`,

    STEAM_BUY_STATS_BY_GAME_NAME: (gameName) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyStatsByGameName/${encodeURIComponent(gameName)}`,

    STEAM_BUY_DATA_BY_GAME_NAME: (gameName, page, limit) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyDataByGameName/${encodeURIComponent(gameName)}/${page}/${limit}`,

    STEAM_BUY_SEARCH_BY_NAME: (itemName) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/searchBuyByName/${encodeURIComponent(itemName)}`,

    STEAM_BUY_SEARCH_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/searchBuyByTimeRange/${startDate}/${endDate}`,

    STEAM_BUY_STATS_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/settings/steam_market/units/buy/getBuyStatsByTimeRange/${startDate}/${endDate}`,

    

    STEAM_SELL_GAME_NAMES: '/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellGameNames',

    STEAM_SELL_DATA: (page, limit) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellData/${page}/${limit}`,

    STEAM_SELL_STATS: '/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellStats',

    STEAM_SELL_STATS_BY_SEARCH: (keyword) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellStatsBySearch/${encodeURIComponent(keyword)}`,

    STEAM_SELL_STATS_BY_GAME_NAME: (gameName) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellStatsByGameName/${encodeURIComponent(gameName)}`,

    STEAM_SELL_DATA_BY_GAME_NAME: (gameName, page, limit) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellDataByGameName/${encodeURIComponent(gameName)}/${page}/${limit}`,

    STEAM_SELL_SEARCH_BY_NAME: (itemName) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/searchSellByName/${encodeURIComponent(itemName)}`,

    STEAM_SELL_SEARCH_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/searchSellByTimeRange/${startDate}/${endDate}`,

    STEAM_SELL_STATS_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/settings/steam_market/units/sell/getSellStatsByTimeRange/${startDate}/${endDate}`,

    

    // 武器搜索相关

    SEARCH_WEAPON: (keyword) => `/backENDV2/src/use_webside/settings/data_source/units/weapon/search?keyword=${encodeURIComponent(keyword)}`,

    SEARCH_WEAPON_DETAIL: (keyword, exactMatch = false) => `/backENDV2/src/use_webside/settings/data_source/units/weapon/detail?keyword=${encodeURIComponent(keyword)}${exactMatch ? '&exactMatch=true' : ''}`,

    WEAPON_DETAIL_BASE: '/backENDV2/src/use_webside/settings/data_source/units/weapon/detail',  // 武器详情搜索（用于axios params传参）

    // 公共配置管理（search_config）
    CONFIG_GET: (key1, key2) => `/backENDV2/src/unites/search_config/get/${key1}/${key2}`,
    CONFIG_SAVE: '/backENDV2/src/unites/search_config/save',
    CONFIG_UPDATE: '/backENDV2/src/unites/search_config/update',
    CONFIG_LIST: '/backENDV2/src/unites/search_config/list',
    CONFIG_DELETE: (configId) => `/backENDV2/src/unites/search_config/delete/${configId}`,

    SEARCH_WEAPON_BY_PRICE_RANGE: '/backENDV2/src/use_webside/settings/data_source/units/weapon/price_range',  // 按价格区间查询饰品（带在售数量筛选）

    WEAPON_NAMES: '/backENDV2/src/use_webside/settings/data_source/units/weapon/names',  // 获取武器名称列表

    WEAPON_REFERENCE_PRICES: '/backENDV2/src/use_webside/settings/data_source/units/weapon/reference_prices',  // 批量查询参考价

    WEAPON_CSQAQ_ID: '/backENDV2/src/use_webside/settings/data_source/units/weapon/csqaq_id',  // 查询 csqaq_id

    INVENTORY_PENDANT_PRICE: '/backENDV2/src/use_webside/inventory/units/price/getPendantPrice',  // 获取单个挂件价格

    INVENTORY_GET_ALL_PENDANTS: '/backENDV2/src/use_webside/inventory/units/price/getAllPendants',  // 获取所有挂件数据

    

    // 类型和磨损等级搜索相关

    BUY_WEAPON_TYPES: '/backENDV2/src/use_webside/buy/units/filters/getWeaponTypes',

    BUY_FLOAT_RANGES: '/backENDV2/src/use_webside/buy/units/filters/getFloatRanges',

    BUY_STATUS_LIST: '/backENDV2/src/use_webside/buy/units/filters/getStatusList',

    BUY_STATUS_SUB_LIST: (status) => `/backENDV2/src/use_webside/buy/units/filters/getStatusSubList?status=${encodeURIComponent(status)}`,

    BUY_SEARCH_BY_TYPE_WEAR: '/backENDV2/src/use_webside/buy/units/data/searchByTypeAndWear',

    BUY_STATS_BY_TYPE_WEAR: '/backENDV2/src/use_webside/buy/units/stats/getStatsByTypeAndWear',

    BUY_YYYP_PRICE_INFO: (steamHashName) => `/backENDV2/src/use_webside/buy/units/price_info/getYyypPriceInfo/${encodeURIComponent(steamHashName)}`,



    LENT_WEAPON_TYPES: '/backENDV2/src/use_webside/lent/units/filters/getWeaponTypes',

    LENT_FLOAT_RANGES: '/backENDV2/src/use_webside/lent/units/filters/getFloatRanges',

    LENT_STATUS_LIST: '/backENDV2/src/use_webside/lent/units/filters/getStatusList',

    LENT_STATUS_SUB_LIST: (status) => `/backENDV2/src/use_webside/lent/units/filters/getStatusSubList?status=${encodeURIComponent(status)}`,

    LENT_PLATFORM_LIST: '/backENDV2/src/use_webside/lent/units/filters/getPlatformList',

    LENT_LENTER_LIST: '/backENDV2/src/use_webside/lent/units/filters/getLenterList',

    LENT_SEARCH_BY_TYPE_WEAR: '/backENDV2/src/use_webside/lent/units/data/searchByTypeAndWear',

    LENT_STATS_BY_TYPE_WEAR: '/backENDV2/src/use_webside/lent/units/stats/getStatsByTypeAndWear',

    

    // 借入数据查询（V2 API）
    RENTAL_DATA: (min, max) => `/backENDV2/src/use_webside/rental/units/data/getRentalData/${min}/${max}`,
    RENTAL_DATA_BY_STATUS: (status, min, max) => `/backENDV2/src/use_webside/rental/units/data/getRentalDataByStatus/${encodeURIComponent(status)}/${min}/${max}`,
    RENTAL_DATA_BY_STATUS_SUB: (statusSub, min, max) => `/backENDV2/src/use_webside/rental/units/data/getRentalDataByStatusSub/${encodeURIComponent(statusSub)}/${min}/${max}`,
    RENTAL_SEARCH_BY_NAME: (itemName) => `/backENDV2/src/use_webside/rental/units/data/selectRentalWeaponName/${encodeURIComponent(itemName)}`,
    RENTAL_SEARCH_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/rental/units/data/searchRentalByTimeRange/${startDate}/${endDate}`,

    // 借入统计（V2 API）
    RENTAL_STATS: '/backENDV2/src/use_webside/rental/units/stats/getRentalStats',
    RENTAL_STATS_BY_TIME: (startDate, endDate) => `/backENDV2/src/use_webside/rental/units/stats/getRentalStatsByTimeRange/${startDate}/${endDate}`,

    // 借入筛选选项（V2 API）
    RENTAL_WEAPON_TYPES: '/backENDV2/src/use_webside/rental/units/filters/getRentalWeaponTypes',
    RENTAL_FLOAT_RANGES: '/backENDV2/src/use_webside/rental/units/filters/getRentalFloatRanges',
    RENTAL_STATUS_LIST: '/backENDV2/src/use_webside/rental/units/filters/getRentalStatusList',
    RENTAL_STATUS_SUB_LIST: (status) => `/backENDV2/src/use_webside/rental/units/filters/getRentalStatusSubList/${encodeURIComponent(status)}`,
    RENTAL_PLATFORM_LIST: '/backENDV2/src/use_webside/rental/units/filters/getRentalPlatformList',
    RENTAL_USER_LIST: '/backENDV2/src/use_webside/rental/units/filters/getRentalUserList',

    // AES工具相关（V2 API - 新版本）

    AES_DECRYPT: '/spiderApiV2/src/web_site/youping/units/settings/dev_tools/aesDecrypt',

    AES_CHECK_LICENSE: '/spiderApiV2/src/web_site/youping/units/settings/dev_tools/aesCheckLicense',

    AES_HEALTH: '/spiderApiV2/src/web_site/youping/units/settings/dev_tools/aesHealth',

    // AES工具相关（V1 API - 已废弃，保留向后兼容）

    AES_DECRYPT_V1: '/aesToolsV1/decrypt',

    AES_CHECK_LICENSE_V1: '/aesToolsV1/check-license',

    AES_HEALTH_V1: '/aesToolsV1/health',



    // 爬虫相关

    // 悠悠有品数据同步（V2 API）
    YOUPIN_SYNC_NEW_DATA: '/spiderApiV2/src/web_site/youping/units/settings/data_source/syncNewData',  // 同步新增数据
    YOUPIN_SYNC_HISTORY_DATA: '/spiderApiV2/src/web_site/youping/units/settings/data_source/syncHistoryData',  // 同步历史数据
    YOUPIN_SYNC_WEAPON_PRICE: '/spiderApiV2/src/web_site/youping/units/settings/dev_tools/syncWeaponPrice',  // 同步价格数据
    YOUPIN_SYNC_WEAPON_TEMPLATES: '/spiderApiV2/src/web_site/youping/units/settings/dev_tools/syncWeaponTemplates',  // 同步武器模板

    YOUPIN_FETCH_ICONS: '/backENDV2/src/use_spider/youpin/selectWeapon/fetchWeaponIcons',   // 批量获取饰品图片

    YOUPIN_DOWNLOAD_ICONS: '/spiderApiV2/src/web_site/youping/units/settings/dev_tools/downloadWeaponIcons',   // 下载武器图标资源

    // BUFF数据同步（V2 API）
    BUFF_SYNC_NEW_DATA: '/spiderApiV2/src/web_site/buff/units/settings/data_source/syncNewData',  // 同步新增数据
    BUFF_SYNC_HISTORY_DATA: '/spiderApiV2/src/web_site/buff/units/settings/data_source/syncHistoryData',  // 同步历史数据

    // BUFF消息同步（V2 API）
    BUFF_SYNC_NEW_MESSAGES: '/spiderApiV2/src/web_site/buff/units/settings/buff_message_box/syncNewMessages',  // 同步新消息（增量）
    BUFF_SYNC_HISTORY_MESSAGES: '/spiderApiV2/src/web_site/buff/units/settings/buff_message_box/syncHistoryMessages',  // 同步历史消息（全量）

    // BUFF库存（V2 API）
    BUFF_GET_PRICE: '/spiderApiV2/src/web_site/buff/units/inventory/getBUFFPrice',  // 获取BUFF库存价格

    BUFF_SYNC_TEMPLATES: '/spiderApiV2/src/web_site/buff/units/settings/dev_tools/syncBuffTemplates',  // 同步BUFF饰品映射

    // BUFF商品搜索（V2 API）
    BUFF_GET_COMMODITIES: '/spiderApiV2/src/web_site/buff/units/item_search/on_sale/getCommoditiesByGoodsId',  // 获取BUFF商品在售列表

    // BUFF上架（V2 API）出售与出租共用同一接口，靠 listingType 区分
    BUFF_CREATE_LISTING: '/spiderApiV2/src/web_site/buff/units/on_sale/sell/createListing',  // 上架出售/出租
    BUFF_PREVIEW_LISTING: '/spiderApiV2/src/web_site/buff/units/on_sale/sell/previewListing',  // 上架预览（需 goods_id）

    // BUFF购买（V2 API）购买前必须先预览，服务端会核对价格
    BUFF_PREVIEW_BUY: '/spiderApiV2/src/web_site/buff/units/item_search/on_sale/previewBuy',  // 购买预览
    BUFF_BUY_COMMODITY: '/spiderApiV2/src/web_site/buff/units/item_search/on_sale/buyCommodity',  // 购买

    // BUFF求购与余额（V2 API）BUFF 是统一余额，无「转入求购账户」这一步
    BUFF_GET_BALANCE: '/spiderApiV2/src/web_site/buff/units/purchase/getBalance',  // 账户余额
    BUFF_PREVIEW_BUY_ORDER: '/spiderApiV2/src/web_site/buff/units/purchase/previewBuyOrder',  // 求购预览
    BUFF_CREATE_BUY_ORDER: '/spiderApiV2/src/web_site/buff/units/purchase/createBuyOrder',  // 创建求购

    // CSFloat 数据同步（V2 API）
    CSFLOAT_SYNC_NEW_DATA: '/spiderApiV2/src/web_site/csfloat/units/settings/data_source/syncNewData',  // CSFloat增量采集
    CSFLOAT_SYNC_HISTORY_DATA: '/spiderApiV2/src/web_site/csfloat/units/settings/data_source/syncHistoryData',  // CSFloat全量采集

    // C5 GAME 数据同步（V2 API）
    C5GAME_SYNC_NEW_DATA: '/spiderApiV2/src/web_site/c5game/units/settings/data_source/syncNewData',  // C5 GAME增量采集
    C5GAME_SYNC_HISTORY_DATA: '/spiderApiV2/src/web_site/c5game/units/settings/data_source/syncHistoryData',  // C5 GAME全量采集

    // IGXE 数据同步（V2 API）
    IGXE_SYNC_NEW_DATA: '/spiderApiV2/src/web_site/igxe/units/settings/data_source/syncNewData',  // IGXE增量采集
    IGXE_SYNC_HISTORY_DATA: '/spiderApiV2/src/web_site/igxe/units/settings/data_source/syncHistoryData',  // IGXE全量采集

    // 完美世界 库存组件（V2 API）
    PW_GET_INVENTORY_COMPONENT: '/spiderApiV2/src/web_site/prefectworld/units/stock_components/get_component/getInventoryComponent',  // 获取库存组件数据
    PW_DEPOSIT_TO_COMPONENT: '/spiderApiV2/src/web_site/prefectworld/units/stock_components/move_component/depositToComponent',  // 存入/取出物品到组件

    // Steam 数据同步（V2 API）
    STEAM_SYNC_NEW_DATA: '/spiderApiV2/src/web_site/steam/units/settings/data_source/syncNewData',  // Steam增量采集
    STEAM_SYNC_HISTORY_DATA: '/spiderApiV2/src/web_site/steam/units/settings/data_source/syncHistoryData',  // Steam全量采集

    // Steam 库存（V2 API）
    STEAM_GET_INVENTORY: '/spiderApiV2/src/web_site/steam/units/inventory/getInventory',  // 获取Steam库存

    // Steam 市场（V2 API）
    STEAM_COLLECT_HASH_NAMES: '/spiderApiV2/src/web_site/steam/units/market/hash_name/collectMarketHashNames',  // 采集Steam市场Hash Names
    STEAM_FETCH_HASH_NAMES: '/spiderApiV2/src/web_site/steam/units/market/hash_name/fetchSteamHashNames',  // 获取Steam饰品哈希（批量）
    STEAM_FETCH_HASH_NAMES_BY_WEAPON: '/spiderApiV2/src/web_site/steam/units/market/hash_name/fetchSteamHashNamesByWeapon',  // 获取Steam饰品哈希（单个武器）
    STEAM_SEARCH_RENAME: '/spiderApiV2/src/web_site/steam/units/mining/search_rename/searchRenameWeapon',  // Steam 改名饰品搜索
    STEAM_BUY_MARKET_ITEM: '/spiderApiV2/src/web_site/steam/units/market/buy/buyMarketItem',  // Steam 市场购买物品

    // Steam 库存挖掘（V2 API）
    STEAM_MINE_INVENTORY: '/spiderApiV2/src/web_site/steam/units/mining/mineInventory',  // 库存挖掘
    STEAM_CANCEL_MINING: '/spiderApiV2/src/web_site/steam/units/mining/cancelMining',  // 取消挖掘

    // 库存挖掘数据查询（V2 API，use_webside 侧）
    MINING_QUERY: '/backENDV2/src/use_spider/steam/mining/query',          // 查询挖掘数据
    MINING_STATS: '/backENDV2/src/use_spider/steam/mining/stats',          // 挖掘统计
    MINING_HISTORY: '/backENDV2/src/use_spider/steam/mining/history',      // 挖掘历史列表
    MINING_HISTORY_DELETE: (steamId) => `/backENDV2/src/use_spider/steam/mining/history/${steamId}`,  // 删除挖掘历史
    MINING_LATEST: '/backENDV2/src/use_spider/steam/mining/latest',        // 最新挖掘记录

    CSQAQ_MARKET_INDEX: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_index/market_index/getMarketIndex',  // 已拆分为下两个
    CSQAQ_INDEX_DATA: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_index/market_index/getIndexData',    // CSQAQ 指数（current_data）
    CSQAQ_CHART_DATA: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_index/market_index/getChartData',    // CSQAQ 折线图（最新24小时）
    CSQAQ_WEAPON_INFO_CHART: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_info/chart',  // 单件饰品图表（good_id/key/platform/period/style）
    CSQAQ_WEAPON_INFO_KLINE: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_info/kline',  // 单件饰品K线（无头浏览器，query: good_id, period, platform）
    CSQAQ_WEAPON_INFO_CHIP_DATA: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_info/chipData',  // 单件饰品获利筹码 chipData（无头浏览器，query: good_id）
    CSQAQ_WEAPON_INFO_GOOD: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_info/infoGood',  // 单件饰品详情（query: id）
    CSQAQ_WEAPON_INFO_STATISTIC: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_info/statistic',  // 单件饰品存世量走势（query: id）

    CSQAQ_GET_GOODS: '/csqaqSpiderV1/getGoodsList',  // CSQAQ同步获取商品

    CSQAQ_GET_GOODS_ASYNC: '/csqaqSpiderV1/getGoodsListAsync',  // CSQAQ异步获取商品

    CSQAQ_TASK_STATUS: '/csqaqSpiderV1/getTaskStatus',  // CSQAQ获取任务状态

    // 悠悠有品求购供应

    // 悠悠有品商品搜索 - 求购供应相关（新API V2）
    YOUPIN_GET_SUPPLY_LIST: '/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/supply/getSupplyList',  // 获取可供应的库存列表
    YOUPIN_SUBMIT_SUPPLY: '/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/supply/submitSupply',  // 提交供应（查询手续费）
    YOUPIN_CONFIRM_SUPPLY: '/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/supply/confirmSupply',  // 确认供应
    YOUPIN_SEND_OFFER: '/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/supply/sendOffer',  // 发送报价

    // 悠悠有品商品搜索 - ItemSearch页面相关（新API V2，按商品类型组织）
    YYYP_ITEM_SEARCH_ON_SALE_LIST: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList',  // 在售商品列表
    YYYP_ITEM_SEARCH_ON_SALE_DETAIL: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getWeaponDetail',  // 在售商品详情
    YYYP_ITEM_SEARCH_BUY_COMMODITY: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/buyCommodity',  // 购买在售商品
    YYYP_ITEM_SEARCH_CREATE_ORDER: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/createOrder',  // 创建订单并查询支付渠道（不支付）
    YYYP_ITEM_SEARCH_CONFIRM_PAYMENT: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/confirmPayment',  // 确认支付
    YYYP_ITEM_SEARCH_CANCEL_ORDER: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/cancelOrder',  // 取消订单

    // 饰品搜索页-发布求购（item_search/on_sale 复制实现）
    YYYP_ITEM_SEARCH_PUBLISH_WANTED_GET_TEMPLATE_INFO: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/publishWanted/getTemplateInfo',
    YYYP_ITEM_SEARCH_PUBLISH_WANTED_PRE_CHECK: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/publishWanted/preCheck',
    YYYP_ITEM_SEARCH_PUBLISH_WANTED_SAVE_ORDER: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/publishWanted/saveOrder',
    YYYP_ITEM_SEARCH_PUBLISH_WANTED_GET_BALANCE: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/publishWanted/getBalance',
    YYYP_ITEM_SEARCH_PUBLISH_WANTED_QUERY_TRANSFER_IN_BALANCE: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/publishWanted/queryTransferInBalance',
    YYYP_ITEM_SEARCH_PUBLISH_WANTED_CONFIRM_TRANSFER_IN: '/spiderApiV2/src/web_site/youping/units/item_search/on_sale/publishWanted/confirmTransferIn',

    YYYP_ITEM_SEARCH_ON_LEASE_LIST: '/spiderApiV2/src/web_site/youping/units/item_search/on_lease/getCommodityList',  // 在租商品列表

    YYYP_ITEM_SEARCH_PRESALE_LIST: '/spiderApiV2/src/web_site/youping/units/item_search/presale/getCommodityList',  // 预售商品列表
    YYYP_ITEM_SEARCH_PRESALE_DETAIL: '/spiderApiV2/src/web_site/youping/units/item_search/presale/getPresaleDetail',  // 预售详情
    YYYP_ITEM_SEARCH_BUY_PRESALE: '/spiderApiV2/src/web_site/youping/units/item_search/presale/buyPresaleCommodity',  // 购买预售商品

    YYYP_ITEM_SEARCH_PURCHASE_ORDER_LIST: '/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/getCommodityList',  // 求购订单列表

    YYYP_ITEM_SEARCH_PRICE_TREND: '/spiderApiV2/src/web_site/youping/units/item_search/price_trend/getPriceTrend',  // 价格走势

    YOUPIN_SELL_INVENTORY_ITEM: '/spiderApiV2/src/web_site/youping/units/inventory/sell/sellInventoryItem',  // 上架单个库存饰品（新版API）

    YOUPIN_GET_PUT_SHELF_INIT: '/spiderApiV2/src/web_site/youping/units/inventory/put_shelf/getPutShelfInit',  // 获取上架系数与协议（价格区间提示）

    CSQAQ_TASK_RESULT: '/csqaqSpiderV1/getTaskResult',  // CSQAQ获取任务结果

    CSQAQ_EXPORT: '/csqaqSpiderV1/exportGoods',  // CSQAQ导出商品

    // SteamDT相关（V2 API）
    STEAMDT_MARKET_INDEX: '/spiderApiV2/src/web_site/steamdt/units/home/market_index/getMarketIndex',  // 获取SteamDT大盘指数
    STEAMDT_MARKET_INDEX_HEADLESS: '/spiderApiV2/src/web_site/steamdt/units/home/market_index/getMarketIndexHeadless',  // 获取SteamDT大盘指数（无头浏览器）
    STEAMDT_KLINE: '/spiderApiV2/src/web_site/steamdt/units/data_website/market_overview/getKline',  // 获取SteamDT K线数据
    STEAMDT_HOMEPAGE_DATA: '/backENDV2/src/use_webside/home/units/steamdt/homepage-data',  // 获取SteamDT首页数据（饰品成交额等）



    // Steam登录相关（V2 API）
    STEAM_LOGIN: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/login',
    STEAM_LOGIN_VERIFY: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/verify',
    STEAM_LOGIN_REFRESH: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/refresh',
    STEAM_LOGIN_REFRESH_AUTO: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/refresh_auto',
    STEAM_LOGIN_CAPTCHA: (captchaGid) => `/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/captcha/${captchaGid}`,
    STEAM_LOGIN_GENERATE_CODE: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/generate_code',
    STEAM_QR_GENERATE: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/qrcode/generate',
    STEAM_QR_POLL: '/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/qrcode/poll',

    

    // GetAppToken 相关接口（V2）

    GET_APP_TOKEN_START_BUFF: '/spiderApiV2/src/get_app_token/units/settings/data_source/buff/start_proxy',  // 启动BUFF代理

    GET_APP_TOKEN_STOP_BUFF: '/spiderApiV2/src/get_app_token/units/settings/data_source/buff/stop_proxy',  // 停止BUFF代理

    GET_APP_TOKEN_GET_BUFF_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/buff/get_data',  // 获取BUFF数据

    GET_APP_TOKEN_CLEAR_BUFF_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/buff/clear_data',  // 清除BUFF数据

    GET_APP_TOKEN_START_YYYP: '/spiderApiV2/src/get_app_token/units/settings/data_source/yyyp/start_proxy',  // 启动悠悠有品代理

    GET_APP_TOKEN_STOP_YYYP: '/spiderApiV2/src/get_app_token/units/settings/data_source/yyyp/stop_proxy',  // 停止悠悠有品代理

    GET_APP_TOKEN_GET_YYYP_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/yyyp/get_data',  // 获取悠悠有品数据

    GET_APP_TOKEN_CLEAR_YYYP_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/yyyp/clear_data',  // 清除悠悠有品数据

    GET_APP_TOKEN_START_PERFECTWORLD: '/spiderApiV2/src/get_app_token/units/settings/data_source/perfectworld/start_proxy',  // 启动完美世界APP代理

    GET_APP_TOKEN_STOP_PERFECTWORLD: '/spiderApiV2/src/get_app_token/units/settings/data_source/perfectworld/stop_proxy',  // 停止完美世界APP代理

    GET_APP_TOKEN_GET_PERFECTWORLD_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/perfectworld/get_data',  // 获取完美世界APP数据

    GET_APP_TOKEN_CLEAR_PERFECTWORLD_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/perfectworld/clear_data',  // 清除完美世界APP数据

    GET_APP_TOKEN_START_CSFLOAT: '/spiderApiV2/src/get_app_token/units/settings/data_source/csfloat/start_proxy',  // 启动CsFloat代理

    GET_APP_TOKEN_STOP_CSFLOAT: '/spiderApiV2/src/get_app_token/units/settings/data_source/csfloat/stop_proxy',  // 停止CsFloat代理

    GET_APP_TOKEN_GET_CSFLOAT_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/csfloat/get_data',  // 获取CsFloat数据

    GET_APP_TOKEN_CLEAR_CSFLOAT_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/csfloat/clear_data',  // 清除CsFloat数据

    GET_APP_TOKEN_START_C5GAME: '/spiderApiV2/src/get_app_token/units/settings/data_source/c5game/start_proxy',  // 启动C5 GAME代理

    GET_APP_TOKEN_STOP_C5GAME: '/spiderApiV2/src/get_app_token/units/settings/data_source/c5game/stop_proxy',  // 停止C5 GAME代理

    GET_APP_TOKEN_GET_C5GAME_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/c5game/get_data',  // 获取C5 GAME数据

    GET_APP_TOKEN_CLEAR_C5GAME_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/c5game/clear_data',  // 清除C5 GAME数据

    GET_APP_TOKEN_START_IGXE: '/spiderApiV2/src/get_app_token/units/settings/data_source/igxe/start_proxy',  // 启动IGXE代理

    GET_APP_TOKEN_STOP_IGXE: '/spiderApiV2/src/get_app_token/units/settings/data_source/igxe/stop_proxy',  // 停止IGXE代理

    GET_APP_TOKEN_GET_IGXE_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/igxe/get_data',  // 获取IGXE数据

    GET_APP_TOKEN_CLEAR_IGXE_DATA: '/spiderApiV2/src/get_app_token/units/settings/data_source/igxe/clear_data',  // 清除IGXE数据

    GET_APP_TOKEN_PROXY_STATUS: '/spiderApiV2/src/get_app_token/units/settings/data_source/proxy_status',  // 查询代理状态

    GET_APP_TOKEN_HELP: '/spiderApiV2/src/get_app_token/units/settings/data_source/help',  // 获取帮助信息

    

    // ADB工具相关（V2 API）

    ADB_SCAN: '/backENDV2/src/use_webside/settings/dev_tools/units/adb/scan',  // 扫描局域网设备

    ADB_CONNECT: '/backENDV2/src/use_webside/settings/dev_tools/units/adb/connect',  // 连接设备

    ADB_DISCONNECT: '/backENDV2/src/use_webside/settings/dev_tools/units/adb/disconnect',  // 断开设备连接

    ADB_DEVICES: '/backENDV2/src/use_webside/settings/dev_tools/units/adb/devices',  // 获取ADB设备列表

    ADB_DEVICE_INFO: (serial) => `/backENDV2/src/use_webside/settings/dev_tools/units/adb/device/${serial}/info`,  // 获取设备信息

    ADB_CERT_STATUS: '/backENDV2/src/use_webside/settings/dev_tools/units/cert/status',  // 检查证书状态

    ADB_CERT_INSTALL: '/backENDV2/src/use_webside/settings/dev_tools/units/cert/install',  // 安装证书

    ADB_CERT_UNINSTALL: '/backENDV2/src/use_webside/settings/dev_tools/units/cert/uninstall',  // 卸载证书

    ADB_CERT_INFO: '/backENDV2/src/use_webside/settings/dev_tools/units/cert/info',  // 获取证书信息

    ADB_SHELL: (serial) => `/backENDV2/src/use_webside/settings/dev_tools/units/adb/device/${serial}/shell`,  // 执行Shell命令



    // CSQAQ相关（V2 API）

    CSQAQ_UPLOAD_MAPPING: '/backENDV2/src/use_webside/settings/dev_tools/units/csqaq/uploadMapping',  // 上传CSQAQ映射文件（DevTools）
    CSQAQ_FETCH_PRICE_HISTORY: '/backENDV2/src/use_webside/settings/dev_tools/units/csqaq/fetchPriceHistory',  // CSQAQ历史价格采集（SSE流式，DevTools）
    CSQAQ_STOP_FETCH_PRICE_HISTORY: '/backENDV2/src/use_webside/settings/dev_tools/units/csqaq/stopFetchPriceHistory',  // 停止CSQAQ历史价格采集（DevTools）
    CSQAQ_DATA_SOURCE_UPLOAD_MAPPING: '/backENDV2/src/use_webside/settings/data_source/csqaq/upload_mapping',  // 上传CSQAQ映射文件（DataSource）
    CSQAQ_DATA_SOURCE_CONFIG: '/backENDV2/src/use_webside/settings/data_source/csqaq/config',  // 获取CSQAQ配置

    // SteamDT 数据源配置（V2 API）
    STEAMDT_DATA_SOURCE_CONFIG: '/backENDV2/src/use_webside/settings/data_source/steamdt/config',  // 获取SteamDT配置

    // 饰品搜索（V2 API）
    ITEM_SEARCH_SEARCH: '/backENDV2/src/use_webside/settings/data_source/item_search/search',  // 搜索饰品
    ITEM_SEARCH_WEAPON_NAMES: '/backENDV2/src/use_webside/settings/data_source/item_search/weapon_names',  // 获取武器名称列表
    ITEM_SEARCH_CSQAQ_DETAIL: '/backENDV2/src/use_webside/settings/data_source/item_search/csqaq_detail',  // 获取CSQAQ饰品详情
    ITEM_SEARCH_BATCH_STICKER_PRICES: '/backENDV2/src/use_webside/settings/data_source/item_search/batch_sticker_prices',  // 批量查询印花/挂件价格

    // DevTools筛选数据（V2 API）
    DEV_TOOLS_V2_STEAM_ACCOUNTS: '/backENDV2/src/use_webside/settings/dev_tools/units/filters/getSteamAccounts',
    DEV_TOOLS_V2_GET_CONFIG_ACCOUNTS: '/backENDV2/src/use_webside/settings/dev_tools/units/filters/getConfigAccounts',

    

    // 图片相关

    WEAPON_IMAGE: (imageName) => `/backENDV2/src/use_webside/units/images/weapon_image/${imageName}`,  // 获取武器图片

    WEAPON_IMAGE_CHECK: (imageName) => `/backENDV2/src/use_webside/units/images/weapon_image/check/${imageName}`,  // 检查武器图片是否存在

    

    // Home页面图表数据（V2 API）

    HOME_INVENTORY_ALL: '/backENDV2/src/use_webside/home/units/charts/inventory/all',  // 获取所有库存数据

    HOME_COMPONENTS_ALL: '/backENDV2/src/use_webside/home/units/charts/components/all',  // 获取所有库存组件数据

    HOME_BUY_ALL: '/backENDV2/src/use_webside/home/units/charts/buy/all',  // 获取所有购入数据

    HOME_SELL_ALL: '/backENDV2/src/use_webside/home/units/charts/sell/all',  // 获取所有出售数据

    // Home页面独立API（V2，从其他模块分离）

    HOME_BUY_STATS: '/backENDV2/src/use_webside/home/units/buy_stats/getBuyStats',  // 购买统计

    HOME_STEAM_IDS: '/backENDV2/src/use_webside/home/units/steam_accounts/steam_ids',  // Steam账号列表

    HOME_INVENTORY_BY_STEAM_ID: (steamId) => `/backENDV2/src/use_webside/home/units/inventory/${steamId}`,  // 指定账号库存

    HOME_COMPONENTS_BY_STEAM_ID: (steamId) => `/backENDV2/src/use_webside/home/units/components/${steamId}`,  // 指定账号组件

    HOME_STEAMDT_HOMEPAGE_DATA: '/backENDV2/src/use_webside/home/units/steamdt/homepage-data',  // SteamDT首页数据

    

    // 正在出售相关

    ON_SALE_YYYP_ACCOUNTS: '/backENDV2/src/use_webside/on_sale/units/accounts/getYYYPAccounts',  // 获取悠悠有品账号列表

    ON_SALE_BUFF_ACCOUNTS: '/backENDV2/src/use_webside/on_sale/units/accounts/getBuffAccounts',  // 获取BUFF账号列表

    ON_SALE_ITEMS: '/backENDV2/src/use_webside/on_sale/units/items/getOnSaleItems',  // 获取在售商品列表

    ON_SALE_REMOVE: '/backENDV2/src/use_webside/on_sale/units/items/removeFromSale',  // 下架商品
    ON_SALE_UPDATE_PRICE: '/backENDV2/src/use_webside/on_sale/units/items/updateSalePrice',  // 在售改价（按 platform 分流）



    // 库存相关（V2 API）

    INVENTORY_STEAM_IDS: '/backENDV2/src/use_webside/inventory/units/accounts/getSteamIds',  // 获取Steam账号列表

    INVENTORY_DATA: (steamId) => `/backENDV2/src/use_webside/inventory/units/data/getInventory/${steamId}`,  // 获取库存数据

    INVENTORY_GROUPED: (steamId) => `/backENDV2/src/use_webside/inventory/units/data/getGroupedInventory/${steamId}`,  // 获取分组库存数据

    INVENTORY_STATS: (steamId) => `/backENDV2/src/use_webside/inventory/units/stats/getInventoryStats/${steamId}`,  // 获取库存统计

    INVENTORY_UPDATE_BUY_PRICE: (steamId, assetid) => `/backENDV2/src/use_webside/inventory/units/data/updateBuyPrice/${steamId}/${assetid}`,  // 更新购入价格

    INVENTORY_YYYP_LOWEST_PRICE: '/backENDV2/src/use_webside/inventory/units/price/getYYYPLowestPrice',  // 获取悠悠有品底价

    // 库存组件相关（V2 API）
    STOCK_COMPONENTS_STEAM_IDS: '/backENDV2/src/use_webside/stock_components/units/accounts/getSteamIds',
    STOCK_COMPONENTS_COUNT: (steamId) => `/backENDV2/src/use_webside/stock_components/units/accounts/getComponentCount/${steamId}`,
    STOCK_COMPONENTS_WEAPON_TYPES: (steamId) => `/backENDV2/src/use_webside/stock_components/units/filters/getWeaponTypes/${steamId}`,
    STOCK_COMPONENTS_FLOAT_RANGES: (steamId) => `/backENDV2/src/use_webside/stock_components/units/filters/getFloatRanges/${steamId}`,
    STOCK_COMPONENTS_INVENTORY: (steamId) => `/backENDV2/src/use_webside/stock_components/units/data/getComponentInventory/${steamId}`,
    STOCK_COMPONENTS_DATA: (steamId) => `/backENDV2/src/use_webside/stock_components/units/data/getComponents/${steamId}`,
    STOCK_COMPONENTS_GROUPED: (steamId) => `/backENDV2/src/use_webside/stock_components/units/data/getGroupedComponents/${steamId}`,
    STOCK_COMPONENTS_STATS: (steamId) => `/backENDV2/src/use_webside/stock_components/units/stats/getComponentsStats/${steamId}`,
    STOCK_COMPONENTS_UPDATE_BUY_PRICE: (steamId, goodsAssetId) => `/backENDV2/src/use_webside/stock_components/units/price/updateBuyPrice/${steamId}/${goodsAssetId}`,
    STOCK_COMPONENTS_AUTO_FILL_PRICES: (steamId) => `/backENDV2/src/use_webside/stock_components/units/price/autoFillPrices/${steamId}`,
    STOCK_COMPONENTS_FILL_REFERENCE_PRICE: (steamId, source) => `/backENDV2/src/use_webside/stock_components/units/price/fillReferencePrice/${steamId}/${source}`,
    STOCK_COMPONENTS_UPDATE_PRICES_FROM_CSQAQ: '/spiderApiV2/src/web_site/csqaq/units/QAQ_API/stock_components/updatePricesFromCsqaq',

    // 悠悠有品租赁相关

    YYYP_GET_LEASE_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/lent/getLeaseList',  // 获取租赁列表（新API）
    YYYP_GET_SUBLEASE_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/getSubleaseList',  // 获取转租列表（新API）
    YYYP_GET_SELL_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/sell/getSellList',  // 获取出售列表（新API）
    YYYP_GET_RENTED_OUT_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/rented_out/getRentedOutList',  // 获取已租出列表（新API）
    YYYP_GET_MY_SELL_ORDERS: '/spiderApiV2/src/web_site/youping/units/on_sale/offer_handling/getMySellOrders',  // 获取我的出售订单（报价处理，新API）
    YYYP_GET_MY_BUY_ORDERS: '/spiderApiV2/src/web_site/youping/units/on_sale/offer_handling/getMyBuyOrders',  // 获取我的收货订单（报价处理，新API）
    YYYP_PROCESS_OFFER_BUTTON: '/spiderApiV2/src/web_site/youping/units/on_sale/offer_handling/processOfferButton',  // 处理报价按钮操作（新API）
    YYYP_GET_PURCHASE_ORDERS: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/getPurchaseOrders',  // 获取求购订单（求购中/暂停中，新API）
    YYYP_GET_PENDING_PAYMENT_ORDERS: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/getPendingPaymentOrders',  // 获取待支付订单（新API）
    YYYP_PAUSE_PURCHASE_ORDER: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/pauseOrder',  // 暂停求购订单（新API）
    YYYP_OPEN_PURCHASE_ORDER: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/paused/openOrder',  // 开启暂停中的求购订单
    YYYP_DELETE_PURCHASE_ORDER: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/deleteOrder',  // 删除求购订单（新API）
    YYYP_GET_ORDER_INFO: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/getOrderInfo',  // 获取订单详情（新API）
    YYYP_PRE_UPDATE_CHECK: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/preUpdateCheck',  // 修改前置检查（新API）
    YYYP_EDIT_PURCHASE_ORDER: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/editOrder',  // 修改求购订单（新API）
    YYYP_QUICK_PRICE_INCREASE: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/quickIncrease',  // 一键加价预检查（新API）
    YYYP_CONFIRM_PRICE_INCREASE: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/purchasing/confirmQuickIncrease',  // 确认一键加价（新API）
    YYYP_GET_PURCHASE_RECORDS: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/history/getRecords',  // 获取求购记录（分页）
    YYYP_SEARCH_PURCHASE_TEMPLATE: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/queryTemplate',  // 搜索求购饰品模板
    YYYP_GET_TEMPLATE_PURCHASE_INFO: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/getTemplateInfo',  // 获取求购发布详情
    YYYP_PRE_PURCHASE_ORDER_CHECK: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/preCheck',  // 求购预检查
    YYYP_SAVE_PURCHASE_ORDER: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/saveOrder',  // 提交求购订单
    YYYP_GET_PURCHASE_BALANCE: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/getBalance',  // 获取求购余额
    YYYP_QUERY_TRANSFER_IN_BALANCE: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/queryTransferInBalance',  // 查询钱包可转入余额
    YYYP_CONFIRM_TRANSFER_IN: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/confirmTransferIn',  // 确认从钱包转入
    YYYP_CONFIRM_TRANSFER_OUT: '/spiderApiV2/src/web_site/youping/units/on_sale/purchase_request/search/confirmTransferOut',  // 确认转出到钱包
    YYYP_OFF_SHELF: '/spiderApiV2/src/web_site/youping/units/on_sale/sell/offShelf',  // 下架商品（新API）
    YYYP_CANCEL_SUBLEASE: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/cancelSublease',  // 取消转租（新API）
    YYYP_CHANGE_PRICE: '/spiderApiV2/src/web_site/youping/units/on_sale/sell/changePrice',  // 改价（售卖商品，新API）
    YYYP_BATCH_CHANGE_PRICE: '/spiderApiV2/src/web_site/youping/units/on_sale/sell/batchChangePrice',  // 批量改价（售卖商品，新API）
    YYYP_CHANGE_RENT_PRICE: '/spiderApiV2/src/web_site/youping/units/on_sale/lent/changePrice',  // 改价（租赁/转租，支持单个和批量，新API）
    YYYP_GET_INSTANT_PAYMENT_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/instant/getInstantPaymentList',  // 获取0CD(秒到账)订单列表（新API）
    YYYP_RETRIEVE_RECORD: '/spiderApiV2/src/web_site/youping/units/on_sale/instant/retrieveRecord',  // 秒到账提取资金（新API）
    YYYP_GET_ITEM_STAR_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/stars/item_stars/getItemStarList',  // 获取皮肤关注列表（新API）
    YYYP_CANCEL_ITEM_STAR: '/spiderApiV2/src/web_site/youping/units/on_sale/stars/item_stars/cancelItemStar',  // 取消皮肤关注（新API）
    YYYP_GET_GOODS_STAR_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/stars/goods_stars/getGoodsStarList',  // 获取单件关注列表（新API）
    YYYP_CANCEL_GOODS_STAR: '/spiderApiV2/src/web_site/youping/units/on_sale/stars/goods_stars/cancelGoodsStar',  // 取消单件关注（新API）
    YYYP_GET_SUBLEASE_AGREEMENT: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/getSubleaseAgreement',  // 获取转租协议（新API）
    YYYP_GET_SUBLEASE_DETAIL: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/getSubleaseDetail',  // 获取转租详情（新API）
    YYYP_RENT_INIT: '/spiderApiV2/src/web_site/youping/units/on_sale/lent/rentInit',  // 获取出租初始化配置（新API）
    YYYP_GET_COMPENSATION_TEXT: '/spiderApiV2/src/web_site/youping/units/on_sale/lent/getCompensationText',  // 获取赔付文本信息（新API）

    // 悠悠有品消息盒子相关（新API V2）
    YYYP_GET_NEW_MESSAGES: '/spiderApiV2/src/web_site/youping/units/settings/yyyp_message_box/getNewMessages',  // 获取新消息（增量采集）
    YYYP_GET_ALL_MESSAGES: '/spiderApiV2/src/web_site/youping/units/settings/yyyp_message_box/getAllMessages',  // 获取所有消息（全量采集）
    YYYP_MARK_MESSAGE_READ: '/spiderApiV2/src/web_site/youping/units/settings/yyyp_message_box/markMessageRead',  // 标记消息为已读
    YYYP_DELETE_MESSAGE: '/spiderApiV2/src/web_site/youping/units/settings/yyyp_message_box/deleteMessage',  // 删除消息

    // 悠悠有品预售相关（新API V2）
    YYYP_GET_PRESALE_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/presale/getPresaleList',  // 获取预售列表
    YYYP_GET_TRANSFER_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/transfer/getTransferList',  // 获取过户（租赁过户）列表
    YYYP_CANCEL_TRANSFER: '/spiderApiV2/src/web_site/youping/units/on_sale/transfer/cancelTransfer',  // 取消过户（过户商品的下架动作）
    YYYP_PRESALE_OFF_SHELF_INIT: '/spiderApiV2/src/web_site/youping/units/on_sale/presale/offShelfInit',  // 预售下架预检查（返回定金提示）
    YYYP_PRESALE_OFF_SHELF: '/spiderApiV2/src/web_site/youping/units/on_sale/presale/offShelf',  // 预售下架
    YYYP_PRESALE_CHANGE_PRICE_PRE_CHECK: '/spiderApiV2/src/web_site/youping/units/on_sale/presale/changePricePreCheck',  // 预售改价预检查
    YYYP_GET_PRESALE_DETAIL: '/spiderApiV2/src/web_site/youping/units/item_search/presale/getPresaleDetail',  // 获取预售详情
    YYYP_BUY_PRESALE_COMMODITY: '/spiderApiV2/src/web_site/youping/units/item_search/presale/buyPresaleCommodity',  // 购买预售商品

    // 悠悠有品过户相关（新API V2）
    YYYP_GET_TRANSFER_LIST: '/spiderApiV2/src/web_site/youping/units/on_sale/transfer/getTransferList',  // 获取过户列表

    // 悠悠有品转租相关（新API V2）
    YYYP_CHANGE_SUBLEASE_PRICE: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/changeSubleasePrice',  // 修改转租价格（0CD改价）
    YYYP_SUBLEASE_AUTO_PRICING: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/autoPricing',  // 转租商品自动定价
    YYYP_SUBLEASE_GET_COMPENSATION_TEXT: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/getCompensationText',  // 获取转租赔付文本信息
    YYYP_SUBLEASE_GET_BATCH_COMPENSATION_TEXT: '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/getBatchCompensationText',  // 批量获取转租赔付文本信息

    // 悠悠有品出租自动定价（爬虫端）
    YYYP_RENT_AUTO_PRICING: '/spiderApiV2/src/web_site/youping/units/on_sale/lent/autoPricing',

    

    // 登录设置相关

    LOGIN_SETTINGS: '/backENDV2/src/use_webside/settings/system_settings/units/login/getSettings',  // 获取登录设置
    LOGIN_SETTINGS_SAVE: '/backENDV2/src/use_webside/settings/system_settings/units/login/saveSettings',  // 保存登录设置
    LOGIN_VERIFY: '/backENDV2/src/use_webside/settings/system_settings/units/login/verify',  // 验证登录

    // DatabaseManager V2 API
    DB_MANAGER_TABLES: '/backENDV2/src/use_webside/settings/database_manager/units/data/getTables',
    DB_MANAGER_TABLE_DATA: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/getData`,
    DB_MANAGER_TABLE_STRUCTURE: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/getStructure`,
    DB_MANAGER_TABLE_ADD_ROW: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/addRow`,
    DB_MANAGER_TABLE_UPDATE_ROW: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/updateRow`,
    DB_MANAGER_TABLE_DELETE_ROW: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/deleteRow`,
    DB_MANAGER_TABLE_DELETE_BATCH: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/deleteBatch`,
    DB_MANAGER_TABLE_EXPORT: (t) => `/backENDV2/src/use_webside/settings/database_manager/units/data/table/${t}/export`,
    DB_MANAGER_EXECUTE_QUERY: '/backENDV2/src/use_webside/settings/database_manager/units/data/executeQuery',
    DB_MANAGER_EXECUTE_FILE: '/backENDV2/src/use_webside/settings/database_manager/units/data/executeSqlFile',
    DB_MANAGER_SAVED_QUERIES: '/backENDV2/src/use_webside/settings/database_manager/units/data/getSavedQueries',
    DB_MANAGER_SAVE_QUERY: '/backENDV2/src/use_webside/settings/database_manager/units/data/saveQuery',
    DB_MANAGER_STATS: '/backENDV2/src/use_webside/settings/database_manager/units/data/getStats',
    DB_MANAGER_INFO: '/backENDV2/src/use_webside/settings/database_manager/units/data/getInfo',
    DB_MANAGER_BACKUP: '/backENDV2/src/use_webside/settings/database_manager/units/data/backup',
    DB_MANAGER_DOWNLOAD: '/backENDV2/src/use_webside/settings/database_manager/units/data/download',
    DB_MANAGER_RESTORE: '/backENDV2/src/use_webside/settings/database_manager/units/data/restore',
    DB_MANAGER_OPTIMIZE: '/backENDV2/src/use_webside/settings/database_manager/units/data/optimize',
    DB_MANAGER_VACUUM: '/backENDV2/src/use_webside/settings/database_manager/units/data/vacuum',
    DB_MANAGER_TRUNCATE: '/backENDV2/src/use_webside/settings/database_manager/units/data/truncate',
    DB_MANAGER_DROP: '/backENDV2/src/use_webside/settings/database_manager/units/data/drop',
    // 数据库后端配置与迁移
    DB_MANAGER_GET_DB_CONFIG: '/backENDV2/src/use_webside/settings/database_manager/units/data/getDbConfig',
    DB_MANAGER_SAVE_DB_CONFIG: '/backENDV2/src/use_webside/settings/database_manager/units/data/saveDbConfig',
    DB_MANAGER_TEST_MYSQL: '/backENDV2/src/use_webside/settings/database_manager/units/data/testMysql',
    DB_MANAGER_MIGRATE_TO_MYSQL: '/backENDV2/src/use_webside/settings/database_manager/units/data/migrateToMysql',
    DB_MANAGER_MIGRATE_TO_SQLITE: '/backENDV2/src/use_webside/settings/database_manager/units/data/migrateToSqlite',

    // 版本更新相关

    UPDATE_CHECK: '/backENDV2/src/use_webside/settings/version_update/units/update/checkUpdate',  // 检查更新

    UPDATE_CURRENT_VERSION: '/backENDV2/src/use_webside/settings/version_update/units/update/getCurrentVersion',  // 获取当前版本

    UPDATE_DOWNLOAD: '/backENDV2/src/use_webside/settings/version_update/units/update/downloadUpdate',  // 下载更新包

    UPDATE_CHECK_LOCAL: '/backENDV2/src/use_webside/settings/version_update/units/update/checkLocalUpdate',  // 检查本地更新包

    UPDATE_APPLY: '/backENDV2/src/use_webside/settings/version_update/units/update/applyUpdate',  // 执行更新

    UPDATE_RESTART: '/backENDV2/src/use_webside/settings/version_update/units/update/restartSystem',  // 重启系统

    BACKEND_HEALTH: '/backENDV2/health',  // Backend 健康检查（更新后轮询用）
    SPIDER_HEALTH: '/health',  // Spider 健康检查（更新后轮询用，相对 /spider 前缀）

    VERSION_DOCUMENTS_TREE: '/backENDV2/src/use_webside/settings/version_update/units/docs/getDocumentTree',

    VERSION_DOCUMENTS_FILE: '/backENDV2/src/use_webside/settings/version_update/units/docs/getDocumentFile',

    VERSION_DOCUMENTS_IMAGE: '/backENDV2/src/use_webside/settings/version_update/units/docs/getDocumentImage',

    // 系统消息相关（V2 API）
    SYS_MESSAGE_LIST: (page, limit) => `/backENDV2/src/use_webside/settings/sys_message/list/${page}/${limit}`,
    SYS_MESSAGE_STATS: '/backENDV2/src/use_webside/settings/sys_message/stats',
    SYS_MESSAGE_TYPES: '/backENDV2/src/use_webside/settings/sys_message/types',
    SYS_MESSAGE_SOURCES: '/backENDV2/src/use_webside/settings/sys_message/sources',
    SYS_MESSAGE_MARK_READ: '/backENDV2/src/use_webside/settings/sys_message/mark_read',
    SYS_MESSAGE_MARK_ALL_READ: '/backENDV2/src/use_webside/settings/sys_message/mark_all_read',
    SYS_MESSAGE_DELETE: '/backENDV2/src/use_webside/settings/sys_message/delete',
    SYS_MESSAGE_SEARCH_KEYWORD: '/backENDV2/src/use_webside/settings/sys_message/search/keyword',
    SYS_MESSAGE_SEARCH_TIME: '/backENDV2/src/use_webside/settings/sys_message/search/time',
    SYS_MESSAGE_SEARCH_FILTER: '/backENDV2/src/use_webside/settings/sys_message/search/filter',
    SYS_MESSAGE_CREATE: '/backENDV2/src/use_webside/settings/sys_message/create',

    // 改名饰品搜索结果（V2 API） - 对应 SearchWeaponRename 页面
    SEARCH_RENAME_ITEM_ADD: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/item/add',
    SEARCH_RENAME_ITEM_GET: (id) => `/backENDV2/src/use_webside/data_spider/search_weapon_rename/item/get/${id}`,
    SEARCH_RENAME_ITEM_UPDATE_STATUS: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/item/update_status',
    SEARCH_RENAME_ITEMS_BATCH: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/items/batch',
    SEARCH_RENAME_ITEMS_LIST: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/items/list',
    SEARCH_RENAME_ITEMS_COUNT: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/items/count',
    SEARCH_RENAME_ITEMS_LATEST: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/items/latest',
    SEARCH_RENAME_ITEMS_CLEAR: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/items/clear',
    SEARCH_RENAME_ITEMS_CLEANUP: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/items/cleanup',
    SEARCH_RENAME_STATS: '/backENDV2/src/use_webside/data_spider/search_weapon_rename/stats',

    // 挂件搜索结果（V2 API） - 对应 SearchPendant 页面
    SEARCH_PENDANT_CONFIG_SAVE: '/backENDV2/src/use_webside/data_spider/search_pendant/config/save',
    SEARCH_PENDANT_ITEM_ADD: '/backENDV2/src/use_webside/data_spider/search_pendant/item/add',
    SEARCH_PENDANT_ITEMS_LIST: '/backENDV2/src/use_webside/data_spider/search_pendant/items/list',
    SEARCH_PENDANT_ITEM_UPDATE_STATUS: '/backENDV2/src/use_webside/data_spider/search_pendant/item/update_status',
    SEARCH_PENDANT_ITEMS_CLEAR: '/backENDV2/src/use_webside/data_spider/search_pendant/items/clear',

    // 悠悠有品自动购买相关（V2 API）
    AUTO_BUY_RENAMED_WEAPON: '/spiderApiV2/src/web_site/youping/auto_weapon/autoBuyRenamedWeapon',  // 自动购买改名武器
    AUTO_BUY_PENDANT_WEAPON: '/spiderApiV2/src/web_site/youping/auto_weapon/autoBuyPendantWeapon',  // 自动购买挂件武器
    STOP_PENDANT_SEARCH: '/spiderApiV2/src/web_site/youping/auto_weapon/stopPendantSearch',  // 停止挂件搜索
    GET_PENDANT_SEARCH_PROGRESS: '/spiderApiV2/src/web_site/youping/auto_weapon/getPendantSearchProgress',  // 获取挂件搜索进度
    REALTIME_LOWEST_PRICE: '/spiderApiV2/src/web_site/youping/auto_weapon/getRealTimeLowestPrice',  // 实时查询悠悠在售底价

    // 盈亏统计（V2 API）
    PNL_CALENDAR: '/backENDV2/src/use_webside/pnl/units/data/getCalendar',
    PNL_INVENTORY_CALENDAR: '/backENDV2/src/use_webside/pnl/units/data/getInventoryCalendar',
    PNL_RECORD_INV_SNAPSHOT: '/backENDV2/src/use_webside/pnl/units/ops/recordInventorySnapshot',
    PNL_OVERALL_STATS: '/backENDV2/src/use_webside/pnl/units/data/getOverallStats',
    PNL_DAILY_DETAIL: '/backENDV2/src/use_webside/pnl/units/data/getDailyDetail',
    PNL_ORPHAN_SELLS: '/backENDV2/src/use_webside/pnl/units/data/getOrphanSells',
    PNL_CANDIDATE_BUYS: '/backENDV2/src/use_webside/pnl/units/data/getCandidateBuys',
    PNL_DATA_USER_LIST: '/backENDV2/src/use_webside/pnl/units/filters/getDataUserList',
    PNL_MONTH_RANGE: '/backENDV2/src/use_webside/pnl/units/filters/getMonthRange',
    PNL_RUN_AUTO_PAIRING: '/backENDV2/src/use_webside/pnl/units/ops/runAutoPairing',
    PNL_MANUAL_PAIR: '/backENDV2/src/use_webside/pnl/units/ops/manualPair',
    PNL_UNPAIR: '/backENDV2/src/use_webside/pnl/units/ops/unpair',
    PNL_SET_EXCLUDED: '/backENDV2/src/use_webside/pnl/units/ops/setExcluded',

  },

  // 悠悠有品自动购买相关（V2 API） - 顶层配置（向后兼容）
  YOUPIN_AUTO_BUY_RENAMED_WEAPON: '/spiderApiV2/src/web_site/youping/auto_weapon/autoBuyRenamedWeapon',  // 自动购买改名武器
  YOUPIN_AUTO_BUY_PENDANT_WEAPON: '/spiderApiV2/src/web_site/youping/auto_weapon/autoBuyPendantWeapon',  // 自动购买挂件武器
  YOUPIN_STOP_PENDANT_SEARCH: '/spiderApiV2/src/web_site/youping/auto_weapon/stopPendantSearch',  // 停止挂件搜索
  YOUPIN_GET_PENDANT_SEARCH_PROGRESS: '/spiderApiV2/src/web_site/youping/auto_weapon/getPendantSearchProgress',  // 获取挂件搜索进度
  YOUPIN_REALTIME_LOWEST_PRICE: '/spiderApiV2/src/web_site/youping/auto_weapon/getRealTimeLowestPrice',  // 实时查询悠悠在售底价

  // 悠悠有品库存租借相关（V2 API） - 顶层配置（向后兼容）
  YOUPIN_GET_INVENTORY_EXTEND_INFO: '/spiderApiV2/src/web_site/youping/units/inventory/lent/getInventoryExtendInfo',  // 获取库存扩展信息
  YOUPIN_UPLOAD_RENT: '/spiderApiV2/src/web_site/youping/units/inventory/lent/uploadRent',  // 上传租借饰品

}



// 获取完整的 API URL

export const getApiUrl = (endpoint) => {

  return `${API_CONFIG.BASE_URL}${endpoint}`

}



// 获取完整的爬虫 API URL

export const getSpiderApiUrl = (endpoint) => {

  return `${API_CONFIG.SPIDER_BASE_URL}${endpoint}`

}



// 快捷方法

export const apiUrls = {

  // 数据源（V2 API）

  dataSourceList: () => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_LIST),

  dataSourceCreate: () => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_CREATE),

  dataSourceById: (id) => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_BY_ID(id)),

  dataSourceUpdate: (id) => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_UPDATE(id)),

  dataSourceDelete: (id) => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_DELETE(id)),

  dataSourceTest: () => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_TEST),

  dataSourceCollect: (id) => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_COLLECT(id)),

  dataSourceToggle: (id) => getApiUrl(API_CONFIG.ENDPOINTS.DATA_SOURCE_V2_TOGGLE(id)),

  // 自动化管理（V2 API）
  autoManagerTaskList: () => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_TASK_LIST),
  autoManagerCreateTask: () => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_CREATE_TASK),
  autoManagerUpdateTask: (id) => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_UPDATE_TASK(id)),
  autoManagerDeleteTask: (id) => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_DELETE_TASK(id)),
  autoManagerToggleTask: (id) => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_TOGGLE_TASK(id)),
  autoManagerExecutingTasks: () => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_EXECUTING_TASKS),
  autoManagerSteamAccounts: () => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_STEAM_ACCOUNTS),
  autoManagerSearchConfigs: () => getApiUrl(API_CONFIG.ENDPOINTS.AUTO_MANAGER_V2_SEARCH_CONFIGS),

  // Steam库存历史（V2 API）
  steamInventoryHistoryList: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_INVENTORY_HISTORY_V2_LIST),

  // 购买数据（V2 API）

  buyStatsFiltered: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_STATS_FILTERED),

  buyDataFiltered: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_DATA_FILTERED),

  buyCountNumber: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_COUNT_NUMBER),

  buySearchTimeRange: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.BUY_SEARCH_TIME_RANGE(startDate, endDate)),

  buyStatsTimeRange: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.BUY_STATS_TIME_RANGE(startDate, endDate)),

  buyDataUserList: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_DATA_USER_LIST),

  

  // 销售数据（V2 API）

  sellStatsFiltered: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_STATS_FILTERED),

  sellDataFiltered: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_DATA_FILTERED),

  sellSearchTimeRange: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.SELL_SEARCH_TIME_RANGE(startDate, endDate)),

  sellStatsTimeRange: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.SELL_STATS_TIME_RANGE(startDate, endDate)),

  sellDataUserList: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_DATA_USER_LIST),

  

  // 租赁数据（V2 API）
  lentData: (min, max) => getApiUrl(API_CONFIG.ENDPOINTS.LENT_DATA(min, max)),
  lentDataByStatus: (status, min, max) => getApiUrl(API_CONFIG.ENDPOINTS.LENT_DATA_BY_STATUS(status, min, max)),
  lentDataByStatusSub: (statusSub, min, max) => getApiUrl(API_CONFIG.ENDPOINTS.LENT_DATA_BY_STATUS_SUB(statusSub, min, max)),
  lentSearchByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.LENT_SEARCH_BY_TIME(startDate, endDate)),
  lentStatsByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.LENT_STATS_BY_TIME(startDate, endDate)),

  lentStatsFiltered: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_STATS_FILTERED),

  lentDataFiltered: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_DATA_FILTERED),



  // 消息数据

  messageData: (page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.MESSAGE_DATA(page, limit)),

  messageStats: () => getApiUrl(API_CONFIG.ENDPOINTS.MESSAGE_STATS),

  messageTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.MESSAGE_TYPES),

  searchMessageByKeyword: () => getApiUrl(API_CONFIG.ENDPOINTS.MESSAGE_SEARCH_BY_KEYWORD),

  searchMessageByTime: () => getApiUrl(API_CONFIG.ENDPOINTS.MESSAGE_SEARCH_BY_TIME),

  searchMessageByType: () => getApiUrl(API_CONFIG.ENDPOINTS.MESSAGE_SEARCH_BY_TYPE),



  // BUFF 消息数据（buff_messagebox）

  buffMessageData: (page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.BUFF_MESSAGE_DATA(page, limit)),

  buffMessageTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.BUFF_MESSAGE_TYPES),

  

  // Steam购买数据

  steamBuyGameNames: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_GAME_NAMES),

  steamBuyData: (page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_DATA(page, limit)),

  steamBuyStats: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_STATS),

  steamBuyStatsBySearch: (keyword) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_STATS_BY_SEARCH(keyword)),

  steamBuyStatsByGameName: (gameName) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_STATS_BY_GAME_NAME(gameName)),

  steamBuyDataByGameName: (gameName, page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_DATA_BY_GAME_NAME(gameName, page, limit)),

  steamBuySearchByName: (itemName) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_SEARCH_BY_NAME(itemName)),

  steamBuySearchByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_SEARCH_BY_TIME(startDate, endDate)),

  steamBuyStatsByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_BUY_STATS_BY_TIME(startDate, endDate)),

  

  // Steam销售数据

  steamSellGameNames: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_GAME_NAMES),

  steamSellData: (page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_DATA(page, limit)),

  steamSellStats: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_STATS),

  steamSellStatsBySearch: (keyword) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_STATS_BY_SEARCH(keyword)),

  steamSellStatsByGameName: (gameName) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_STATS_BY_GAME_NAME(gameName)),

  steamSellDataByGameName: (gameName, page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_DATA_BY_GAME_NAME(gameName, page, limit)),

  steamSellSearchByName: (itemName) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_SEARCH_BY_NAME(itemName)),

  steamSellSearchByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_SEARCH_BY_TIME(startDate, endDate)),

  steamSellStatsByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.STEAM_SELL_STATS_BY_TIME(startDate, endDate)),

  

  // 类型和磨损等级搜索

  buyWeaponTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_WEAPON_TYPES),

  buyFloatRanges: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_FLOAT_RANGES),

  buyStatusList: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_STATUS_LIST),

  buyStatusSubList: (status) => getApiUrl(API_CONFIG.ENDPOINTS.BUY_STATUS_SUB_LIST(status)),

  buySearchByTypeWear: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_SEARCH_BY_TYPE_WEAR),

  buyStatsByTypeWear: () => getApiUrl(API_CONFIG.ENDPOINTS.BUY_STATS_BY_TYPE_WEAR),

  buyYyypPriceInfo: (steamHashName) => getApiUrl(API_CONFIG.ENDPOINTS.BUY_YYYP_PRICE_INFO(steamHashName)),



  sellWeaponTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_WEAPON_TYPES),

  sellFloatRanges: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_FLOAT_RANGES),

  sellStatusList: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_STATUS_LIST),

  sellStatusSubList: (status) => getApiUrl(API_CONFIG.ENDPOINTS.SELL_STATUS_SUB_LIST(status)),

  sellSearchByTypeWear: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_SEARCH_BY_TYPE_WEAR),

  sellStatsByTypeWear: () => getApiUrl(API_CONFIG.ENDPOINTS.SELL_STATS_BY_TYPE_WEAR),

  sellYyypPriceInfo: (steamHashName) => getApiUrl(API_CONFIG.ENDPOINTS.SELL_YYYP_PRICE_INFO(steamHashName)),



  lentWeaponTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_WEAPON_TYPES),

  lentFloatRanges: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_FLOAT_RANGES),

  lentStatusList: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_STATUS_LIST),

  lentStatusSubList: (status) => getApiUrl(API_CONFIG.ENDPOINTS.LENT_STATUS_SUB_LIST(status)),

  lentPlatformList: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_PLATFORM_LIST),

  lentLenterList: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_LENTER_LIST),

  lentSearchByTypeWear: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_SEARCH_BY_TYPE_WEAR),

  lentStatsByTypeWear: () => getApiUrl(API_CONFIG.ENDPOINTS.LENT_STATS_BY_TYPE_WEAR),

  
  // 借入数据（V2 API）
  rentalData: (min, max) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_DATA(min, max)),
  rentalStats: () => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_STATS),
  rentalDataByStatus: (status, min, max) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_DATA_BY_STATUS(status, min, max)),
  rentalDataByStatusSub: (statusSub, min, max) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_DATA_BY_STATUS_SUB(statusSub, min, max)),
  rentalSearchByName: (itemName) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_SEARCH_BY_NAME(itemName)),
  rentalSearchByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_SEARCH_BY_TIME(startDate, endDate)),
  rentalStatsByTime: (startDate, endDate) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_STATS_BY_TIME(startDate, endDate)),
  rentalWeaponTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_WEAPON_TYPES),
  rentalFloatRanges: () => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_FLOAT_RANGES),
  rentalStatusList: () => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_STATUS_LIST),
  rentalStatusSubList: (status) => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_STATUS_SUB_LIST(status)),
  rentalPlatformList: () => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_PLATFORM_LIST),
  rentalUserList: () => getApiUrl(API_CONFIG.ENDPOINTS.RENTAL_USER_LIST),

  

  // 武器搜索

  searchWeapon: (keyword) => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_WEAPON(keyword)),

  searchWeaponDetail: (keyword, exactMatch = false) => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_WEAPON_DETAIL(keyword, exactMatch)),

  searchWeaponByPriceRange: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_WEAPON_BY_PRICE_RANGE),

  weaponDetailBase: () => getApiUrl(API_CONFIG.ENDPOINTS.WEAPON_DETAIL_BASE),

  // 公共配置管理
  configGet: (key1, key2) => getApiUrl(API_CONFIG.ENDPOINTS.CONFIG_GET(key1, key2)),
  configSave: () => getApiUrl(API_CONFIG.ENDPOINTS.CONFIG_SAVE),
  configUpdate: () => getApiUrl(API_CONFIG.ENDPOINTS.CONFIG_UPDATE),
  configList: () => getApiUrl(API_CONFIG.ENDPOINTS.CONFIG_LIST),
  configDelete: (configId) => getApiUrl(API_CONFIG.ENDPOINTS.CONFIG_DELETE(configId)),

  weaponNames: () => getApiUrl(API_CONFIG.ENDPOINTS.WEAPON_NAMES),

  weaponReferencePrices: () => getApiUrl(API_CONFIG.ENDPOINTS.WEAPON_REFERENCE_PRICES),

  weaponCsqaqId: () => getApiUrl(API_CONFIG.ENDPOINTS.WEAPON_CSQAQ_ID),

  inventoryPendantPrice: () => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_PENDANT_PRICE),

  inventoryGetAllPendants: () => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_GET_ALL_PENDANTS),

  

  // 爬虫API

  // AES工具相关
  aesDecrypt: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.AES_DECRYPT),
  aesCheckLicense: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.AES_CHECK_LICENSE),
  aesHealth: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.AES_HEALTH),

  // 悠悠有品数据同步（V2 API）
  youpinSyncNewData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SYNC_NEW_DATA),
  youpinSyncHistoryData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SYNC_HISTORY_DATA),
  youpinSyncWeaponPrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SYNC_WEAPON_PRICE),
  youpinSyncWeaponTemplates: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SYNC_WEAPON_TEMPLATES),

  fetchWeaponIcons: () => getApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_FETCH_ICONS),
  downloadWeaponIcons: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_DOWNLOAD_ICONS),
  buffSyncNewData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_SYNC_NEW_DATA),
  buffSyncHistoryData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_SYNC_HISTORY_DATA),
  buffSyncNewMessages: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_SYNC_NEW_MESSAGES),
  buffSyncHistoryMessages: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_SYNC_HISTORY_MESSAGES),
  buffGetPrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_GET_PRICE),

  buffSyncTemplates: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_SYNC_TEMPLATES),
  buffGetCommodities: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_GET_COMMODITIES),
  buffCreateListing: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_CREATE_LISTING),
  buffPreviewListing: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_PREVIEW_LISTING),
  buffPreviewBuy: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_PREVIEW_BUY),
  buffBuyCommodity: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_BUY_COMMODITY),
  buffGetBalance: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_GET_BALANCE),
  buffPreviewBuyOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_PREVIEW_BUY_ORDER),
  buffCreateBuyOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.BUFF_CREATE_BUY_ORDER),

  steamSyncNewData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_SYNC_NEW_DATA),
  steamSyncHistoryData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_SYNC_HISTORY_DATA),
  steamGetInventory: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_GET_INVENTORY),
  steamCollectHashNames: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_COLLECT_HASH_NAMES),
  steamFetchHashNames: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_FETCH_HASH_NAMES),
  steamFetchHashNamesByWeapon: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_FETCH_HASH_NAMES_BY_WEAPON),
  steamMineInventory: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_MINE_INVENTORY),
  steamCancelMining: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_CANCEL_MINING),

  // 库存挖掘数据查询
  miningQuery: () => getApiUrl(API_CONFIG.ENDPOINTS.MINING_QUERY),
  miningStats: () => getApiUrl(API_CONFIG.ENDPOINTS.MINING_STATS),
  miningHistory: () => getApiUrl(API_CONFIG.ENDPOINTS.MINING_HISTORY),
  miningHistoryDelete: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.MINING_HISTORY_DELETE(steamId)),
  miningLatest: () => getApiUrl(API_CONFIG.ENDPOINTS.MINING_LATEST),

  csqaqMarketIndex: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_MARKET_INDEX),
  csqaqIndexData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_INDEX_DATA),
  csqaqChartData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_CHART_DATA),
  csqaqWeaponInfoChart: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_WEAPON_INFO_CHART),
  csqaqWeaponInfoKline: (goodId, period, platform) => {
      const base = getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_WEAPON_INFO_KLINE)
      if (goodId == null) return base
      const params = new URLSearchParams({ good_id: goodId })
      if (period != null && period !== '') params.set('period', period)
      if (platform != null && platform !== '') params.set('platform', platform)
      return base + '?' + params.toString()
    },
  csqaqWeaponInfoChipData: (goodId) => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_WEAPON_INFO_CHIP_DATA) + (goodId != null ? `?good_id=${encodeURIComponent(goodId)}` : ''),
  csqaqWeaponInfoGood: (id) => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_WEAPON_INFO_GOOD) + (id != null ? `?id=${encodeURIComponent(id)}` : ''),
  csqaqWeaponInfoStatistic: (id) => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_WEAPON_INFO_STATISTIC) + (id != null ? `?id=${encodeURIComponent(id)}` : ''),

  csqaqGetGoods: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_GET_GOODS),

  csqaqGetGoodsAsync: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_GET_GOODS_ASYNC),

  csqaqTaskStatus: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_TASK_STATUS),

  csqaqTaskResult: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_TASK_RESULT),

  csqaqExport: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_EXPORT),

  autoBuyRenamedWeapon: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.AUTO_BUY_RENAMED_WEAPON),

  

  // 悠悠有品实时查询API

  youpinRealtimeLowestPrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_REALTIME_LOWEST_PRICE),

  // 悠悠有品求购供应API

  youpinGetSupplyList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_GET_SUPPLY_LIST),

  youpinSubmitSupply: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SUBMIT_SUPPLY),

  youpinConfirmSupply: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_CONFIRM_SUPPLY),

  youpinSendOffer: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SEND_OFFER),

  youpinSellInventoryItem: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YOUPIN_SELL_INVENTORY_ITEM),

  // 悠悠有品在售商品购买API
  yyypCreateOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_CREATE_ORDER),
  yyypConfirmPayment: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_CONFIRM_PAYMENT),
  yyypCancelOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_CANCEL_ORDER),
  yyypItemSearchPublishWantedGetTemplateInfo: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_PUBLISH_WANTED_GET_TEMPLATE_INFO),
  yyypItemSearchPublishWantedPreCheck: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_PUBLISH_WANTED_PRE_CHECK),
  yyypItemSearchPublishWantedSaveOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_PUBLISH_WANTED_SAVE_ORDER),
  yyypItemSearchPublishWantedGetBalance: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_PUBLISH_WANTED_GET_BALANCE),
  yyypItemSearchPublishWantedQueryTransferInBalance: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_PUBLISH_WANTED_QUERY_TRANSFER_IN_BALANCE),
  yyypItemSearchPublishWantedConfirmTransferIn: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_ITEM_SEARCH_PUBLISH_WANTED_CONFIRM_TRANSFER_IN),



  // Steam登录API

  steamLogin: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_LOGIN),
  steamLoginVerify: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_LOGIN_VERIFY),
  steamLoginRefresh: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_LOGIN_REFRESH),
  steamLoginRefreshAuto: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_LOGIN_REFRESH_AUTO),
  steamLoginCaptcha: (captchaGid) => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_LOGIN_CAPTCHA(captchaGid)),
  steamLoginGenerateCode: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_LOGIN_GENERATE_CODE),
  steamQRGenerate: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_QR_GENERATE),
  steamQRPoll: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAM_QR_POLL),

  

  // GetAppToken API

  getAppTokenStartBuff: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_START_BUFF),

  getAppTokenStopBuff: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_STOP_BUFF),

  getAppTokenGetBuffData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_GET_BUFF_DATA),

  getAppTokenClearBuffData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_CLEAR_BUFF_DATA),

  getAppTokenStartYyyp: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_START_YYYP),

  getAppTokenStopYyyp: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_STOP_YYYP),

  getAppTokenGetYyypData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_GET_YYYP_DATA),

  getAppTokenClearYyypData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_CLEAR_YYYP_DATA),

  getAppTokenStartPerfectWorld: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_START_PERFECTWORLD),

  getAppTokenStopPerfectWorld: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_STOP_PERFECTWORLD),

  getAppTokenGetPerfectWorldData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_GET_PERFECTWORLD_DATA),

  getAppTokenClearPerfectWorldData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_CLEAR_PERFECTWORLD_DATA),

  getAppTokenStartCsfloat: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_START_CSFLOAT),

  getAppTokenStopCsfloat: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_STOP_CSFLOAT),

  getAppTokenGetCsfloatData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_GET_CSFLOAT_DATA),

  getAppTokenClearCsfloatData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_CLEAR_CSFLOAT_DATA),

  getAppTokenStartC5Game: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_START_C5GAME),

  getAppTokenStopC5Game: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_STOP_C5GAME),

  getAppTokenGetC5GameData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_GET_C5GAME_DATA),

  getAppTokenClearC5GameData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_CLEAR_C5GAME_DATA),

  getAppTokenStartIgxe: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_START_IGXE),

  getAppTokenStopIgxe: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_STOP_IGXE),

  getAppTokenGetIgxeData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_GET_IGXE_DATA),

  getAppTokenClearIgxeData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_CLEAR_IGXE_DATA),

  csfloatSyncNewData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSFLOAT_SYNC_NEW_DATA),

  csfloatSyncHistoryData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.CSFLOAT_SYNC_HISTORY_DATA),

  c5gameSyncNewData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.C5GAME_SYNC_NEW_DATA),

  c5gameSyncHistoryData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.C5GAME_SYNC_HISTORY_DATA),

  igxeSyncNewData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.IGXE_SYNC_NEW_DATA),

  igxeSyncHistoryData: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.IGXE_SYNC_HISTORY_DATA),

  pwGetInventoryComponent: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.PW_GET_INVENTORY_COMPONENT),

  pwDepositToComponent: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.PW_DEPOSIT_TO_COMPONENT),

  getAppTokenProxyStatus: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_PROXY_STATUS),

  getAppTokenHelp: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.GET_APP_TOKEN_HELP),

  

  // ADB工具API

  adbScan: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_SCAN),

  adbConnect: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_CONNECT),

  adbDisconnect: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_DISCONNECT),

  adbDevices: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_DEVICES),

  adbDeviceInfo: (serial) => getApiUrl(API_CONFIG.ENDPOINTS.ADB_DEVICE_INFO(serial)),

  adbCertStatus: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_CERT_STATUS),

  adbCertInstall: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_CERT_INSTALL),

  adbCertUninstall: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_CERT_UNINSTALL),

  adbCertInfo: () => getApiUrl(API_CONFIG.ENDPOINTS.ADB_CERT_INFO),

  adbShell: (serial) => getApiUrl(API_CONFIG.ENDPOINTS.ADB_SHELL(serial)),

  

  // 登录设置API

  loginSettings: () => getApiUrl(API_CONFIG.ENDPOINTS.LOGIN_SETTINGS),
  loginSettingsSave: () => getApiUrl(API_CONFIG.ENDPOINTS.LOGIN_SETTINGS_SAVE),
  loginVerify: () => getApiUrl(API_CONFIG.ENDPOINTS.LOGIN_VERIFY),

  // DatabaseManager V2 API
  dbManagerTables: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLES),
  dbManagerTableData: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_DATA(t)),
  dbManagerTableStructure: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_STRUCTURE(t)),
  dbManagerTableAddRow: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_ADD_ROW(t)),
  dbManagerTableUpdateRow: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_UPDATE_ROW(t)),
  dbManagerTableDeleteRow: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_DELETE_ROW(t)),
  dbManagerTableDeleteBatch: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_DELETE_BATCH(t)),
  dbManagerTableExport: (t) => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TABLE_EXPORT(t)),
  dbManagerExecuteQuery: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_EXECUTE_QUERY),
  dbManagerExecuteFile: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_EXECUTE_FILE),
  dbManagerSavedQueries: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_SAVED_QUERIES),
  dbManagerSaveQuery: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_SAVE_QUERY),
  dbManagerStats: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_STATS),
  dbManagerInfo: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_INFO),
  dbManagerBackup: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_BACKUP),
  dbManagerDownload: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_DOWNLOAD),
  dbManagerRestore: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_RESTORE),
  dbManagerOptimize: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_OPTIMIZE),
  dbManagerVacuum: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_VACUUM),
  dbManagerTruncate: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TRUNCATE),
  dbManagerDrop: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_DROP),
  dbManagerGetDbConfig: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_GET_DB_CONFIG),
  dbManagerSaveDbConfig: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_SAVE_DB_CONFIG),
  dbManagerTestMysql: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_TEST_MYSQL),
  dbManagerMigrateToMysql: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_MIGRATE_TO_MYSQL),
  dbManagerMigrateToSqlite: () => getApiUrl(API_CONFIG.ENDPOINTS.DB_MANAGER_MIGRATE_TO_SQLITE),

  

  // CSQAQ API

  csqaqUploadMapping: () => getApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_UPLOAD_MAPPING),
  csqaqFetchPriceHistory: () => getApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_FETCH_PRICE_HISTORY),
  csqaqStopFetchPriceHistory: () => getApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_STOP_FETCH_PRICE_HISTORY),
  csqaqDataSourceUploadMapping: () => getApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_DATA_SOURCE_UPLOAD_MAPPING),
  csqaqDataSourceConfig: () => getApiUrl(API_CONFIG.ENDPOINTS.CSQAQ_DATA_SOURCE_CONFIG),

  // SteamDT 数据源配置
  steamdtDataSourceConfig: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAMDT_DATA_SOURCE_CONFIG),

  // 饰品搜索 API（V2）
  itemSearchSearch: () => getApiUrl(API_CONFIG.ENDPOINTS.ITEM_SEARCH_SEARCH),
  itemSearchWeaponNames: () => getApiUrl(API_CONFIG.ENDPOINTS.ITEM_SEARCH_WEAPON_NAMES),
  itemSearchCsqaqDetail: () => getApiUrl(API_CONFIG.ENDPOINTS.ITEM_SEARCH_CSQAQ_DETAIL),
  itemSearchBatchStickerPrices: () => getApiUrl(API_CONFIG.ENDPOINTS.ITEM_SEARCH_BATCH_STICKER_PRICES),

  // DevTools 筛选数据（V2 API）
  devToolsSteamAccounts: () => getApiUrl(API_CONFIG.ENDPOINTS.DEV_TOOLS_V2_STEAM_ACCOUNTS),
  devToolsConfigAccounts: (key1) => getApiUrl(API_CONFIG.ENDPOINTS.DEV_TOOLS_V2_GET_CONFIG_ACCOUNTS) + (key1 ? `?key1=${encodeURIComponent(key1)}&key2=config` : ''),



  // 图片API

  weaponImage: (imageName) => getApiUrl(API_CONFIG.ENDPOINTS.WEAPON_IMAGE(imageName)),

  weaponImageCheck: (imageName) => getApiUrl(API_CONFIG.ENDPOINTS.WEAPON_IMAGE_CHECK(imageName)),

  

  // Home页面图表数据API（V2）

  homeInventoryAll: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_INVENTORY_ALL),

  homeComponentsAll: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_COMPONENTS_ALL),

  homeBuyAll: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_BUY_ALL),

  homeSellAll: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_SELL_ALL),

  // Home页面独立API（V2）

  homeBuyStats: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_BUY_STATS),

  homeSteamIds: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_STEAM_IDS),

  homeInventoryBySteamId: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.HOME_INVENTORY_BY_STEAM_ID(steamId)),

  homeComponentsBySteamId: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.HOME_COMPONENTS_BY_STEAM_ID(steamId)),

  homeSteamdtHomepageData: () => getApiUrl(API_CONFIG.ENDPOINTS.HOME_STEAMDT_HOMEPAGE_DATA),

  

  // 正在出售API

  getYYYPAccounts: () => getApiUrl(API_CONFIG.ENDPOINTS.ON_SALE_YYYP_ACCOUNTS),

  getBuffAccounts: () => getApiUrl(API_CONFIG.ENDPOINTS.ON_SALE_BUFF_ACCOUNTS),

  getOnSaleItems: () => getApiUrl(API_CONFIG.ENDPOINTS.ON_SALE_ITEMS),

  removeFromSale: () => getApiUrl(API_CONFIG.ENDPOINTS.ON_SALE_REMOVE),
  updateSalePrice: () => getApiUrl(API_CONFIG.ENDPOINTS.ON_SALE_UPDATE_PRICE),



  // 库存API（V2）

  inventorySteamIds: () => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_STEAM_IDS),

  inventoryData: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_DATA(steamId)),

  inventoryGrouped: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_GROUPED(steamId)),

  inventoryStats: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_STATS(steamId)),

  inventoryUpdateBuyPrice: (steamId, assetid) => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_UPDATE_BUY_PRICE(steamId, assetid)),

  inventoryYyypLowestPrice: () => getApiUrl(API_CONFIG.ENDPOINTS.INVENTORY_YYYP_LOWEST_PRICE),

  // 库存组件API（V2）
  stockComponentsSteamIds: () => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_STEAM_IDS),
  stockComponentsCount: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_COUNT(steamId)),
  stockComponentsWeaponTypes: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_WEAPON_TYPES(steamId)),
  stockComponentsFloatRanges: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_FLOAT_RANGES(steamId)),
  stockComponentsInventory: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_INVENTORY(steamId)),
  stockComponentsData: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_DATA(steamId)),
  stockComponentsGrouped: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_GROUPED(steamId)),
  stockComponentsStats: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_STATS(steamId)),
  stockComponentsUpdateBuyPrice: (steamId, goodsAssetId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_UPDATE_BUY_PRICE(steamId, goodsAssetId)),
  stockComponentsAutoFillPrices: (steamId) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_AUTO_FILL_PRICES(steamId)),
  stockComponentsFillReferencePrice: (steamId, source) => getApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_FILL_REFERENCE_PRICE(steamId, source)),
  stockComponentsUpdatePricesFromCsqaq: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STOCK_COMPONENTS_UPDATE_PRICES_FROM_CSQAQ),

  // 悠悠有品租赁API

  yyypGetLeaseList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_LEASE_LIST),
  yyypGetSubleaseList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_SUBLEASE_LIST),
  yyypGetPresaleList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PRESALE_LIST),
  yyypGetTransferList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_TRANSFER_LIST),
  yyypCancelTransfer: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CANCEL_TRANSFER),
  yyypPresaleOffShelfInit: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PRESALE_OFF_SHELF_INIT),
  yyypPresaleOffShelf: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PRESALE_OFF_SHELF),
  yyypPresaleChangePricePreCheck: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PRESALE_CHANGE_PRICE_PRE_CHECK),
  yyypGetSellList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_SELL_LIST),
  getRentedOutList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_RENTED_OUT_LIST),
  yyypGetMySellOrders: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_MY_SELL_ORDERS),  // 获取我的出售订单
  yyypGetMyBuyOrders: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_MY_BUY_ORDERS),  // 获取我的收货订单
  yyypProcessOfferButton: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PROCESS_OFFER_BUTTON),  // 处理报价按钮操作
  yyypGetPurchaseOrders: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PURCHASE_ORDERS),  // 获取求购订单（求购中/暂停中）
  yyypGetPendingPaymentOrders: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PENDING_PAYMENT_ORDERS),  // 获取待支付订单
  yyypPausePurchaseOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PAUSE_PURCHASE_ORDER),  // 暂停求购订单
  yyypOpenPurchaseOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_OPEN_PURCHASE_ORDER),  // 开启暂停中的求购订单
  yyypDeletePurchaseOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_DELETE_PURCHASE_ORDER),  // 删除求购订单
  yyypGetOrderInfo: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_ORDER_INFO),  // 获取订单详情
  yyypPreUpdateCheck: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PRE_UPDATE_CHECK),  // 修改前置检查
  yyypEditPurchaseOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_EDIT_PURCHASE_ORDER),  // 修改求购订单
  yyypQuickPriceIncrease: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_QUICK_PRICE_INCREASE),  // 一键加价预检查
  yyypConfirmPriceIncrease: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CONFIRM_PRICE_INCREASE),  // 确认一键加价
  yyypGetPurchaseRecords: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PURCHASE_RECORDS),  // 获取求购记录
  yyypSearchPurchaseTemplate: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_SEARCH_PURCHASE_TEMPLATE),  // 搜索求购饰品模板
  yyypGetTemplatePurchaseInfo: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_TEMPLATE_PURCHASE_INFO),  // 获取求购发布详情
  yyypPrePurchaseOrderCheck: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_PRE_PURCHASE_ORDER_CHECK),  // 求购预检查
  yyypSavePurchaseOrder: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_SAVE_PURCHASE_ORDER),  // 提交求购订单
  yyypGetPurchaseBalance: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PURCHASE_BALANCE),  // 获取求购余额
  yyypQueryTransferInBalance: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_QUERY_TRANSFER_IN_BALANCE),  // 查询钱包可转入余额
  yyypConfirmTransferIn: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CONFIRM_TRANSFER_IN),  // 确认从钱包转入
  yyypConfirmTransferOut: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CONFIRM_TRANSFER_OUT),  // 确认转出到钱包
  yyypOffShelf: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_OFF_SHELF),
  yyypCancelSublease: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CANCEL_SUBLEASE),
  yyypChangePrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CHANGE_PRICE),  // 售卖商品改价
  yyypBatchChangePrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_BATCH_CHANGE_PRICE),  // 售卖商品批量改价
  yyypChangeRentPrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CHANGE_RENT_PRICE),  // 租赁/转租改价（支持单个和批量）
  yyypGetInstantPaymentList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_INSTANT_PAYMENT_LIST),  // 获取0CD订单列表
  yyypRetrieveRecord: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_RETRIEVE_RECORD),  // 秒到账提取资金
  yyypGetItemStarList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_ITEM_STAR_LIST),  // 获取皮肤关注列表
  yyypCancelItemStar: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CANCEL_ITEM_STAR),  // 取消皮肤关注
  yyypGetGoodsStarList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_GOODS_STAR_LIST),  // 获取单件关注列表
  yyypCancelGoodsStar: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CANCEL_GOODS_STAR),  // 取消单件关注
  yyypGetSubleaseAgreement: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_SUBLEASE_AGREEMENT),  // 获取转租协议
  yyypGetSubleaseDetail: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_SUBLEASE_DETAIL),  // 获取转租详情
  yyypRentInit: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_RENT_INIT),  // 获取出租初始化配置
  yyypGetCompensationText: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_COMPENSATION_TEXT),  // 获取赔付文本信息
  yyypGetPresaleDetail: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PRESALE_DETAIL),  // 获取预售详情
  yyypBuyPresaleCommodity: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_BUY_PRESALE_COMMODITY),  // 购买预售商品
  yyypRentAutoPricing: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_RENT_AUTO_PRICING),

  // 悠悠有品消息盒子API（新API V2）
  yyypGetNewMessages: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_NEW_MESSAGES),  // 获取新消息（增量采集）
  yyypGetAllMessages: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_ALL_MESSAGES),  // 获取所有消息（全量采集）
  yyypMarkMessageRead: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_MARK_MESSAGE_READ),  // 标记消息为已读
  yyypDeleteMessage: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_DELETE_MESSAGE),  // 删除消息

  // 悠悠有品预售API（新API V2）
  yyypGetPresaleList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_PRESALE_LIST),  // 获取预售列表

  // 悠悠有品过户API（新API V2）
  yyypGetTransferList: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_GET_TRANSFER_LIST),  // 获取过户列表

  // 悠悠有品转租API（新API V2）
  yyypChangeSubleasePrice: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_CHANGE_SUBLEASE_PRICE),  // 修改转租价格（0CD改价）
  yyypSubleaseAutoPricing: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_SUBLEASE_AUTO_PRICING),  // 转租商品自动定价
  yyypSubleaseGetCompensationText: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_SUBLEASE_GET_COMPENSATION_TEXT),  // 获取转租赔付文本信息
  yyypSubleaseGetBatchCompensationText: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.YYYP_SUBLEASE_GET_BATCH_COMPENSATION_TEXT),  // 批量获取转租赔付文本信息

  // SteamDT API
  steamdtMarketIndex: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAMDT_MARKET_INDEX),
  steamdtMarketIndexHeadless: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAMDT_MARKET_INDEX_HEADLESS),
  steamdtKline: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.STEAMDT_KLINE),
  steamdtHomepageData: () => getApiUrl(API_CONFIG.ENDPOINTS.STEAMDT_HOMEPAGE_DATA),



  // 版本更新API

  checkUpdate: () => getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_CHECK),  // 检查更新

  getCurrentVersion: () => getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_CURRENT_VERSION),  // 获取当前版本

  downloadUpdate: () => getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_DOWNLOAD),  // 下载更新包

  checkLocalUpdate: () => getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_CHECK_LOCAL),  // 检查本地更新包

  applyUpdate: () => getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_APPLY),  // 执行更新

  restartSystem: () => getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_RESTART),  // 重启系统

  backendHealth: () => getApiUrl(API_CONFIG.ENDPOINTS.BACKEND_HEALTH),  // Backend 健康检查
  spiderHealth: () => getSpiderApiUrl(API_CONFIG.ENDPOINTS.SPIDER_HEALTH),  // Spider 健康检查

  versionDocumentsTree: () => getApiUrl(API_CONFIG.ENDPOINTS.VERSION_DOCUMENTS_TREE),

  versionDocumentsFile: () => getApiUrl(API_CONFIG.ENDPOINTS.VERSION_DOCUMENTS_FILE),

  // 系统消息API
  sysMessageList: (page, limit) => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_LIST(page, limit)),
  sysMessageStats: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_STATS),
  sysMessageTypes: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_TYPES),
  sysMessageSources: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_SOURCES),
  sysMessageMarkRead: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_MARK_READ),
  sysMessageMarkAllRead: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_MARK_ALL_READ),
  sysMessageDelete: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_DELETE),
  sysMessageSearchKeyword: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_SEARCH_KEYWORD),
  sysMessageSearchTime: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_SEARCH_TIME),
  sysMessageSearchFilter: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_SEARCH_FILTER),
  sysMessageCreate: () => getApiUrl(API_CONFIG.ENDPOINTS.SYS_MESSAGE_CREATE),

  // 改名饰品搜索结果 API（SearchWeaponRename 页面）
  searchRenameItemAdd: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEM_ADD),
  searchRenameItemGet: (id) => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEM_GET(id)),
  searchRenameItemUpdateStatus: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEM_UPDATE_STATUS),
  searchRenameItemsBatch: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEMS_BATCH),
  searchRenameItemsList: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEMS_LIST),
  searchRenameItemsCount: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEMS_COUNT),
  searchRenameItemsLatest: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEMS_LATEST),
  searchRenameItemsClear: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEMS_CLEAR),
  searchRenameItemsCleanup: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_ITEMS_CLEANUP),
  searchRenameStats: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_RENAME_STATS),

  // 挂件搜索结果 API（SearchPendant 页面）
  searchPendantConfigSave: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_PENDANT_CONFIG_SAVE),
  searchPendantItemAdd: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_PENDANT_ITEM_ADD),
  searchPendantItemsList: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_PENDANT_ITEMS_LIST),
  searchPendantItemUpdateStatus: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_PENDANT_ITEM_UPDATE_STATUS),
  searchPendantItemsClear: () => getApiUrl(API_CONFIG.ENDPOINTS.SEARCH_PENDANT_ITEMS_CLEAR),

  // 盈亏统计 API
  pnlCalendar: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_CALENDAR),
  pnlInventoryCalendar: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_INVENTORY_CALENDAR),
  pnlRecordInvSnapshot: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_RECORD_INV_SNAPSHOT),
  pnlOverallStats: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_OVERALL_STATS),
  pnlDailyDetail: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_DAILY_DETAIL),
  pnlOrphanSells: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_ORPHAN_SELLS),
  pnlCandidateBuys: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_CANDIDATE_BUYS),
  pnlDataUserList: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_DATA_USER_LIST),
  pnlMonthRange: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_MONTH_RANGE),
  pnlRunAutoPairing: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_RUN_AUTO_PAIRING),
  pnlManualPair: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_MANUAL_PAIR),
  pnlUnpair: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_UNPAIR),
  pnlSetExcluded: () => getApiUrl(API_CONFIG.ENDPOINTS.PNL_SET_EXCLUDED),

}

