# Cafe 平台测试指南

## 📋 快速测试示例

以下是可以直接复制到 Cafe 平台 Input 输入框的 JSON 示例。

---

## 1️⃣ 直接输入数据 - 最简单测试

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200},
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 3, "name": "Product C", "price": 150}
  ],
  "fields": ["id"]
}
```

**预期结果**: 3条唯一数据（id: 1, 2, 3）

**填写方式**:
1. 数据来源类型: 选择 "直接输入数据"
2. 直接输入数据: 复制上面的 JSON 数组
3. 去重字段: 填写 `id`
4. 其他参数保持默认

---

## 2️⃣ 网络URL - GitHub数据

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    {"url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json"},
    {"url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data2.json"}
  ],
  "fields": ["id"]
}
```

**预期结果**: 8条唯一数据

**填写方式**:
1. 数据来源类型: 选择 "网络URL"
2. 网络数据URL列表: 添加两个URL
3. 去重字段: 填写 `id`

---

## 3️⃣ 查看重复数据

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200},
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200}
  ],
  "fields": ["id"],
  "output": "duplicate-items"
}
```

**预期结果**: 2条重复数据

**填写方式**:
1. 数据来源类型: 选择 "直接输入数据"
2. 直接输入数据: 复制上面的 JSON 数组
3. 去重字段: 填写 `id`
4. 输出内容: 选择 "重复项"

---

## 4️⃣ 数据过滤 + 去重

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 50},
    {"id": 2, "name": "Product B", "price": 150},
    {"id": 3, "name": "Product C", "price": 200},
    {"id": 1, "name": "Product A", "price": 50}
  ],
  "fields": ["id"],
  "customInputData": {"minPrice": 100},
  "preDedupTransformFunction": "async (items, { customInputData }) => {\n  const { minPrice } = customInputData;\n  return items.filter(item => item.price >= minPrice);\n}"
}
```

**预期结果**: 2条数据（price >= 100）

**填写方式**:
1. 数据来源类型: 选择 "直接输入数据"
2. 直接输入数据: 复制上面的 JSON 数组
3. 去重字段: 填写 `id`
4. 自定义输入数据: `{"minPrice": 100}`
5. 去重前转换函数: 复制上面的函数

---

## 5️⃣ 边加载边去重模式

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200},
    {"id": 3, "name": "Product C", "price": 150}
  ],
  "fields": ["id"],
  "mode": "dedup-as-loading"
}
```

**预期结果**: 3条唯一数据

**填写方式**:
1. 数据来源类型: 选择 "直接输入数据"
2. 直接输入数据: 复制上面的 JSON 数组
3. 去重字段: 填写 `id`
4. 处理模式: 选择 "边加载边去重"

---

## 6️⃣ 添加数据来源标记

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200}
  ],
  "fields": ["id"],
  "appendFileSource": true
}
```

**预期结果**: 每条数据包含 `__fileSource__` 字段

---

## 7️⃣ 仅加载指定字段

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100, "category": "Electronics"},
    {"id": 2, "name": "Product B", "price": 200, "category": "Books"}
  ],
  "fields": ["id"],
  "fieldsToLoad": ["id", "name"]
}
```

**预期结果**: 只输出 `id` 和 `name` 字段

---

## 8️⃣ 自定义数据转换（添加序号）

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200},
    {"id": 3, "name": "Product C", "price": 150}
  ],
  "fields": ["id"],
  "postDedupTransformFunction": "async (items) => {\n  return items.map((item, index) => ({\n    rank: index + 1,\n    ...item\n  }));\n}"
}
```

**预期结果**: 每条数据包含 `rank` 序号字段

---

## 9️⃣ 多字段组合去重

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 1, "name": "Product A", "price": 200},
    {"id": 2, "name": "Product B", "price": 100}
  ],
  "fields": ["id", "price"]
}
```

**预期结果**: 3条唯一数据（id+price 组合唯一）

---

## 🔟 仅统计不输出数据

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    {"id": 1, "name": "Product A", "price": 100},
    {"id": 2, "name": "Product B", "price": 200},
    {"id": 1, "name": "Product A", "price": 100}
  ],
  "fields": ["id"],
  "output": "nothing"
}
```

**预期结果**: 只显示统计信息，不输出数据

---

## 📝 Cafe 平台填写步骤

### 步骤1: 选择数据来源类型
- 直接输入数据：在下方文本框粘贴 JSON 数组
- 网络URL：添加可访问的 HTTP/HTTPS URL
- Cafe Dataset ID：输入 Dataset ID（需在云端环境）

### 步骤2: 填写去重字段
- 单字段: `["id"]`
- 多字段: `["name", "price"]`

### 步骤3: 选择输出内容
- 唯一项：输出去重后的数据
- 重复项：输出被判定为重复的数据
- 仅统计：只显示统计信息

### 步骤4: 选择处理模式
- 先加载后去重：适合小数据集（<10万条）
- 边加载边去重：适合大数据集（>10万条）

### 步骤5: 高级选项（可选）
- 自定义转换函数
- 并发参数调整
- 批处理大小

---

## ⚠️ 注意事项

1. **直接输入数据** 必须是有效的 JSON 数组格式
2. **网络URL** 必须可公开访问，支持 HTTP/HTTPS
3. **去重字段** 必须与数据中的字段名完全一致（区分大小写）
4. **转换函数** 必须是有效的异步函数，返回数组
5. **fieldsToLoad** 必须包含所有去重字段

---

## 🧪 本地测试

在推送到 Cafe 平台前，可以先本地测试：

```bash
# 运行模拟测试
node test/cafe-simulator-test.js

# 或单个测试
node test/test.js
```

---

## 📞 问题反馈

如遇到问题，请提供：
1. 输入参数 JSON
2. 错误日志
3. 预期结果 vs 实际结果
