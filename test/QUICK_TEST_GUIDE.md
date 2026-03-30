# 快速测试指南 | Quick Test Guide

## 📁 现有测试数据说明

项目中已经有现成的测试数据文件，可以直接使用：

### 数据文件位置
```
d:/kael_odin/kael_study/worker-dedup-datasets/test/
├── data1.json  (6条商品数据)
├── data2.json  (4条商品数据)
└── data3.jsonl (4条商品数据，JSONL格式)
```

### 数据结构
所有数据都是商品信息，包含以下字段：
```json
{
  "id": 1,
  "name": "Product A",
  "price": 100,
  "category": "Electronics"
}
```

### 数据重复情况
- **data1.json**: 包含重复的 `id: 1` 和 `id: 2`
- **data2.json**: 包含与 data1 重复的 `id: 3`
- **data3.jsonl**: 包含重复的 `id: 8`

**总数据**: 14条
**去重后**: 10条（4条重复）
**去重率**: 28.57%

---

## 🚀 Cafe 控制台测试示例

### 示例 1: 基础去重测试（推荐首次使用）⭐

**场景**: 合并所有文件，按商品 ID 去重

**复制以下内容到 Cafe 控制台**:

```json
{
  "inputFiles": [
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data3.jsonl" }
  ],
  "fields": ["id"],
  "output": "unique-items",
  "mode": "dedup-after-load"
}
```

**预期结果**:
- 输入: 14条数据
- 去重字段: id
- 去重后: 10条唯一数据
- 重复项: 4条
- 去重率: 28.57%

**输出的10条数据应该是**:
```json
[
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
  { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" },
  { "id": 4, "name": "Product D", "price": 300, "category": "Clothing" },
  { "id": 5, "name": "Product E", "price": 250, "category": "Electronics" },
  { "id": 6, "name": "Product F", "price": 400, "category": "Books" },
  { "id": 7, "name": "Product G", "price": 500, "category": "Clothing" },
  { "id": 8, "name": "Product H", "price": 600, "category": "Electronics" },
  { "id": 9, "name": "Product I", "price": 700, "category": "Books" },
  { "id": 10, "name": "Product J", "price": 800, "category": "Clothing" }
]
```

---

### 示例 2: 查看重复数据

**场景**: 查看哪些数据被判定为重复

**复制以下内容到 Cafe 控制台**:

```json
{
  "inputFiles": [
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data3.jsonl" }
  ],
  "fields": ["id"],
  "output": "duplicate-items",
  "appendFileSource": true
}
```

**预期结果**:
输出被判定为重复的4条数据，并显示它们来自哪个文件：

```json
[
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics", "__fileSource__": "data1.json" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books", "__fileSource__": "data1.json" },
  { "id": 3, "name": "Product C", "price": 150, "category": "Electronics", "__fileSource__": "data2.json" },
  { "id": 8, "name": "Product H", "price": 600, "category": "Electronics", "__fileSource__": "data3.jsonl" }
]
```

---

### 示例 3: 多字段组合去重

**场景**: 按 name + price 组合去重（即使 ID 不同，但名称和价格相同也算重复）

**复制以下内容到 Cafe 控制台**:

```json
{
  "inputFiles": [
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json" }
  ],
  "fields": ["name", "price"],
  "output": "unique-items"
}
```

**说明**:
- 如果两条数据的 name 和 price 都相同，则判定为重复
- 比单独用 id 去重更严格

---

### 示例 4: 数据过滤后去重

**场景**: 只保留价格 >= 200 的商品，然后按 ID 去重

**复制以下内容到 Cafe 控制台**:

```json
{
  "inputFiles": [
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json" }
  ],
  "fields": ["id"],
  "preDedupTransformFunction": "async (items) => {\n  return items.filter(item => item.price >= 200);\n}",
  "output": "unique-items"
}
```

**预期结果**:
- 先过滤出价格 >= 200 的商品
- 再按 ID 去重

---

### 示例 5: 添加序号并排序

**场景**: 去重后，按价格降序排序，并添加排名

**复制以下内容到 Cafe 控制台**:

```json
{
  "inputFiles": [
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json" }
  ],
  "fields": ["id"],
  "postDedupTransformFunction": "async (items) => {\n  return items\n    .sort((a, b) => b.price - a.price)\n    .map((item, index) => ({\n      rank: index + 1,\n      ...item\n    }));\n}",
  "output": "unique-items"
}
```

**预期结果**:
```json
[
  { "rank": 1, "id": 7, "name": "Product G", "price": 500, "category": "Clothing" },
  { "rank": 2, "id": 6, "name": "Product F", "price": 400, "category": "Books" },
  { "rank": 3, "id": 4, "name": "Product D", "price": 300, "category": "Clothing" },
  ...
]
```

---

## 💻 本地测试方法

如果你想先在本地测试，可以这样做：

### 方法 1: 使用现有的测试脚本

```bash
cd d:/kael_odin/kael_study/worker-dedup-datasets

# 运行基础测试
npm test

# 运行综合测试
node test/comprehensive-test.js
```

### 方法 2: 使用环境变量运行

```bash
cd d:/kael_odin/kael_study/worker-dedup-datasets

# Windows PowerShell
$env:LOCAL_DEV="1"
$env:INPUT_FILE="test/test-input.json"
npm start

# Windows CMD
set LOCAL_DEV=1
set INPUT_FILE=test/test-input.json
npm start
```

### 方法 3: 创建自定义测试文件

1. 创建文件 `my-test-input.json`:

```json
{
  "inputFiles": [
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json" },
    { "url": "file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json" }
  ],
  "fields": ["id"],
  "verboseLog": true
}
```

2. 运行:

```bash
cd d:/kael_odin/kael_study/worker-dedup-datasets
$env:LOCAL_DEV="1"
$env:INPUT_FILE="my-test-input.json"
npm start
```

---

## 📊 如何理解输入参数

### Input Files（输入文件列表）

**作用**: 告诉工具要处理哪些文件

**如何填写**:
1. 使用 `file:///` 前缀 + 文件绝对路径
2. 每个文件用 `{ "url": "..." }` 格式
3. 可以添加多个文件

**示例**:
```json
"inputFiles": [
  { "url": "file:///d:/data/file1.json" },
  { "url": "file:///d:/data/file2.json" }
]
```

**你的数据路径**:
- data1.json: `file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data1.json`
- data2.json: `file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data2.json`
- data3.jsonl: `file:///d:/kael_odin/kael_study/worker-dedup-datasets/test/data3.jsonl`

---

### Deduplication Fields（去重字段）

**作用**: 告诉工具根据哪些字段判断重复

**如何填写**:
1. 使用数组格式: `["字段名"]`
2. 字段名必须与数据中的字段名完全一致
3. 可以使用多个字段组合去重

**示例**:
```json
// 单字段
"fields": ["id"]

// 多字段组合
"fields": ["name", "price"]

// 不去重（仅合并）
"fields": []
```

**你的数据字段**:
- `id` - 商品ID
- `name` - 商品名称
- `price` - 价格
- `category` - 分类

**推荐**:
- 大多数场景用 `["id"]` 即可
- 如果需要更严格的去重，用 `["name", "price"]`

---

## 🎯 推荐测试流程

### 步骤 1: 基础测试
使用示例 1，验证基本功能是否正常

### 步骤 2: 查看重复项
使用示例 2，了解哪些数据被判定为重复

### 步骤 3: 尝试高级功能
使用示例 4 或 5，测试数据过滤和转换功能

### 步骤 4: 自定义测试
修改参数，创建符合你需求的测试用例

---

## ⚠️ 常见问题

### Q1: 文件路径错误
**错误**: `File not found`

**解决**: 确保路径格式正确
- ✅ 正确: `file:///d:/path/to/file.json`
- ❌ 错误: `d:/path/to/file.json`
- ❌ 错误: `D:\\path\\to\\file.json`

---

### Q2: 字段名错误
**错误**: `Field not found: product_id`

**解决**: 确保字段名与数据中的字段名完全一致
- 数据中的字段: `id`
- ✅ 正确: `"fields": ["id"]`
- ❌ 错误: `"fields": ["product_id"]`

---

### Q3: 不知道输出什么
**解决**: 查看 Cafe 控制台的运行日志，会显示:
```
总输入项: 14
去重字段: ["id"]
去重后数量: 10
重复项数量: 4
去重率: 28.57%
```

---

## 📝 快速参考卡

### 最简配置（90%场景够用）
```json
{
  "inputFiles": [
    { "url": "file:///你的文件路径1.json" },
    { "url": "file:///你的文件路径2.json" }
  ],
  "fields": ["id"]
}
```

### 常用字段说明
- `inputFiles`: 必填，文件列表
- `fields`: 必填，去重字段
- `output`: 可选，默认 "unique-items"
- `mode`: 可选，默认 "dedup-after-load"
- `verboseLog`: 可选，调试时设为 true

### 数据格式
- JSON: `[{"id": 1}, {"id": 2}]`
- JSONL: 每行一个 JSON 对象

---

## 🎉 开始测试

**最快的方法**: 复制"示例 1"的内容，直接粘贴到 Cafe 控制台运行！

预计运行时间: < 5秒

期待结果: 10条唯一数据

---

生成时间: 2026-03-30
文档版本: v1.0
