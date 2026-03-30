# 测试指南 | Test Guide

## 🚀 快速开始

### 本地测试

```bash
# 运行基础测试
npm test

# 运行综合测试（3个场景）
npm run test:full
```

### Cafe 平台测试

直接复制以下示例到 Cafe 控制台的输入框中。

---

## 📋 详细测试示例

### 测试 1: 直接输入 - 基础去重 ✅ 最简单

**场景**: 最简单的测试，直接粘贴 JSON 数组数据

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"iPhone\", \"price\": 999}, {\"id\": 2, \"name\": \"iPad\", \"price\": 799}, {\"id\": 1, \"name\": \"iPhone\", \"price\": 999}]",
  "fields": ["id"]
}
```

**预期结果**: 2 条唯一数据（id: 1, 2）

**说明**:
- `inputData` 必须是 JSON 字符串格式
- 使用 `fields: ["id"]` 表示按 id 字段去重

---

### 测试 2: 直接输入 - 多字段组合去重

**场景**: 使用多个字段组合判断重复

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"name\": \"iPhone\", \"price\": 999}, {\"name\": \"iPhone\", \"price\": 999}, {\"name\": \"iPhone\", \"price\": 899}]",
  "fields": ["name", "price"]
}
```

**预期结果**: 2 条唯一数据

**说明**: 
- 同名同价格才算重复
- `{name: "iPhone", price: 999}` 重复
- `{name: "iPhone", price: 899}` 唯一（价格不同）

---

### 测试 3: 网络 URL - GitHub 测试数据

**场景**: 从 GitHub 加载真实测试数据

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json" },
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data2.json" }
  ],
  "fields": ["id"]
}
```

**预期结果**: 8 条唯一数据（data1: 6条 + data2: 4条，去重后: 8条）

---

### 测试 4: 网络 URL - JSONL 格式

**场景**: 加载 JSONL 格式的数据

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data3.jsonl" }
  ],
  "fields": ["id"]
}
```

**预期结果**: 3 条唯一数据（4 条输入，1 条重复）

---

### 测试 5: 查找重复数据

**场景**: 输出被判定为重复的数据

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"A\"}, {\"id\": 2, \"name\": \"B\"}, {\"id\": 1, \"name\": \"A\"}, {\"id\": 3, \"name\": \"C\"}, {\"id\": 2, \"name\": \"B\"}]",
  "fields": ["id"],
  "output": "duplicate-items"
}
```

**预期结果**: 2 条重复数据（id: 1 和 id: 2）

---

### 测试 6: 数据过滤 + 去重

**场景**: 先过滤数据再去重

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"price\": 50}, {\"id\": 2, \"price\": 150}, {\"id\": 3, \"price\": 200}, {\"id\": 1, \"price\": 50}]",
  "fields": ["id"],
  "preDedupTransformFunction": "async (items, customInputData) => {\n  return items.filter(item => item.price >= 100);\n}",
  "customInputData": "{\"minPrice\": 100}"
}
```

**预期结果**: 2 条唯一数据（price >= 100: id 2 和 3）

---

### 测试 7: 大数据集模式

**场景**: 使用边加载边去重模式（适合 >10 万条数据）

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"A\"}, {\"id\": 2, \"name\": \"B\"}, {\"id\": 3, \"name\": \"C\"}]",
  "fields": ["id"],
  "mode": "dedup-as-loading",
  "batchSize": 1000
}
```

**预期结果**: 3 条唯一数据

**说明**:
- `dedup-as-loading` 模式内存占用低
- 适合处理大数据集

---

### 测试 8: 添加数据来源

**场景**: 在输出数据中添加来源标记

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"A\"}, {\"id\": 2, \"name\": \"B\"}]",
  "fields": ["id"],
  "appendFileSource": true
}
```

**预期结果**: 2 条数据，每条包含 `__fileSource__` 字段

---

### 测试 9: 仅加载指定字段

**场景**: 只加载需要的字段以节省内存

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"A\", \"price\": 100, \"category\": \"Electronics\"}, {\"id\": 2, \"name\": \"B\", \"price\": 200, \"category\": \"Books\"}]",
  "fields": ["id"],
  "fieldsToLoad": ["id", "name"]
}
```

**预期结果**: 2 条数据，只包含 id 和 name 字段

---

### 测试 10: 自定义数据转换

**场景**: 去重后添加序号字段

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"A\"}, {\"id\": 2, \"name\": \"B\"}, {\"id\": 3, \"name\": \"C\"}]",
  "fields": ["id"],
  "postDedupTransformFunction": "async (items) => {\n  return items.map((item, index) => ({\n    rank: index + 1,\n    ...item\n  }));\n}"
}
```

**预期结果**: 3 条数据，每条包含 rank 序号字段

---

## 📝 注意事项

### 1. inputData 格式

❌ **错误**（数组格式）:
```json
{
  "inputData": [{"id": 1}, {"id": 2}]
}
```

✅ **正确**（JSON 字符串格式）:
```json
{
  "inputData": "[{\"id\": 1}, {\"id\": 2}]"
}
```

### 2. customInputData 格式

❌ **错误**（对象格式）:
```json
{
  "customInputData": {"minPrice": 100}
}
```

✅ **正确**（JSON 字符串格式）:
```json
{
  "customInputData": "{\"minPrice\": 100}"
}
```

### 3. fields 格式

⚠️ **Cafe 平台特殊行为**：

**单项输入**: `[{string: "id"}]` → 收到 `{string: "id"}`

**解决方案**: 代码已自动处理，无需担心

---

## 🔧 故障排查

### 问题: 所有数据都被判定为唯一

**原因**: 去重字段不存在

**解决**:
1. 检查 fields 字段名是否正确
2. 启用 `verboseLog: true` 查看详细日志

### 问题: inputData 解析失败

**原因**: JSON 格式错误

**解决**:
1. 确保使用 JSON 字符串格式
2. 使用 JSON 验证工具检查格式

### 问题: 内存不足

**原因**: 数据量太大

**解决**:
1. 使用 `mode: "dedup-as-loading"`
2. 使用 `fieldsToLoad` 仅加载必要字段
3. 减小 `batchSize`

---

## 📊 性能参考

| 数据量 | 推荐模式 | 内存占用 | 预计时间 |
|--------|---------|----------|----------|
| < 1 万条 | `dedup-after-load` | 低 | < 10 秒 |
| 1-10 万条 | `dedup-after-load` | 中 | 10-60 秒 |
| 10-100 万条 | `dedup-as-loading` | 低 | 1-10 分钟 |
| > 100 万条 | `dedup-as-loading` | 低 | > 10 分钟 |

---

## 🎯 推荐测试顺序

1. **测试 1** - 验证基础功能
2. **测试 3** - 验证网络加载
3. **测试 5** - 验证重复项检测
4. **测试 6** - 验证数据转换
5. **测试 7** - 验证大数据模式

---

**需要帮助?** 查看 [README.md](../README.md) 或提交 Issue
