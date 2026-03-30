# Cafe 平台开发踩坑总结

## 🔥 核心坑（导致 Network error）

### 1️⃣ **b 字段必须是 array 类型**

**现象**：`Network error, try again`

**错误配置**：
```json
{
  "b": "dataSourceType",  // ❌ string 类型
  "properties": [
    {
      "name": "dataSourceType",
      "type": "string",
      "editor": "select"
    }
  ]
}
```

**正确配置**：
```json
{
  "b": "fields",  // ✅ array 类型
  "properties": [
    {
      "name": "fields",
      "type": "array",
      "editor": "stringList"
    }
  ]
}
```

**规则**：
- ❌ `select`、`input`、`textarea` → `string` 类型 → **不能**作为 b 字段
- ✅ `stringList`、`requestList`、`requestListSource` → `array` 类型 → **可以**作为 b 字段

---

## 🎯 编辑器坑

### 2️⃣ **stringList 的 default 格式**

**错误配置**：
```json
{
  "editor": "stringList",
  "default": ["id"]  // ❌ 字符串数组
}
```

**正确配置**：
```json
{
  "editor": "stringList",
  "default": [
    { "string": "id" }  // ✅ 对象数组
  ]
}
```

### 3️⃣ **stringList 的数据格式**

**情况1：单项展开**
```json
// Cafe 平台发送
{ "string": "id" }  // fields 字段消失

// 脚本接收
inputJson.string = "id"
```

**情况2：对象数组**
```json
// Cafe 平台发送
{ "fields": [{ "string": "id" }] }

// 脚本接收
inputJson.fields = [{ "string": "id" }]
```

**处理代码**：
```javascript
let parsedFields = fields;
if (!Array.isArray(fields)) {
    // 单项展开
    if (inputJson.string) {
        parsedFields = [inputJson.string];
    }
} else {
    // 对象数组
    parsedFields = fields.map(item => {
        if (typeof item === 'object' && item.string) {
            return item.string;
        }
        return item;
    });
}
```

### 4️⃣ **textarea 完全不能有 default 值**

**错误配置**：
```json
{
  "editor": "textarea",
  "default": "{}"  // ❌ 任何 default 都会失败
}
```

**正确配置**：
```json
{
  "editor": "textarea",
  "required": false  // ✅ 不设置 default
  // ❌ 不要设置 default 或 placeholder
}
```

---

## 📁 文件结构坑

### 5️⃣ **main.js 必须在根目录**

**错误配置**：
```
project/
  src/
    main.js  ❌
  package.json
```

```json
// package.json
{
  "main": "src/main.js"  // ❌
}
```

**正确配置**：
```
project/
  main.js  ✅
  src/
    utils.js
  package.json
```

```json
// package.json
{
  "main": "main.js"  // ✅
}
```

---

## 🐛 数据处理坑

### 6️⃣ **stringList 数据解析错误导致去重失败**

**现象**：
- 日志显示：`"string": "id"`（fields 字段消失）
- 所有数据都判定为重复
- 输出了全部数据，没有去重

**原因**：
- `fields = [{ string: "id" }]`（对象数组）
- 代码以为是 `["id"]`（字符串数组）
- `item[{ string: "id" }]` 是 undefined
- 所有 key 都是空字符串

**修复**：见上面第 3 条的处理代码

---

## 📊 问题排查流程

### Network error 排查步骤

1. **检查 b 字段类型** → 必须是 array 类型
2. **检查 stringList default** → 必须是 `[{ "string": "value" }]`
3. **检查 textarea** → 完全不能有 default 或 placeholder
4. **检查 main.js 位置** → 必须在根目录

### 去重失败排查步骤

1. **检查日志中的输入参数** → 看 fields 字段格式
2. **检查 fields 解析逻辑** → 是否处理对象数组格式
3. **检查去重函数调用** → fields 是否是字符串数组

---

## 📝 完整调试示例

### 示例 1：Network error

**问题**：`Network error, try again`

**排查过程**：
```bash
# 1. 检查 input_schema.json
grep '"b"' input_schema.json
# 发现：b = "dataSourceType" (string 类型) ❌

# 2. 修改为 array 类型字段
"b": "fields"

# 3. 测试 → 成功
```

### 示例 2：去重失败

**问题**：输出了全部数据，没有去重

**排查过程**：
```bash
# 1. 查看日志
# 发现：fields = [{ string: "id" }]，但代码期望 ["id"]

# 2. 修改解析逻辑
parsedFields = fields.map(item => item.string || item);

# 3. 测试 → 成功
```

---

## 🎓 经验总结

### 黄金法则

1. ✅ **b 字段必须对应 array 类型参数**
2. ✅ **stringList 的 default 必须是 `[{ "string": "value" }]`**
3. ✅ **textarea 不能有任何 default 或 placeholder**
4. ✅ **main.js 必须在根目录**
5. ✅ **stringList 数据要同时处理单项展开和对象数组格式**

### 对比表

| 问题类型 | 现象 | 原因 | 解决方案 |
|---------|------|------|---------|
| b 字段类型错误 | Network error | b 对应 string 类型 | 改为 array 类型字段 |
| stringList default 格式错误 | 输入框锁定 | 使用字符串数组 | 改为对象数组 `[{ "string": "..." }]` |
| textarea 有 default | Network error | 设置了 default 值 | 移除 default 和 placeholder |
| main.js 不在根目录 | Build 失败 | 路径错误 | 移到根目录，修改 package.json |
| stringList 数据未解析 | 去重失败 | 对象数组未提取 | 添加解析逻辑 `item.string` |

---

## 📚 参考文档

- `UI Script(input_schema.json).md` - Cafe 平台编辑器文档
- `NETWORK_ERROR_DEBUG_LOG.md` - Network error 调试记录
- 成功案例：
  - `worker-username-finder`
  - `worker-rag-web-browser`
  - `worker-google-sheets`

---

## 🚀 最佳实践

### 开发流程

1. **从最小化配置开始** → 先确保能部署成功
2. **逐步添加功能** → 每次添加一个字段测试
3. **记录每次修改** → 方便回滚和调试
4. **对比成功案例** → 参考其他 worker 的配置

### 测试流程

1. **本地测试** → 使用 `LOCAL_DEV=1` 模拟
2. **云端部署** → 先测试基本功能
3. **添加数据** → 测试去重、转换等功能
4. **检查日志** → 确认输入参数格式

### 调试技巧

```javascript
// 在脚本开头添加调试日志
const inputJson = await cafesdk.parameter.getInputJSONObject();
await cafesdk.log.debug(`完整输入: ${JSON.stringify(inputJson, null, 2)}`);
await cafesdk.log.debug(`fields 类型: ${typeof inputJson.fields}`);
await cafesdk.log.debug(`fields 值: ${JSON.stringify(inputJson.fields)}`);
```
