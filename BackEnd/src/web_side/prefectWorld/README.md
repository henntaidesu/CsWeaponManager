# 完美世界库存组件数据API文档

## API Base URL
```
http://127.0.0.1:9001/prefectWorldStockComponentsV1
```

## 接口列表

### 1. 批量插入/更新库存组件数据

**接口路径:** `/batch`  
**请求方式:** `POST`  
**Content-Type:** `application/json`

**功能说明:**
- 批量插入或更新库存组件数据
- 如果记录已存在（根据assetid判断），则更新记录
- 如果记录不存在，则插入新记录
- 自动过滤数据库中不存在的字段

**请求体格式:**
```json
{
    "items": [
        {
            "assetid": "29719329234",
            "classid": "41435",
            "instanceid": "45483288961",
            "data_user": "76561198334278515",
            "item_name": "WOOD7（全息）",
            "weapon_name": "2023年巴黎锦标赛",
            "weapon_type": "印花",
            "weapon_float": "0.0",
            "weapon_level": "奇异",
            "float_range": "崭新出厂",
            "buy_price": "100.00",
            "yyyp_price": "120.00",
            "buff_price": "115.00",
            "steam_price": "130.00",
            "order_time": "2024-01-01 12:00:00"
        }
    ]
}
```

**数据库字段说明:**
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| assetid | TEXT | 是 | 资产ID（主键） |
| instanceid | TEXT | 否 | 实例ID |
| classid | TEXT | 否 | 类ID |
| item_name | TEXT | 否 | 物品名称 |
| weapon_name | TEXT | 否 | 武器名称 |
| float_range | TEXT | 否 | 磨损值范围 |
| weapon_type | TEXT | 否 | 武器类型 |
| weapon_float | TEXT | 否 | 武器磨损值 |
| weapon_level | TEXT | 否 | 武器等级 |
| data_user | TEXT | 否 | 用户Steam ID |
| buy_price | TEXT | 否 | 购入价格 |
| yyyp_price | TEXT | 否 | 悠悠价格 |
| buff_price | TEXT | 否 | BUFF价格 |
| order_time | TEXT | 否 | 入库时间 |
| steam_price | TEXT | 否 | Steam价格 |

**注意:** 所有字段都会被转换为字符串类型（TEXT）存储到数据库中。

**响应格式:**
```json
{
    "code": 0,
    "message": "success",
    "result": {
        "total": 100,
        "success": 98,
        "failed": 2,
        "failed_items": [
            {
                "item": {...},
                "error": "错误原因"
            }
        ]
    }
}
```

**响应字段说明:**
- `code`: 状态码，0表示成功
- `message`: 消息
- `result.total`: 提交的总数量
- `result.success`: 成功数量
- `result.failed`: 失败数量
- `result.failed_items`: 失败的项目列表（最多返回10条）

---

### 2. 插入/更新单条库存组件数据

**接口路径:** `/single`  
**请求方式:** `POST`  
**Content-Type:** `application/json`

**功能说明:**
- 插入或更新单条库存组件数据
- 如果记录已存在，则更新；否则插入

**请求体格式:**
```json
{
    "assetid": "29719329234",
    "classid": "41435",
    "instanceid": "45483288961",
    "data_user": "76561198334278515",
    "item_name": "WOOD7（全息）",
    "weapon_name": "2023年巴黎锦标赛",
    "weapon_type": "印花",
    "weapon_float": "0.0",
    "weapon_level": "奇异",
    "float_range": "崭新出厂"
}
```

**响应格式:**
```json
{
    "code": 0,
    "message": "记录插入成功",
    "result": {
        "assetid": "29719329234",
        "action": "insert"
    }
}
```

**响应字段说明:**
- `result.action`: 操作类型，`insert`（插入）或 `update`（更新）

---

### 3. 删除库存组件数据

**接口路径:** `/delete/<assetid>`  
**请求方式:** `DELETE`

**功能说明:**
- 根据assetid删除指定的库存组件记录

**请求示例:**
```
DELETE http://127.0.0.1:9001/prefectWorldStockComponentsV1/delete/29719329234
```

**响应格式:**
```json
{
    "code": 0,
    "message": "删除成功",
    "result": null
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 404 | 记录不存在 |
| 500 | 服务器内部错误 |

---

## 使用示例

### Python示例（使用requests库）

```python
import requests

# 批量插入数据
url = "http://127.0.0.1:9001/prefectWorldStockComponentsV1/batch"
data = {
    "items": [
        {
            "assetid": "29719329234",
            "classid": "41435",
            "item_name": "WOOD7（全息）",
            "weapon_type": "印花",
            "data_user": "76561198334278515"
        }
    ]
}

response = requests.post(url, json=data)
result = response.json()

if result['code'] == 0:
    print(f"成功: {result['result']['success']}/{result['result']['total']}")
else:
    print(f"错误: {result['message']}")
```

### 爬虫调用示例

```python
from src.web_site.prefectWorld.get_inventory_component import getInventoryComponent

# 初始化爬虫
spider = getInventoryComponent(
    appversion="xxx",
    device="xxx",
    gameType="xxx",
    platform="xxx",
    token="xxx",
    tdSign="xxx",
    steamId="76561198334278515"
)

# 解析数据
result = spider.parseJSON(assetid="12345678")

if result['success']:
    # 提交到数据库
    db_result = spider.postDB()
    
    if db_result['success']:
        print(f"数据提交成功: {db_result['message']}")
    else:
        print(f"数据提交失败: {db_result['message']}")
```

---

## 注意事项

1. **字段过滤**: API会自动过滤掉数据库中不存在的字段，只保留数据库表结构中定义的字段
2. **数据类型**: 所有字段值都会被转换为字符串（TEXT）类型存储
3. **主键唯一性**: `assetid` 是主键，必须提供且唯一
4. **更新逻辑**: 如果assetid已存在，会更新该记录的所有提供的字段
5. **批量处理**: 批量接口建议每次提交不超过1000条数据，以保证性能

