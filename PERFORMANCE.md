# Performance Optimization Guide

## 📊 Understanding Memory Usage

### Mode Comparison

| Mode | Memory Pattern | Peak Memory | Best For |
|------|---------------|-------------|----------|
| `dedup-after-load` | Load all → Process | 2-3x dataset size | Small datasets (<100K) |
| `dedup-as-loading` | Stream processing | ~1x batch size | Large datasets (>100K) |

### Memory Calculation

**dedup-after-load mode:**
```
Peak Memory ≈ Dataset Size × 3
Example: 100MB dataset → ~300MB memory
```

**dedup-as-loading mode:**
```
Peak Memory ≈ Batch Size × Item Size
Example: 10K items × 1KB = ~10MB memory
```

## 🚀 Optimization Strategies

### Strategy 1: Use JSONL Format

**Why JSONL is better:**
- No need to load entire file into memory
- Stream-based parsing
- 20-30% memory reduction

**Conversion:**
```bash
# Convert JSON to JSONL
cat data.json | jq -c '.[]' > data.jsonl

# Or using Python
python -c "import json; [print(json.dumps(item)) for item in json.load(open('data.json'))]"
```

### Strategy 2: Load Only Required Fields

**Before (all fields):**
```json
{
  "fields": ["id"],
  "fieldsToLoad": []
}
```
Memory: 100MB

**After (selected fields):**
```json
{
  "fields": ["id"],
  "fieldsToLoad": ["id", "name", "price"]
}
```
Memory: 30MB (70% reduction!)

### Strategy 3: Tune Batch Size

**Small Batch (1000-5000):**
- ✅ Lower memory peaks
- ✅ Better for limited memory
- ❌ Slower processing

**Large Batch (10000-50000):**
- ✅ Faster processing
- ✅ Better throughput
- ❌ Higher memory peaks

**Recommendation:**
```javascript
// Start with default
batchSize: 5000

// If memory available, increase
batchSize: 10000 // for 10K+ items
batchSize: 20000 // for 50K+ items
batchSize: 50000 // for 100K+ items
```

### Strategy 4: Parallel Processing

**File Loading:**
```json
{
  "parallelLoads": 10  // Default
}
```

- Increase for many small files: `20-50`
- Decrease for few large files: `5-10`

**Data Pushing:**
```json
{
  "parallelPushes": 5  // Default (dedup-after-load)
  "parallelPushes": 1  // Fixed (dedup-as-loading)
}
```

## 📈 Performance Benchmarks

### Test Environment
- CPU: 4 cores
- Memory: 2GB
- Dataset: 1M records

### Results

| Mode | Format | Fields Loaded | Batch Size | Time | Memory |
|------|--------|---------------|------------|------|--------|
| dedup-after-load | JSON | All | 5000 | 45s | 1.8GB |
| dedup-after-load | JSONL | All | 5000 | 42s | 1.5GB |
| dedup-after-load | JSONL | 3 fields | 5000 | 38s | 800MB |
| dedup-as-loading | JSONL | All | 10000 | 52s | 450MB |
| dedup-as-loading | JSONL | 3 fields | 10000 | 48s | 180MB |
| dedup-as-loading | JSONL | 3 fields | 20000 | 45s | 250MB |

**Winner:** `dedup-as-loading` + JSONL + `fieldsToLoad` + `batchSize: 20000`

## 🔧 Advanced Techniques

### Technique 1: Pre-filtering

Filter data before deduplication:

```json
{
  "preDedupTransformFunction": "async (items) => items.filter(i => i.price > 0 && i.status === 'active')"
}
```

Reduces dataset size by 50-80%!

### Technique 2: Chunk Processing

Split large files into chunks:

```bash
# Split 1M records into 100K chunks
split -l 100000 large_data.jsonl chunk_

# Process each chunk separately
for file in chunk_*; do
  # Process chunk
done
```

### Technique 3: Incremental Processing

Process data incrementally with state persistence:

```json
{
  "mode": "dedup-as-loading",
  "verboseLog": true
}
```

State saves every 15 seconds automatically.

## 🎯 Optimization Checklist

Before running on large dataset:

- [ ] Use `dedup-as-loading` mode
- [ ] Convert to JSONL format
- [ ] Set `fieldsToLoad` to essential fields only
- [ ] Tune `batchSize` (start with 10000)
- [ ] Enable `verboseLog` for monitoring
- [ ] Monitor memory usage in logs
- [ ] Test with subset first

## 📞 Getting Help

If you encounter performance issues:

1. Check memory usage in logs
2. Reduce `batchSize`
3. Use `fieldsToLoad` parameter
4. Switch to `dedup-as-loading` mode
5. Check dataset size and complexity

**Performance Issue Report Template:**
```
Dataset Size: _____ records
Memory Limit: _____ MB
Current Config:
- mode: _____
- batchSize: _____
- fieldsToLoad: _____
- format: _____

Expected: _____
Actual: _____
```
