# Cafe 平台输入示例

## ⚠️ 重要发现：textarea 编辑器问题

**Cafe 平台的 textarea 编辑器不支持任何 `default` 值**，即使是简单的 `"{}"` 也会导致 `Network error, try again`。

### 正确的 textarea 配置

```json
{
  "title": "Service Account JSON",
  "name": "serviceAccountKey",
  "type": "string",
  "editor": "textarea",
  "description": "Google Service Account JSON key",
  "required": false,        // ✅ 必须设置
  "placeholder": "{...}"    // ✅ 只使用 placeholder
  // ❌ 不要设置 default 字段！
}
```

---

## 测试示例 1：直接输入数据去重（推荐）

### 步骤 1：选择数据来源
```
数据来源类型 / Data Source Type: 直接输入数据 / Direct Input
```

### 步骤 2：输入测试数据（手动粘贴到 inputData 文本框）
```json
[
  {"id": 1, "name": "Product A", "price": 100},
  {"id": 2, "name": "Product B", "price": 200},
  {"id": 1, "name": "Product A", "price": 100},
  {"id": 3, "name": "Product C", "price": 150},
  {"id": 2, "name": "Product B", "price": 200}
]
```

### 步骤 3：设置去重字段
```
去重字段 / Deduplication Fields: id
```
（默认已填写，无需修改）

### 步骤 4：其他配置
```
输出内容 / Output Content: 唯一项(去重后的数据) / Unique Items
处理模式 / Processing Mode: 先加载后去重 / Dedup After Load
```

### 预期结果
```json
[
  {"id": 1, "name": "Product A", "price": 100},
  {"id": 2, "name": "Product B", "price": 200},
  {"id": 3, "name": "Product C", "price": 150}
]
```
**去重了 2 条重复数据（id=1 和 id=2 各重复一次）**

---

## 测试示例 2：网络 URL 加载数据

### 步骤 1：选择数据来源
```
数据来源类型 / Data Source Type: 网络URL / Network URL
```

### 步骤 2：输入测试 URL
```
网络数据URL列表 / Network Data URLs:
  - URL: https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json
```

### 步骤 3：设置去重字段
```
去重字段 / Deduplication Fields: id
```

### 步骤 4：其他配置
```
输入文件格式 / Input File Format: JSON (数组格式 / Array format)
输出内容 / Output Content: 唯一项(去重后的数据) / Unique Items
```

---

## 测试示例 3：输出重复项

### 步骤 1：配置同示例 1

### 步骤 2：修改输出内容
```
输出内容 / Output Content: 重复项(被去重的数据) / Duplicate Items
```

### 预期结果
```json
[
  {"id": 1, "name": "Product A", "price": 100},
  {"id": 2, "name": "Product B", "price": 200}
]
```
**输出了被判定为重复的数据**

---

## 测试示例 4：组合字段去重

### 测试数据
```json
[
  {"name": "Product A", "price": 100},
  {"name": "Product A", "price": 200},
  {"name": "Product A", "price": 100},
  {"name": "Product B", "price": 100}
]
```

### 去重字段设置
```
去重字段 / Deduplication Fields: name, price
```
（添加两个字段）

### 预期结果
```json
[
  {"name": "Product A", "price": 100},
  {"name": "Product A", "price": 200},
  {"name": "Product B", "price": 100}
]
```
**只有 `name="Product A" + price=100` 的组合被去重**

---

## 测试示例 5：查看统计信息

### 配置
```
输出内容 / Output Content: 仅统计(不输出数据) / Statistics Only
```

### 预期日志输出
```
数据来源: 直接输入 (5 条数据)
使用模式: 先加载后去重
加载完成: 5 条数据
去重完成: 剩余 3 条唯一项，去除了 2 条重复项
处理完成!
```

---

## 常见问题排查

### 问题 1：Network error, try again
**原因**：textarea 字段设置了 `default` 值
**解决**：移除所有 textarea 的 `default` 字段，只使用 `placeholder`

### 问题 2：输入框无法输入
**原因**：stringList 的 `default` 格式错误
**解决**：使用对象数组格式 `[{ "string": "value" }]`

### 问题 3：Build 失败
**原因**：`main.js` 不在根目录
**解决**：确保 `package.json` 中 `"main": "main.js"`，且 main.js 在项目根目录

### 问题 4：字段不存在错误
**原因**：去重字段名与数据字段名不匹配
**解决**：确保字段名完全一致（区分大小写）

---

## 推荐测试顺序

1. ✅ **先测试示例 1**：最简单，验证基本功能
2. ✅ **再测试示例 3**：验证重复项输出
3. ✅ **然后测试示例 4**：验证组合字段去重
4. ✅ **最后测试示例 2**：验证 URL 加载

---

## 最小化配置（用于快速验证）

如果上述示例仍然失败，使用以下最小配置：

```json
{
  "dataSourceType": "direct-input",
  "fields": [{"string": "id"}]
}
```

然后在 `inputData` 手动粘贴：
```json
[{"id": 1}, {"id": 1}, {"id": 2}]
```

预期结果：`[{"id": 1}, {"id": 2}]`
