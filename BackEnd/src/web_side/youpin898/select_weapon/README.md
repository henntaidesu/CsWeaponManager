# 武器ClassID API文档

## 概述
用于统一管理各平台（悠悠有品、BUFF、Steam）武器模板ID和相关信息的API接口。

**基础URL**: `http://localhost:9001/youpin898SelectWeaponV1`

## 数据模型

### Weapon字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| yyyp_id | INTEGER | 悠悠有品武器模板ID |
| buff_id | INTEGER | BUFF武器ID |
| steam_id | INTEGER | Steam武器ID |
| CommodityName | TEXT | 完整商品名称 (中文) |
| en_weapon_name | TEXT | 英文武器名称 (CommodityHashName) |
| weapon_type | TEXT | 武器类型 (如: 匕首、步枪) |
| weapon_name | TEXT | 武器名称 (如: 弯刀（★）) |
| item_name | TEXT | 皮肤/物品名称 (如: 多普勒) |
| float_range | TEXT | 磨损范围 (如: 崭新出厂) |
| Rarity | TEXT | 稀有度 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**说明**: 
- 三个平台ID字段（yyyp_id、buff_id、steam_id）均为可选，至少需要一个
- 可以通过任意平台ID来关联同一个武器的不同平台信息

---

## API接口

### 1. 获取所有武器列表
**接口**: `GET /getWeaponList`

**描述**: 获取所有武器数据

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "yyyp_id": 43705,
      "buff_id": 12345,
      "steam_id": null,
      "CommodityName": "弯刀（★） | 多普勒 (崭新出厂)",
      "en_weapon_name": "★ Falchion Knife | Doppler (Factory New)",
      "weapon_type": "匕首",
      "weapon_name": "弯刀（★）",
      "item_name": "多普勒",
      "float_range": "崭新出厂",
      "Rarity": "隐秘",
      "created_at": "2025-10-19 12:00:00",
      "updated_at": "2025-10-19 12:00:00"
    }
  ],
  "count": 1
}
```

---

### 2. 根据ID获取武器
**接口**: `GET /getWeaponById/<weapon_id>`

**参数**:
- `weapon_id` (路径参数): 武器ID

**示例**: `GET /getWeaponById/43705`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "Id": 43705,
    "CommodityName": "弯刀（★） | 多普勒 (崭新出厂)",
    "weapon_type": "匕首",
    "weapon_name": "弯刀（★）",
    "item_name": "多普勒",
    "OnSaleCount": 130,
    "OnLeaseCount": 52
  }
}
```

---

### 3. 根据类型获取武器
**接口**: `GET /getWeaponByType/<weapon_type>`

**参数**:
- `weapon_type` (路径参数): 武器类型

**示例**: `GET /getWeaponByType/匕首`

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

---

### 4. 根据稀有度获取武器
**接口**: `GET /getWeaponByRarity/<rarity>`

**参数**:
- `rarity` (路径参数): 稀有度

**示例**: `GET /getWeaponByRarity/隐秘`

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

---

### 5. 根据品质范围获取武器
**接口**: `GET /getWeaponByFloatRange/<float_range>`

**参数**:
- `float_range` (路径参数): 品质范围

**示例**: `GET /getWeaponByFloatRange/崭新出厂`

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

---

### 6. 根据英文武器名称获取武器
**接口**: `GET /getWeaponByEnName/<en_weapon_name>`

**参数**:
- `en_weapon_name` (路径参数): 英文武器名称

**示例**: `GET /getWeaponByEnName/★ Falchion Knife | Doppler (Factory New)`

**说明**: 如果名称中包含特殊字符，请使用URL编码

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 1
}
```

---

### 7. 搜索武器
**接口**: `POST /searchWeapon`

**描述**: 支持多条件组合搜索

**请求体**:
```json
{
  "weapon_type": "匕首",
  "weapon_name": "弯刀（★）",
  "item_name": "多普勒"
}
```

**说明**: 所有字段都是可选的，只传需要搜索的条件

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

### 8. 获取可用武器列表
**接口**: `GET /getAvailableWeapons`

**描述**: 获取有在售或租赁数量的武器

**查询参数**:
- `min_sale` (可选): 最小在售数量，默认1
- `min_lease` (可选): 最小租赁数量，默认0

**示例**: `GET /getAvailableWeapons?min_sale=10&min_lease=5`

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 20
}
```

---

### 9. 批量插入或更新武器
**接口**: `POST /batchInsertOrUpdate`

**描述**: 批量插入或更新武器数据，如果ID已存在则更新，否则插入

**请求体**:
```json
[
  {
    "Id": 43705,
    "CommodityName": "弯刀（★） | 多普勒 (崭新出厂)",
    "en_weapon_name": "★ Falchion Knife | Doppler (Factory New)",
    "weapon_type": "匕首",
    "weapon_name": "弯刀（★）",
    "item_name": "多普勒",
    "float_range": "崭新出厂",
    "Rarity": "隐秘"
  },
  {
    "Id": 50795,
    "CommodityName": "骷髅匕首（★） | 蓝钢 (破损不堪)",
    "en_weapon_name": "★ Skeleton Knife | Blue Steel (Well-Worn)",
    "weapon_type": "匕首",
    "weapon_name": "骷髅匕首（★）",
    "item_name": "蓝钢",
    "float_range": "破损不堪",
    "Rarity": "隐秘"
  }
]
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功处理 2/2 条数据",
  "success_count": 2,
  "total_count": 2
}
```

---

### 10. 插入单个武器
**接口**: `POST /insertWeapon`

**描述**: 插入单个武器数据 (ID不能已存在)

**请求体**:
```json
{
  "Id": 43705,
  "CommodityName": "弯刀（★） | 多普勒 (崭新出厂)",
  "weapon_type": "匕首",
  "weapon_name": "弯刀（★）",
  "item_name": "多普勒",
  "OnSaleCount": 130,
  "OnLeaseCount": 52
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "武器数据插入成功",
  "data": {...}
}
```

---

### 11. 更新武器数据
**接口**: `PUT /updateWeapon/<weapon_id>`

**参数**:
- `weapon_id` (路径参数): 武器ID

**请求体**:
```json
{
  "OnSaleCount": 150,
  "OnLeaseCount": 60
}
```

**说明**: 只需要传需要更新的字段

**响应示例**:
```json
{
  "success": true,
  "message": "武器数据更新成功",
  "data": {...}
}
```

---

### 12. 删除武器
**接口**: `DELETE /deleteWeapon/<weapon_id>`

**参数**:
- `weapon_id` (路径参数): 武器ID

**示例**: `DELETE /deleteWeapon/43705`

**响应示例**:
```json
{
  "success": true,
  "message": "武器数据删除成功"
}
```

---

### 13. 获取武器总数
**接口**: `GET /getWeaponCount`

**描述**: 获取数据库中武器总数

**响应示例**:
```json
{
  "success": true,
  "count": 100
}
```

---

## 错误响应格式

所有接口在出错时返回统一格式:
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

常见HTTP状态码:
- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 使用示例

### Python示例
```python
import requests

base_url = "http://localhost:9001/youpin898SelectWeaponV1"

# 1. 获取所有武器
response = requests.get(f"{base_url}/getWeaponList")
print(response.json())

# 2. 搜索武器
search_data = {
    "weapon_type": "匕首",
    "item_name": "多普勒"
}
response = requests.post(f"{base_url}/searchWeapon", json=search_data)
print(response.json())

# 3. 批量插入武器数据
weapon_list = [
    {
        "Id": 43705,
        "CommodityName": "弯刀（★） | 多普勒 (崭新出厂)",
        "weapon_type": "匕首",
        "weapon_name": "弯刀（★）",
        "item_name": "多普勒",
        "OnSaleCount": 130,
        "OnLeaseCount": 52
    }
]
response = requests.post(f"{base_url}/batchInsertOrUpdate", json=weapon_list)
print(response.json())
```

### JavaScript示例
```javascript
const baseUrl = "http://localhost:9001/youpin898SelectWeaponV1";

// 获取所有武器
fetch(`${baseUrl}/getWeaponList`)
  .then(res => res.json())
  .then(data => console.log(data));

// 搜索武器
fetch(`${baseUrl}/searchWeapon`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    weapon_type: "匕首",
    item_name: "多普勒"
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 注意事项

1. **数据库自动初始化**: 首次启动API服务时会自动创建表
2. **批量操作**: 使用`batchInsertOrUpdate`可以自动处理插入和更新
3. **时间戳**: `created_at`和`updated_at`会自动管理
4. **索引优化**: 已为`en_weapon_name`、`weapon_type`、`weapon_name`、`item_name`、`float_range`、`Rarity`创建索引，查询性能较好
5. **新增字段**: v1.0.3版本新增`en_weapon_name`字段，用于存储英文武器名称(CommodityHashName)

