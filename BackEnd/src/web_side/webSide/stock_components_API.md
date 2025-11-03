# Stock Components API 文档

## 基础信息
- **Base URL**: `http://localhost:9001/webStockComponentsV1`
- **组件ClassID**: `3604678661`

## API 列表

### 1. 获取库存组件列表
**接口**: `GET /components/<steam_id>`

**描述**: 获取指定Steam用户的库存组件列表

**路径参数**:
- `steam_id`: Steam用户ID

**Query参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| search | string | 否 | 搜索关键词 |
| status | string | 否 | 状态筛选 |
| component_types[] | array | 否 | 组件类型筛选（多选） |
| quality[] | array | 否 | 品质筛选（多选） |
| page | int | 否 | 页码，默认1 |
| page_size | int | 否 | 每页数量，默认20 |

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "component_id": "123456789",
      "assetid": "123456789",
      "instanceid": "0",
      "classid": "3604678661",
      "component_name": "库存存储组件",
      "item_name": "库存存储组件",
      "weapon_name": "",
      "component_type": "其他",
      "weapon_type": "未知物品",
      "weapon_float": null,
      "float_range": "",
      "quality": "普通级",
      "quantity": 1,
      "unit_cost": 14.0,
      "total_cost": 14.0,
      "source": "库存",
      "purchase_date": "2024-10-09 12:00:00",
      "status": "库存中",
      "status_desc": null,
      "buy_price": "14.0",
      "yyyp_price": null,
      "buff_price": null,
      "steam_price": null
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### 2. 获取库存组件统计
**接口**: `GET /components/stats/<steam_id>`

**描述**: 获取指定Steam用户的库存组件统计信息

**路径参数**:
- `steam_id`: Steam用户ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalCount": 10,
    "totalCost": 140.0,
    "avgCost": 14.0,
    "inStockCount": 10,
    "usedCount": 0,
    "soldCount": 0
  }
}
```

---

### 3. 按时间范围搜索组件
**接口**: `GET /components/time-range/<steam_id>/<start_date>/<end_date>`

**描述**: 按时间范围搜索库存组件

**路径参数**:
- `steam_id`: Steam用户ID
- `start_date`: 开始日期，格式：YYYY-MM-DD
- `end_date`: 结束日期，格式：YYYY-MM-DD

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "component_id": "123456789",
      "assetid": "123456789",
      "component_name": "库存存储组件",
      "item_name": "库存存储组件",
      "component_type": "其他",
      "quality": "普通级",
      "quantity": 1,
      "unit_cost": 14.0,
      "total_cost": 14.0,
      "source": "库存",
      "purchase_date": "2024-10-09 12:00:00",
      "status": "库存中",
      "status_desc": null
    }
  ],
  "total": 1
}
```

---

### 4. 使用组件
**接口**: `POST /components/use/<component_id>`

**描述**: 标记组件为已使用

**路径参数**:
- `component_id`: 组件ID（assetid）

**响应示例**:
```json
{
  "success": true,
  "message": "组件 123456789 使用成功"
}
```

**状态**: 🚧 待实现

---

### 5. 出售组件
**接口**: `POST /components/sell/<component_id>`

**描述**: 标记组件为已出售

**路径参数**:
- `component_id`: 组件ID（assetid）

**响应示例**:
```json
{
  "success": true,
  "message": "组件 123456789 出售成功"
}
```

**状态**: 🚧 待实现

---

### 6. 获取组件详情
**接口**: `GET /components/detail/<component_id>`

**描述**: 获取组件的详细信息

**路径参数**:
- `component_id`: 组件ID（assetid）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "component_id": "123456789",
    "assetid": "123456789",
    "instanceid": "0",
    "classid": "3604678661",
    "component_name": "库存存储组件",
    "item_name": "库存存储组件",
    "weapon_name": "",
    "component_type": "其他",
    "weapon_type": "未知物品",
    "weapon_float": null,
    "float_range": "",
    "quality": "普通级",
    "quantity": 1,
    "unit_cost": 14.0,
    "total_cost": 14.0,
    "source": "库存",
    "purchase_date": "2024-10-09 12:00:00",
    "status": "库存中",
    "status_desc": null,
    "buy_price": "14.0",
    "yyyp_price": null,
    "buff_price": null,
    "steam_price": null,
    "data_user": "76561198XXXXXXXXX"
  }
}
```

---

## 工具函数

### parse_component_type(item_name)
从物品名称解析组件类型

**支持的类型**:
- 印花
- 贴纸
- 涂鸦
- 探员
- 音乐盒
- 徽章
- 补丁
- 其他（默认）

### parse_quality(item_name)
从物品名称解析品质等级

**支持的品质**:
- 违禁：包含 `StatTrak™` 或 `★`
- 奇异：包含 `纪念品`
- 非凡：包含 `(Holo)`
- 超凡：包含 `(Foil)` 或 `(Gold)`
- 高级：包含 `高级`
- 卓越：包含 `卓越`
- 普通级（默认）

---

## 数据库表结构

使用表：`steam_inventory`

**主要字段**:
- `assetid`: 资产ID（主键）
- `instanceid`: 实例ID
- `classid`: 类别ID（组件固定为 `3604678661`）
- `item_name`: 物品名称
- `weapon_name`: 武器名称
- `weapon_type`: 武器类型
- `weapon_float`: 磨损值
- `float_range`: 磨损等级
- `remark`: 备注
- `data_user`: 用户Steam ID
- `buy_price`: 购入价格
- `yyyp_price`: 悠悠有品价格
- `buff_price`: BUFF价格
- `steam_price`: Steam价格
- `order_time`: 入库时间
- `if_inventory`: 是否在库存中（'1'表示在库存）

---

## 错误处理

所有接口在出错时返回统一格式：
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

HTTP 状态码：
- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 注意事项

1. 所有组件必须满足 `classid = '3604678661'` 且 `if_inventory = '1'`
2. 组件类型和品质是通过 `item_name` 解析得出的
3. `quantity` 字段固定为1，因为每个assetid代表一个独立的物品
4. `status` 字段当前固定为"库存中"，因为查询条件限定了 `if_inventory = '1'`
5. 使用和出售功能需要后续实现具体的业务逻辑

