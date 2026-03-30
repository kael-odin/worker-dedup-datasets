# 🎯 Cafe 控制台直接使用指南

## ✅ 测试验证成功！

我已经在本地成功运行了测试，数据完全正确：

### 测试结果
```
总计加载: 14 条
唯一项: 10 条  
重复项: 4 条
去重率: 28.57%
```

---

## 📋 直接复制到 Cafe 控制台的完整 Input

### 🌟 示例 1: 基础去重（推荐首次使用）

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

**说明**:
- 合并 3 个文件（data1.json、data2.json、data3.jsonl）
- 按 `id` 字段去重
- 输出去重后的唯一数据
- 预期结果：10 条数据

---

### 📊 示例 2: 查看重复数据

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

**说明**:
- 输出被判定为重复的 4 条数据
- 每条数据显示来自哪个文件

---

### 📈 示例 3: 数据过滤 + 去重

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

**说明**:
- 只保留价格 >= 200 的商品
- 然后按 id 去重

---

### 🔢 示例 4: 添加排名并排序

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

**说明**:
- 去重后按价格降序排序
- 添加 rank 字段

---

## 📝 输入参数说明

### 1. Input Files（输入文件列表）

**作用**: 指定要处理的文件

**格式**: 
```json
[
  { "url": "file:///绝对路径/文件名.json" }
]
```

**你的测试数据**:
- `data1.json` - 6条商品数据（包含重复id: 1, 2）
- `data2.json` - 4条商品数据（包含重复id: 3）  
- `data3.jsonl` - 4条商品数据（JSONL格式，包含重复id: 8）

**如何修改**:
- 替换路径为你自己的文件路径
- 可以添加或删除文件

---

### 2. Deduplication Fields（去重字段）

**作用**: 指定根据哪些字段判断重复

**格式**: 
```json
["字段名1", "字段名2"]
```

**可选字段**:
- `["id"]` - 按商品ID去重（推荐）
- `["name", "price"]` - 按名称+价格组合去重
- `[]` - 不去重，仅合并数据

**示例**:
```json
// 单字段去重
"fields": ["id"]

// 多字段组合去重  
"fields": ["name", "price"]

// 不去重
"fields": []
```

---

## 🎬 如何使用

### 步骤 1: 打开 Cafe 控制台
访问 Cafe 平台，找到 Dedup Datasets Worker

### 步骤 2: 复制示例
从上面的示例中选择一个，复制整个 JSON 内容

### 步骤 3: 粘贴到输入框
将复制的内容粘贴到 Cafe 控制台的输入框

### 步骤 4: 点击运行
点击"运行"按钮，等待处理完成

### 步骤 5: 查看结果
查看输出结果，应该看到：
- 总输入项: 14
- 去重字段: ["id"]
- 唯一项: 10
- 重复项: 4

---

## 📊 测试数据详情

### data1.json 内容
```json
[
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
  { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" },
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },  // 重复
  { "id": 4, "name": "Product D", "price": 300, "category": "Clothing" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books" }  // 重复
]
```

### data2.json 内容
```json
[
  { "id": 5, "name": "Product E", "price": 250, "category": "Electronics" },
  { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" },  // 与data1重复
  { "id": 6, "name": "Product F", "price": 400, "category": "Books" },
  { "id": 7, "name": "Product G", "price": 500, "category": "Clothing" }
]
```

### data3.jsonl 内容
```
{"id": 8, "name": "Product H", "price": 600, "category": "Electronics"}
{"id": 9, "name": "Product I", "price": 700, "category": "Books"}
{"id": 10, "name": "Product J", "price": 800, "category": "Clothing"}
{"id": 8, "name": "Product H", "price": 600, "category": "Electronics"}  // 重复
```

---

## ✅ 预期输出（示例 1）

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

**统计信息**:
```
总输入项: 14
去重字段: ["id"]
唯一项: 10
重复项: 4
去重率: 28.57%
```

---

## 💡 提示

1. **路径格式**: 必须使用 `file:///` 前缀 + 绝对路径
2. **字段名**: 必须与数据中的字段名完全一致（区分大小写）
3. **默认值**: 大部分参数使用默认值即可，只需填写 `inputFiles` 和 `fields`
4. **调试**: 如需详细日志，添加 `"verboseLog": true`

---

## 🚀 立即开始

**最快方法**: 复制"示例 1"的内容，直接粘贴到 Cafe 控制台运行！

预计耗时: < 5秒

---

生成时间: 2026-03-30
