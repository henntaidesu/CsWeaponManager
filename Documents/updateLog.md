# 更新日志 已更新Ver2.x  Ver1.x.x 大部分数据将不通用

## 📋 目录

<!-- - [2025-12-9](#2025-12-9)
  - [v2.0.2](#v202)
- [2025-12-08](#2025-12-08)
  - [V2.0.1](#v201)
  - [v2.0.0 发布](#v200-发布)
- [2025-12-03](#2025-12-03)
  - [v1.2.11](#v1211)
- [2025-12-02](#2025-12-02)
  - [v1.2.10](#v1210)
 -->

---
## 2026-05-30
### v2.7.0
- 添加盈亏统计页面

## 2026-04-28
### v2.6.2
- 添加C5 数据更新逻辑
- 优化自动化页面排布、逻辑

## 2026-04-27
### v2.6.1
- 添加c5 购买 出售基础数据的获取

## 2026-04-14
### v2.6.0
- 修复完美世界token获取错误
- 添加数据源首次获取数据量限制功能
- 添加CSQAQ IP地址变动后自动更新绑定IP地址功能
- 添加重启系统功能

## 2026-03-12
### v2.5.4
- 完成CSQAQ数据集成

## 2026-03-10
### v2.5.3
- 库存组件页面 添加平台价格从CSQAQ中获取
- 饰品搜素页面 集成CSQAQ相关数据
- 屏蔽 第三方数据页面

## 2026-03-07
### v2.5.2
- 修复库存页面 一些BUG
- 修复报价模块 报价处理问题
- 完善悠悠有品饰品搜素功能
- 修复悠悠有品id更新逻辑
- 优化开荒工具


## 2026-03-06
### v2.5.1
- 修复悠悠在售点击购买后无法显示余额
- 修复悠悠求购发送报价失败
- 完成悠悠 秒到账提取功能
- 添加饰品关注列表
- 修复在售饰品下架
- 完成悠悠有品饰品查询中发送求购
- 修复系统更新页面 下载进度条显示 优化更新流程

## 2026-03-05
### v2.5.0
- 重构完成全部的backEND v2 API 
- 减少打包文件体积
- 修复多个API
- 修复查询列表查询后会自动下单的BUG
- 优化自动化管理器

## 2026-02-22
### v2.4.2
- 修复系统更新后 启动错误问题

## 2026-02-21
### v2.4.1
- 添加悠悠有品求购的相关方法
- 修复库存组件组合物品
- 优化库存页面
- 新增系统更新功能

## 2026-02-19
### v2.4.0
- 修复更新日志页面
- 优化主导航
- 优化主页内容 
- 重构悠悠有品模块

## 2026-02-10
### v2.3.6
- 优化库存页面预览弹窗，移除冗余操作按钮（悠悠出售、悠悠出租、BUFF出售、BUFF出租、移入组件）
- 优化预览弹窗交互，点击图片即可跳转商品搜索页面，无需额外按钮
- 新增预览弹窗入库时间显示功能，完善物品详细信息展示
- 新增印花和挂件价格信息显示，支持悠悠有品和BUFF平台价格及在售数量展示
- 优化印花和挂件跳转逻辑，直接使用steam_hash_name字段进行商品搜索
- 修改库存页面默认模式为详情模式，提升用户浏览体验
- 完成悠悠 BUFF 租入数据更新方法
- 完成悠悠有品 求购供应 、预售购买方法
- 修复BUFF buy列表无法获取印花 挂件的steam_hash_name 历史数据需要执行下面的sql语句后重新获取。
```sql
delete FROM "buy" WHERE "from" = 'buff'
```
- 取消表 buff_buy buff_sell

## 2026-02-08
### v2.3.5
- 优化数据源设置，完善各平台表单组件的清理操作支持（BUFF、CSFloat、完美世界、悠悠有品）
- 新增查询进度显示功能，支持进度持久化至localStorage，优化爬取状态管理
- 优化商品筛选功能，添加筛选类型状态管理，优化商品列表展示和按钮交互逻辑
- 增加BUFF价格和在售数量的显示，优化样式以防止布局偏移
- 优化请求处理，添加请求取消检查机制，移除冗余日志输出，提升整体性能

## 2026-02-02
### v2.3.4
- 解耦全部VUE文件
- 新增悠悠有品的相关APP功
- 添加ipad支持

## 2026-01-29
### v2.3.3
- 调整页面布局
- 添加悠悠有品的相关功能 (出租 上架等)
- 修复steam市场数据的获取

## 2026-01-20
### v2.3.2
- 修复float数据获取逻辑
- 修复了一些已知BUG

## 2026-01-17
### V2.3.1
- 完善库存组件查询 以及逻辑
- 修改 搜素页面布局
- 修改 /inventory 对于没有磨损的饰品的购入价格匹配逻辑
- 修改 /stock-components 优先通过assid进行匹配 而不是buy表
- **修改 /inventory 页面筛选后卡片统计数据随之变化**
  - 修改了 `get_inventory_stats` 函数，支持筛选参数（search、weapon_type、float_range、classid）
  - 修改了前端 `Inventory.vue`，在筛选条件变化时传递参数到统计接口
  - 卡片数据（总库存数量、购入总价值、悠悠有品最低价、BUFF最低价、Steam参考价）会根据筛选条件实时更新
- **修改 /stock-components 页面筛选后卡片统计数据随之变化**
  - 修改了 `get_components_stats` 函数，支持筛选参数（search、weapon_type、assetid）
  - 修改了前端 `StockComponents.vue`，在筛选条件变化时传递参数到统计接口并重新加载统计数据
  - 卡片数据（总组件数量、购入总价值、悠悠有品最低价、BUFF最低价、Steam参考价）会根据筛选条件实时更新

## 2026-01-13
### v2.3.0
- 添加库存组件操作功能 依赖完美世界token

## 2026-01-12
### v2.2.4
1. 添加悠悠有品的上架出售功能 
2. 添加 在售物品 页面

## 2026-01-10
### v2.2.3
1. 添加库存卡片页面多选功能
   - 新增多选模式按钮，支持批量选择物品
   - 多选模式下卡片左上角显示复选框
   - 选中物品后底部显示浮动操作栏
   - 支持批量出售和出租操作
   - 出售/出租弹窗显示选中物品列表
   - 价格输入框支持自动格式化，限制最多两位小数
   - 备注输入框支持最多200字符
   - 完整的表单验证和错误提示

### v2.2.2
1. 修改主页的统计口径 只返回已完成的数据

## 2026-01-09
### v2.2.1
1. 修复CSFLOAT的数据更新逻辑
2. 添加主页的库存分析

## 2026-01-07
### v2.2.0
1. 添加悠悠有品 租赁饰品被买断同步到sell表逻辑
2. 修复数据挖掘-爬取挂件中无法从数据库获取挂件价格
3. 更新页面图标
4. 添加悠悠有品 BUFF 借贷列表的数据获取
5. 添加 借贷列表页面



## 2025-12-15
### v2.1.2
1. 修复index.html无限下拉问题
2. 添加steam库存挖掘功能
3. 修复悠悠有品的出租状态更新BUG

## 2025-12-13
### v2.1.1
1. 修改使用building后的web页面 不再需要node.js的依赖
   这次更新不能覆盖安装需要将
   文件夹 weapon_imgs 
   数据库 csweaponmanager.db
   复制到新的文件夹后 使用 start_all.bat 启动即可

## 2025-12-10
### v2.1.0
1. 融合自动获取购入价格按钮 当获取到价格的时候 会自动从数据库中获取
2. 添加CSQAQ SteamDT 支持
3. 升级至vue3

## 2025-12-9
### v2.0.2
1. 优化库存组件 steam库存的显示 添加列表视图 组合列表视图
2. 页面添加更新日志显 添加使用文档
3. 修复GET TOKEN 的获取BUG清除缓存

4. 融合库存组件平台价格获取按钮

## 2025-12-08
### V2.0.1
1. 库存组件添加组合显示
2. 修复胶囊 武器箱等冗余显示
3. 修改lent 状态下拉BUG 优化页面加载
4. 添加 库存组件 steam库存 组合显示逻辑

## 2025-12-08
### v2.0.0 发布
#### 已更新Ver2.x Ver1.x.x 大部分数据将不通用
1. 从1.0更新到2.0版本 需要先执行下面sql
```sql
ALTER TABLE steam_stockComponents RENAME COLUMN instanceid TO goods_assetid;
DELETE FROM steam_stockComponents;
```

2. 如果需要重新获取历史数据 以便显示印花 改名 挂件的信息的 需要删除数据后重新获取数据
```sql
DELETE FROM "main"."sell" WHERE "from" = 'SMK';
DELETE FROM "main"."buy" WHERE "from" = 'SMK';
DELETE FROM steam_market;
DELETE FROM yyyp_messagebox;
DELETE FROM steam_inventoryhistory_index;
DELETE FROM steam_inventoryhistory;
DELETE FROM weapon_classID;
DELETE FROM "main"."sell" WHERE "from" = 'buff';
DELETE FROM "main"."buy" WHERE "from" = 'buff';
DELETE FROM buff_sell;
DELETE FROM buff_buy;
DELETE FROM "main"."sell" WHERE "from" = 'csfloat';
DELETE FROM "main"."buy" WHERE "from" = 'csfloat';
DELETE FROM csfloat_sell;
DELETE FROM csfloat_buy;
DELETE FROM "main"."sell" WHERE "from" = 'yyyp';
DELETE FROM "main"."buy" WHERE "from" = 'yyyp';
DELETE FROM yyyp_sell;
DELETE FROM yyyp_buy;
```
## 2025-12-03

### v1.2.11

## 2025-12-02
1. 添加steam cookie自动刷新 需要在自动化管理中开启
2. 更新了出租列表的图片显示

```sql
DELETE FROM yyyp_lent;
```
### v1.2.10

1、添加库存组件 图片 印花等获取

```sql
ALTER TABLE steam_stockComponents RENAME COLUMN instanceid TO goods_assetid;
DELETE FROM steam_stockComponents;
```

## 2025-12-01

### v1.2.9

1. 添加 Steam 市场、Steam 交易历史的 `steam_hash_name` 获取
2. 添加 Steam 库存交易的详细信息获取
3. 添加 Steam 库存组件的详细信息获取
4、添加 在steam中获取hashname

**数据库清理语句：**

```sql
DELETE FROM "main"."sell" WHERE "from" = 'SMK';
DELETE FROM "main"."buy" WHERE "from" = 'SMK';
DELETE FROM steam_market;
DELETE FROM yyyp_messagebox;
DELETE FROM steam_inventoryhistory_index;
DELETE FROM steam_inventoryhistory;
DELETE FROM weapon_classID;
```

---

## 2025-11-30

### v1.2.8

1. 添加 sell、buy 列表的贴纸、挂件、改名的显示
2. 完成 CSFloat 饰品、印花、挂件获取

**数据库清理语句：**

```sql
DELETE FROM "main"."sell" WHERE "from" = 'buff';
DELETE FROM "main"."buy" WHERE "from" = 'buff';
DELETE FROM buff_sell;
DELETE FROM buff_buy;
DELETE FROM "main"."sell" WHERE "from" = 'csfloat';
DELETE FROM "main"."buy" WHERE "from" = 'csfloat';
DELETE FROM csfloat_sell;
DELETE FROM csfloat_buy;
```

---

## 2025-11-29

### v1.2.7

1. 表 `buy`、`sell`、`steam_stockComponents`、`steam_inventory`、`steam_buy`、`steam_sell` 新增字段 `steam_hash_name`
2. Steam 库存表添加详细信息的获取
3. 修改 Steam 库存、sell、buy 页面的显示样式
4. 修改 yyyp 获取商品详情时，添加获取贴纸信息、挂件信息
5. 更新执行语句

**数据库清理语句：**

```sql
DELETE FROM "main"."sell" WHERE "from" = 'yyyp';
DELETE FROM "main"."buy" WHERE "from" = 'yyyp';
DELETE FROM yyyp_sell;
DELETE FROM yyyp_buy;
```

---

## 2025-11-28

### v1.2.6

1. auto-manager 自动化管理页面添加"启动全部"、"停止全部"按钮
2. 修改 CSFloat 的订单查询状态限制
3. 添加使用 yyyp 的 URL 进行 ICON 的下载，脱离在线图片库的依赖

---

## 2025-11-27

### v1.2.5

- 爬取改名中的 Steam 市场类型添加搜索参数
