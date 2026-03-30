# Cafe Input Schema 关键修复

## 🚨 发现的问题

### 问题 1: Cafe平台没有文件存储

**确认**：根据官方对比文档，Cafe确实没有 KeyValueStore 文件存储服务！

**Cafe的存储限制**：
- ✅ **有**：`result.pushData()` - JSON数据推送
- ❌ **没有**：KeyValueStore - 无法存储文件
- ❌ **没有**：公开URL分享
- ❌ **没有**：图片、PDF等文件存储API

**解决方案**：设计的三种数据导入方式是正确的：
1. ✅ 直接输入JSON数据（小数据）
2. ✅ 网络URL加载（中等数据）
3. ✅ Cafe Dataset ID（大数据）

---

### 问题 2: input_schema.json 使用了不存在的编辑器类型 ❌

**致命错误**：使用了 `"editor": "json"` - **Cafe不支持这个类型！**

**官方支持的编辑器类型**：
- ✅ `input` - 单行文本
- ✅ `textarea` - 多行文本
- ✅ `number` - 数字输入
- ✅ `select` - 下拉框
- ✅ `radio` - 单选按钮
- ✅ `checkbox` - 复选框
- ✅ `switch` - 开关
- ✅ `datepicker` - 日期选择器
- ✅ `requestList` - URL列表
- ✅ `requestListSource` - 带参数的URL列表
- ✅ `stringList` - 字符串列表
- ❌ **没有** `json` 编辑器！

**错误导致的后果**：Cafe控制台无法渲染输入框，用户看不到输入界面！

---

## ✅ 已修复的问题

### 修复 1: inputData 字段

**修复前**（错误）：
```json
{
  "name": "inputData",
  "type": "array",
  "editor": "json",  // ❌ 不存在！
  "default": []
}
```

**修复后**（正确）：
```json
{
  "name": "inputData",
  "type": "string",  // ✅ 改为string
  "editor": "textarea",  // ✅ 使用textarea
  "default": "[]"  // ✅ 改为字符串
}
```

**说明**：用户在textarea中粘贴JSON数组文本，脚本中需要用 `JSON.parse()` 解析。

---

### 修复 2: customInputData 字段

**修复前**（错误）：
```json
{
  "name": "customInputData",
  "type": "object",
  "editor": "json",  // ❌ 不存在！
  "default": {}
}
```

**修复后**（正确）：
```json
{
  "name": "customInputData",
  "type": "string",  // ✅ 改为string
  "editor": "textarea",  // ✅ 使用textarea
  "default": "{}"  // ✅ 改为字符串
}
```

---

## 📝 代码适配说明

由于修改了数据类型，脚本代码需要相应调整：

### 旧代码（之前的写法）

```javascript
// ❌ 不再适用
const inputData = inputJson.inputData;  // 数组
const customInputData = inputJson.customInputData;  // 对象
```

### 新代码（修复后的写法）

```javascript
// ✅ 需要解析JSON字符串
let inputData = [];
try {
    inputData = JSON.parse(inputJson.inputData || '[]');
} catch (error) {
    await cafesdk.log.error('inputData JSON格式错误');
}

let customInputData = {};
try {
    customInputData = JSON.parse(inputJson.customInputData || '{}');
} catch (error) {
    await cafesdk.log.error('customInputData JSON格式错误');
}
```

---

## 🎯 Cafe控制台输入示例

### 示例 1: 直接输入数据

**在Cafe控制台的"直接输入数据"文本框中粘贴**：

```json
[
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
  { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" }
]
```

**完整配置**：
```json
{
  "dataSourceType": "直接输入数据 / Direct Input",
  "inputData": "[{\"id\": 1, \"name\": \"Product A\"}]",
  "fields": "[\"id\"]"
}
```

---

### 示例 2: 网络URL

**在Cafe控制台的"网络数据URL列表"中添加**：
```
https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json
```

---

### 示例 3: 自定义输入数据

**在Cafe控制台的"自定义输入数据"文本框中粘贴**：

```json
{
  "minPrice": 100,
  "maxPrice": 1000,
  "category": "Electronics"
}
```

---

## 📊 字段类型对照表

| 字段名 | 旧类型 | 新类型 | 编辑器 | 说明 |
|--------|--------|--------|--------|------|
| `inputData` | array ❌ | string ✅ | textarea | JSON数组文本 |
| `customInputData` | object ❌ | string ✅ | textarea | JSON对象文本 |
| `fields` | array ✅ | array ✅ | stringList | 字段名列表 |
| `datasetIds` | array ✅ | array ✅ | stringList | Dataset ID列表 |
| `inputUrls` | array ✅ | array ✅ | requestList | URL列表 |

**关键**：
- `stringList` 和 `requestList` 支持数组类型
- `textarea` 只支持字符串类型（需要JSON.parse）

---

## ⚠️ stringList 陷阱（重要！）

**根据官方文档，`stringList` 有一个陷阱**：

当只有一项时，Cafe会自动展开数组：
- **单项时**：`{spreadsheetIds: [{string: "ID_12345"}]}` → 收到 `{string: "ID_12345"}`
- **多项时**：`{spreadsheetIds: [{string: "a"}, {string: "b"}]}` → 保持原样

**处理方法**（在代码中）：

```javascript
// 处理 stringList 单项展开问题
let fieldsArray = inputJson.fields;

// 检测单项展开情况
if (!fieldsArray && inputJson.string) {
    fieldsArray = [{ string: inputJson.string }];
}

// 然后正常处理
const fields = fieldsArray.map(item => item.string);
```

---

## 🎨 最终的正确配置结构

```json
{
  "description": "工具描述...",
  "b": "dataSourceType",
  "properties": [
    {
      "name": "dataSourceType",
      "type": "string",
      "editor": "select",  // ✅ 正确
      "options": [...]
    },
    {
      "name": "inputData",
      "type": "string",  // ✅ 改为string
      "editor": "textarea",  // ✅ 使用textarea
      "default": "[]"
    },
    {
      "name": "inputUrls",
      "type": "array",
      "editor": "requestList",  // ✅ 正确
      "default": []
    },
    {
      "name": "datasetIds",
      "type": "array",
      "editor": "stringList",  // ✅ 正确
      "default": []
    },
    {
      "name": "fields",
      "type": "array",
      "editor": "stringList",  // ✅ 正确
      "default": []
    },
    {
      "name": "customInputData",
      "type": "string",  // ✅ 改为string
      "editor": "textarea",  // ✅ 使用textarea
      "default": "{}"
    }
  ]
}
```

---

## 🚀 下一步

1. ✅ **已修复** input_schema.json 配置
2. ⏳ **需要更新** src/main.js 代码以支持新的字段格式
3. ⏳ **需要测试** 在Cafe控制台实际运行

---

## 💡 关键要点总结

1. **Cafe没有文件存储** - 只能通过JSON/URL/Dataset导入数据
2. **没有json编辑器** - 必须使用textarea + JSON.parse
3. **stringList陷阱** - 单项时会自动展开数组
4. **字段类型必须正确** - 否则控制台无法渲染输入框

---

生成时间: 2026-03-30
文档版本: v1.0
修复人: AI Assistant
