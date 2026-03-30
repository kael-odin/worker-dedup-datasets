# Cafe Console 输入示例 | Cafe Console Input Examples

## 工具作用说明 | What This Tool Does

### 中文说明

这是一个**数据集去重与合并工具**，可以帮你：

1. **合并多个文件**：把多个 JSON/JSONL 文件的数据合并成一个
2. **智能去重**：根据你指定的字段（如 id、name 等）自动去除重复数据
3. **灵活转换**：可以在去重前后对数据进行自定义处理
4. **大数据支持**：支持处理百万级数据，内存友好

**典型应用场景**：
- ✅ 合并多个爬虫结果文件，去除重复商品
- ✅ 清理数据库导出文件中的重复记录
- ✅ 整合多个数据源，生成唯一数据集
- ✅ 找出数据中的重复项进行数据质量分析

### English Description

This is a **Dataset Deduplication & Merge Tool** that helps you:

1. **Merge Multiple Files**: Combine data from multiple JSON/JSONL files into one
2. **Smart Deduplication**: Automatically remove duplicates based on specified fields (e.g., id, name)
3. **Flexible Transformation**: Custom process data before/after deduplication
4. **Big Data Support**: Handles millions of records with memory-efficient processing

**Common Use Cases**:
- ✅ Merge multiple scraper result files and remove duplicate products
- ✅ Clean duplicate records from database exports
- ✅ Integrate multiple data sources into a unique dataset
- ✅ Identify duplicates for data quality analysis

---

## 输入参数详解 | Input Parameters Explained

### 1. **输入文件列表** (`inputFiles`) - 必填 ⭐

**作用**：指定要处理的 JSON/JSONL 文件路径

**格式**：
```json
[
  { "url": "file:///path/to/data1.json" },
  { "url": "file:///path/to/data2.jsonl" }
]
```

**说明**：
- 支持多个文件同时处理
- 路径格式：`file:///` + 文件绝对路径
- 支持 `.json`（JSON 数组）和 `.jsonl`（每行一个 JSON）两种格式
- 文件会自动合并成一个大文件进行处理

**示例**：
```json
// 示例1: 单个文件
"inputFiles": [
  { "url": "file:///d:/data/products.json" }
]

// 示例2: 多个文件
"inputFiles": [
  { "url": "file:///d:/data/jan_sales.json" },
  { "url": "file:///d:/data/feb_sales.json" },
  { "url": "file:///d:/data/mar_sales.json" }
]
```

---

### 2. **去重字段** (`fields`) - 必填 ⭐

**作用**：指定根据哪些字段判断数据是否重复

**格式**：
```json
["字段名1", "字段名2"]
```

**说明**：
- **单字段去重**：`["id"]` - 只根据 id 判断重复
- **多字段组合去重**：`["name", "price"]` - name 和 price 都相同才算重复
- **不去重**：`[]` - 空数组表示保留所有数据，只合并
- 字段名必须与数据中的字段名完全一致（区分大小写）

**示例**：
```json
// 示例1: 按 ID 去重（最常用）
"fields": ["id"]

// 示例2: 按商品名称+价格组合去重
"fields": ["product_name", "price"]

// 示例3: 按用户邮箱去重
"fields": ["email"]

// 示例4: 不去重，只合并数据
"fields": []
```

**实战场景**：
```
数据1: {"id": 1, "name": "iPhone", "price": 999}
数据2: {"id": 1, "name": "iPhone", "price": 899}
数据3: {"id": 2, "name": "iPhone", "price": 999}

- fields: ["id"] → 保留数据1和数据3（数据2的id重复被删除）
- fields: ["name", "price"] → 保留数据1和数据2（数据3的name+price组合重复）
- fields: [] → 保留所有3条数据
```

---

### 3. **输入文件格式** (`inputFormat`) - 可选

**作用**：指定输入文件的格式，支持自动检测

**可选值**：
- `"json"` - JSON 数组格式
- `"jsonl"` - 每行一个 JSON 对象

**默认值**：`"json"`

**说明**：
- 通常可以留空，工具会根据文件扩展名（.json/.jsonl）自动识别
- 如果扩展名与实际格式不符，可以手动指定

**示例**：
```json
// 自动检测（推荐）
"inputFormat": "json"

// 手动指定 JSONL 格式
"inputFormat": "jsonl"
```

---

### 4. **输出内容** (`output`) - 可选

**作用**：选择输出哪些数据

**可选值**：
- `"unique-items"` - 输出去重后的唯一数据（默认）
- `"duplicate-items"` - 输出被判定为重复的数据
- `"nothing"` - 仅显示统计信息，不输出数据

**默认值**：`"unique-items"`

**实战场景**：
```json
// 场景1: 清理重复数据，保留唯一项
"output": "unique-items"

// 场景2: 数据质量分析，查看有哪些重复
"output": "duplicate-items"

// 场景3: 只看统计信息（数据量、重复率等）
"output": "nothing"
```

---

### 5. **处理模式** (`mode`) - 可选

**作用**：选择数据处理的策略，影响内存占用和速度

**可选值**：
- `"dedup-after-load"` - 先加载所有数据，再去重（默认）
- `"dedup-as-loading"` - 边加载边去重

**默认值**：`"dedup-after-load"`

**对比说明**：

| 特性 | 先加载后去重 | 边加载边去重 |
|------|-------------|-------------|
| **内存占用** | 高（需存储全部数据） | 低（实时去重） |
| **处理速度** | 较快 | 较慢 |
| **顺序保持** | ✅ 保持原始顺序 | ❌ 不保证顺序 |
| **适用场景** | 中小数据集（<10万条） | 大数据集（>10万条） |

**示例**：
```json
// 场景1: 小数据集（<10万条），追求速度
"mode": "dedup-after-load"

// 场景2: 大数据集（>10万条），节省内存
"mode": "dedup-as-loading"
```

---

### 6. **仅加载指定字段** (`fieldsToLoad`) - 可选

**作用**：只加载需要的字段，减少内存占用和提升速度

**格式**：`["字段1", "字段2"]`

**默认值**：`[]`（加载所有字段）

**说明**：
- 如果你的数据有很多字段，但只用几个字段去重，建议设置此参数
- **重要**：去重字段必须包含在内，否则会报错
- 可节省 50%-90% 内存占用

**示例**：
```json
// 数据示例（原始数据有10个字段）
{
  "id": 1,
  "name": "Product A",
  "price": 100,
  "description": "Very long text...",
  "images": ["url1", "url2", ...],
  "reviews": [...],
  ...
}

// 只需要 id 和 name 去重
"fields": ["id"],
"fieldsToLoad": ["id", "name"]  // 只加载这2个字段，节省内存

// 注意：fields 必须是 fieldsToLoad 的子集
// ❌ 错误：fields: ["price"], fieldsToLoad: ["id", "name"]  // price 不在 fieldsToLoad 中
```

---

### 7. **去重前转换函数** (`preDedupTransformFunction`) - 高级功能

**作用**：在去重前对数据进行自定义处理

**格式**：JavaScript 异步函数

**默认值**：`async (items, { customInputData }) => { return items; }`（不做任何处理）

**典型应用**：
- 过滤无效数据
- 标准化字段格式（如统一小写、去空格）
- 添加临时字段用于去重

**示例**：
```json
// 示例1: 过滤掉价格为 0 的商品
"preDedupTransformFunction": "async (items, { customInputData }) => {
  return items.filter(item => item.price > 0);
}"

// 示例2: 统一邮箱格式（转小写、去空格）
"preDedupTransformFunction": "async (items, { customInputData }) => {
  return items.map(item => ({
    ...item,
    email: item.email.toLowerCase().trim()
  }));
}"

// 示例3: 添加数据处理时间戳
"preDedupTransformFunction": "async (items, { customInputData }) => {
  const timestamp = Date.now();
  return items.map(item => ({
    ...item,
    processedAt: timestamp
  }));
}"
```

---

### 8. **去重后转换函数** (`postDedupTransformFunction`) - 高级功能

**作用**：在去重后对最终结果进行自定义处理

**格式**：JavaScript 异步函数

**默认值**：`async (items, { customInputData }) => { return items; }`

**典型应用**：
- 添加序号、排名
- 最终数据格式化
- 数据脱敏

**示例**：
```json
// 示例1: 添加序号
"postDedupTransformFunction": "async (items, { customInputData }) => {
  return items.map((item, index) => ({
    rank: index + 1,
    ...item
  }));
}"

// 示例2: 数据脱敏（隐藏部分信息）
"postDedupTransformFunction": "async (items, { customInputData }) => {
  return items.map(item => ({
    ...item,
    email: item.email.replace(/(.{2}).+(@.+)/, '$1***$2')
  }));
}"

// 示例3: 排序（按价格降序）
"postDedupTransformFunction": "async (items, { customInputData }) => {
  return items.sort((a, b) => b.price - a.price);
}"
```

---

### 9. **自定义输入数据** (`customInputData`) - 高级功能

**作用**：传递自定义参数给转换函数

**格式**：JSON 对象

**默认值**：`{}`

**示例**：
```json
// 在转换函数中使用自定义数据
"customInputData": {
  "minPrice": 100,
  "maxPrice": 1000,
  "category": "electronics"
}

// 配合 preDedupTransformFunction 使用
"preDedupTransformFunction": "async (items, { customInputData }) => {
  const { minPrice, maxPrice, category } = customInputData;
  return items.filter(item => 
    item.price >= minPrice && 
    item.price <= maxPrice &&
    item.category === category
  );
}"
```

---

### 10. **Null 值视为唯一** (`nullAsUnique`) - 可选

**作用**：决定去重字段的 null 值如何处理

**可选值**：
- `false`（默认）- null 值会被判定为重复，只保留一个
- `true` - 每个 null 值都视为唯一，全部保留

**示例**：
```json
// 数据示例
{"id": 1, "name": "Product A"}
{"id": null, "name": "Product B"}  // id 为 null
{"id": null, "name": "Product C"}  // id 为 null

// nullAsUnique: false（默认）
// 结果: 保留 2 条（一个 id=null 的被删除）

// nullAsUnique: true
// 结果: 保留 3 条（所有数据都唯一）
```

---

### 11-13. 性能参数（可选）

#### **并行加载数** (`parallelLoads`)
- **作用**：同时加载文件的线程数
- **默认值**：`10`
- **建议**：小文件可增加到 20-50，大文件保持 10

#### **并行推送数** (`parallelPushes`)
- **作用**：同时输出数据的线程数
- **默认值**：`5`
- **说明**：边加载边去重模式下固定为 1

#### **批次大小** (`batchSize`)
- **作用**：每次处理的数据量
- **默认值**：`5000`
- **建议**：大数据集建议设为 1000-5000，小数据集可设为 10000+

---

### 14. **附加文件来源** (`appendFileSource`) - 可选

**作用**：在每条数据中添加 `__fileSource__` 字段，记录来源文件

**默认值**：`false`

**示例**：
```json
// 开启后，输出数据会包含来源信息
{
  "id": 1,
  "name": "Product A",
  "__fileSource__": "/d/data/jan_sales.json"
}
```

**应用场景**：
- 追踪数据来源
- 在转换函数中根据来源文件做不同处理

---

### 15. **详细日志** (`verboseLog`) - 可选

**作用**：开启详细日志输出

**默认值**：`false`

**建议**：
- ✅ 调试时开启
- ❌ 生产环境关闭（大数据集会产生大量日志）

---

## 完整输入示例 | Complete Input Examples

### 示例 1: 基础去重（最常用）

**场景**：合并3个销售数据文件，按商品ID去重

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/jan_sales.json" },
    { "url": "file:///d:/data/feb_sales.json" },
    { "url": "file:///d:/data/mar_sales.json" }
  ],
  "fields": ["product_id"],
  "output": "unique-items",
  "mode": "dedup-after-load"
}
```

---

### 示例 2: 多字段组合去重

**场景**：按商品名称+价格组合去重，避免同名不同价的商品被误删

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/products.json" }
  ],
  "fields": ["name", "price"],
  "output": "unique-items",
  "mode": "dedup-after-load"
}
```

---

### 示例 3: 大数据集处理（节省内存）

**场景**：处理100万条用户数据，使用边加载边去重模式

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/users_part1.jsonl" },
    { "url": "file:///d:/data/users_part2.jsonl" },
    { "url": "file:///d:/data/users_part3.jsonl" }
  ],
  "inputFormat": "jsonl",
  "fields": ["email"],
  "fieldsToLoad": ["email", "name", "signup_date"],
  "output": "unique-items",
  "mode": "dedup-as-loading",
  "batchSize": 2000
}
```

---

### 示例 4: 数据质量分析

**场景**：查找数据中的重复项，分析数据质量问题

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/database_export.json" }
  ],
  "fields": ["id"],
  "output": "duplicate-items",
  "appendFileSource": true,
  "verboseLog": true
}
```

---

### 示例 5: 数据过滤+转换（高级）

**场景**：只保留价格在100-1000元的商品，并添加序号

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/all_products.json" }
  ],
  "fields": ["id"],
  "customInputData": {
    "minPrice": 100,
    "maxPrice": 1000
  },
  "preDedupTransformFunction": "async (items, { customInputData }) => {\n  const { minPrice, maxPrice } = customInputData;\n  return items.filter(item => item.price >= minPrice && item.price <= maxPrice);\n}",
  "postDedupTransformFunction": "async (items, { customInputData }) => {\n  return items.map((item, index) => ({\n    rank: index + 1,\n    ...item\n  }));\n}"
}
```

---

### 示例 6: 仅合并数据，不去重

**场景**：只是简单合并多个文件，保留所有数据

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/file1.json" },
    { "url": "file:///d:/data/file2.json" },
    { "url": "file:///d:/data/file3.json" }
  ],
  "fields": [],
  "output": "unique-items"
}
```

---

### 示例 7: 数据标准化后去重

**场景**：统一邮箱格式后再去重，避免大小写或空格导致的误判

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/leads.json" }
  ],
  "fields": ["email"],
  "preDedupTransformFunction": "async (items, { customInputData }) => {\n  return items.map(item => ({\n    ...item,\n    email: item.email.toLowerCase().trim()\n  }));\n}"
}
```

---

### 示例 8: 排序+去重

**场景**：按价格降序排序后，保留每个ID的最新（最贵）记录

```json
{
  "inputFiles": [
    { "url": "file:///d:/data/price_history.json" }
  ],
  "fields": ["product_id"],
  "preDedupTransformFunction": "async (items, { customInputData }) => {\n  return items.sort((a, b) => b.price - a.price);\n}",
  "mode": "dedup-after-load"
}
```

---

## ⚠️ 常见错误与解决方案

### 错误 1: 文件路径格式不正确

❌ **错误**：
```json
{ "url": "d:/data/file.json" }
{ "url": "D:\\data\\file.json" }
```

✅ **正确**：
```json
{ "url": "file:///d:/data/file.json" }
```

---

### 错误 2: 去重字段不存在

❌ **错误**：
```json
// 数据中没有 "product_id" 字段，只有 "id" 字段
"fields": ["product_id"]
```

✅ **正确**：
```json
"fields": ["id"]
```

---

### 错误 3: fieldsToLoad 未包含去重字段

❌ **错误**：
```json
{
  "fields": ["price"],
  "fieldsToLoad": ["id", "name"]  // price 不在其中
}
```

✅ **正确**：
```json
{
  "fields": ["price"],
  "fieldsToLoad": ["id", "name", "price"]  // price 必须包含
}
```

---

### 错误 4: 转换函数语法错误

❌ **错误**：
```json
// 缺少 return 语句
"preDedupTransformFunction": "async (items) => { items.filter(...) }"
```

✅ **正确**：
```json
"preDedupTransformFunction": "async (items) => { return items.filter(...); }"
```

---

## 💡 最佳实践建议

1. **小数据集（<1万条）**：使用默认参数即可
2. **中等数据集（1-10万条）**：建议设置 `fieldsToLoad`
3. **大数据集（>10万条）**：
   - 使用 `mode: "dedup-as-loading"`
   - 设置 `batchSize: 1000-2000`
   - 开启 `fieldsToLoad` 只加载必要字段
4. **调试时**：开启 `verboseLog: true`，完成后关闭
5. **数据质量检查**：先用 `output: "duplicate-items"` 查看重复情况

---

## 📊 输出结果说明

运行完成后，你会看到类似以下的统计信息：

```
总输入项: 15000
去重字段: ["id"]
去重后数量: 12500
重复项数量: 2500
去重率: 16.67%
```

输出的数据格式与输入一致，保持原始 JSON 结构。

---

## 🔗 相关文档

- [README.md](README.md) - 完整文档
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [PERFORMANCE.md](PERFORMANCE.md) - 性能优化指南
