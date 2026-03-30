# Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
cd worker-dedup-datasets
npm install
```

### Step 2: Prepare Your Data

Prepare your data files in JSON or JSONL format:

**JSON Format:**
```json
[
  {"id": 1, "name": "Item 1", "price": 100},
  {"id": 2, "name": "Item 2", "price": 200}
]
```

**JSONL Format:**
```
{"id": 1, "name": "Item 1", "price": 100}
{"id": 2, "name": "Item 2", "price": 200}
```

Save your data file to an accessible location.

### Step 3: Configure Input

Create `input.json`:

```json
{
  "inputFiles": [
    { "url": "file:///path/to/mydata.json" }
  ],
  "fields": ["id"],
  "output": "unique-items"
}
```

### Step 4: Run Worker

**Local Test:**
```bash
export INPUT_FILE=input.json
export LOCAL_DEV=1
npm start
```

**On CafeScraper Platform:**
1. Upload worker to CafeScraper
2. Configure input parameters in Console
3. Click "Run"

### Step 5: Check Results

View output in Cafe Console UI:
- Table view for structured data
- JSON view for raw data
- Export to JSON/CSV

## 📊 Common Use Cases

### Use Case 1: Remove Duplicate Products

```json
{
  "inputFiles": [
    { "url": "file:///products_batch1.json" },
    { "url": "file:///products_batch2.json" }
  ],
  "fields": ["product_id"],
  "output": "unique-items"
}
```

### Use Case 2: Find Duplicate Emails

```json
{
  "inputFiles": [
    { "url": "file:///users.json" }
  ],
  "fields": ["email"],
  "output": "duplicate-items"
}
```

### Use Case 3: Merge & Clean Data

```json
{
  "inputFiles": [
    { "url": "file:///raw_data.json" }
  ],
  "fields": ["id"],
  "preDedupTransformFunction": "async (items) => items.filter(i => i.status === 'active')",
  "postDedupTransformFunction": "async (items) => items.map(i => ({...i, merged: true}))"
}
```

## ⚡ Performance Tips

### For Small Datasets (<10K records)
- Mode: `dedup-after-load` (default)
- Batch Size: 5000 (default)

### For Medium Datasets (10K-100K)
- Mode: `dedup-after-load`
- Batch Size: 5000-10000

### For Large Datasets (>100K)
- Mode: `dedup-as-loading`
- Format: JSONL
- Batch Size: 10000-50000
- Use `fieldsToLoad` to reduce memory

## 🔗 Next Steps

- Read [Full Documentation](./README.md)
- Check [Migration Plan](./MIGRATION_PLAN.md)
- Run [Comprehensive Tests](./test/comprehensive-test.js)
