# Network Error 调试记录

## 问题现象
Cafe 平台报错：`Network error, try again`

## 根本原因
**`b` 字段对应的参数不是 array 类型**

## 调试过程

### 尝试 1：修复 stringList 的 default 格式
- **假设**：stringList 的 default 格式错误
- **修复**：将 `["id"]` 改为 `[{ "string": "id" }]`
- **结果**：❌ 仍然报错

### 尝试 2：修复 textarea 的 default 值
- **假设**：textarea 不能有复杂的 default 值
- **修复**：移除 textarea 的 default，改用 placeholder
- **结果**：❌ 仍然报错

### 尝试 3：完全移除 textarea 的 placeholder
- **假设**：textarea 连 placeholder 都不支持
- **修复**：移除 textarea 的 placeholder 字段
- **结果**：❌ 仍然报错

### 尝试 4：超级简化 input_schema
- **假设**：description 太长或特殊字符导致问题
- **修复**：大幅缩短所有 description，简化配置
- **结果**：❌ 仍然报错

### 尝试 5：修复 b 字段类型 ✅
- **假设**：b 字段必须对应 array 类型参数
- **发现**：
  - 文档明确说明："b 字段对应的参数必须是 array 类型"
  - 原配置：`"b": "dataSourceType"` (string 类型) ❌
  - 其他成功案例：
    - worker-username-finder: `"b": "usernames"` (array 类型) ✅
    - worker-rag-web-browser: `"b": "queries"` (array 类型) ✅
- **修复**：将 `"b": "dataSourceType"` 改为 `"b": "fields"` (array 类型)
- **结果**：⏳ 等待测试

## 关键发现

### 规则：b 字段必须是 array 类型

| 编辑器类型 | type 字段 | 能否作为 b 字段 |
|-----------|----------|----------------|
| `stringList` | `array` | ✅ 可以 |
| `requestList` | `array` | ✅ 可以 |
| `requestListSource` | `array` | ✅ 可以 |
| `select` | `string` | ❌ 不能 |
| `input` | `string` | ❌ 不能 |
| `textarea` | `string` | ❌ 不能 |

## 其他发现的坑

### 1. stringList 的 default 格式
```json
// ❌ 错误
"default": ["id"]

// ✅ 正确
"default": [{ "string": "id" }]
```

### 2. textarea 不能有 default 值
```json
// ❌ 错误
{
  "editor": "textarea",
  "default": "{}"
}

// ✅ 正确
{
  "editor": "textarea",
  "required": false
  // 完全不要 default 字段
}
```

### 3. main.js 必须在根目录
```json
// ❌ 错误
{
  "main": "src/main.js"
}

// ✅ 正确
{
  "main": "main.js"
}
```

## 最终修复

```diff
{
-  "b": "dataSourceType",
+  "b": "fields",
  "properties": [
    {
+     "name": "fields",
+     "type": "array",
+     "editor": "stringList",
+     "required": true
+   },
+   {
      "name": "dataSourceType",
      "type": "string",
      "editor": "select"
    }
  ]
}
```

## 经验总结

1. ✅ **仔细阅读文档**："b 字段对应的参数必须是 array 类型"
2. ✅ **对比成功案例**：其他 worker 都使用 array 类型的 b 字段
3. ✅ **逐步排查**：从最可能的假设开始测试
4. ✅ **记录调试过程**：每次修改都要记录假设、修复、结果

## 参考

- Cafe 文档：UI Script(input_schema.json).md
- 成功案例：
  - worker-username-finder
  - worker-rag-web-browser
  - worker-google-sheets
