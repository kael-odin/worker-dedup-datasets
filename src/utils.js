const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { STATE_DIR } = require('./consts');

/**
 * 解析输入文件路径
 */
function parseFilePath(urlOrPath) {
    if (urlOrPath.startsWith('file:///')) {
        let path = urlOrPath.replace('file:///', '');
        if (process.platform === 'win32' && /^[a-zA-Z]:/.test(path)) {
            return path;
        }
        return '/' + path;
    }
    return urlOrPath;
}

/**
 * 从文件加载数据
 */
async function loadFromFile(filePath, format = 'json', fieldsToLoad = null) {
    const absolutePath = parseFilePath(filePath);
    
    try {
        const content = await fs.readFile(absolutePath, 'utf-8');
        
        let detectedFormat = format;
        if (format === 'json' && absolutePath.endsWith('.jsonl')) {
            detectedFormat = 'jsonl';
        } else if (format === 'jsonl' && absolutePath.endsWith('.json')) {
            detectedFormat = 'json';
        }
        
        let items;
        if (detectedFormat === 'json') {
            items = JSON.parse(content);
            if (!Array.isArray(items)) {
                throw new Error(`JSON 文件应包含数组,但收到 ${typeof items}`);
            }
        } else if (detectedFormat === 'jsonl') {
            items = content.trim().split('\n').map(line => JSON.parse(line));
        } else {
            throw new Error(`不支持的文件格式: ${detectedFormat}`);
        }
        
        if (fieldsToLoad && fieldsToLoad.length > 0) {
            items = items.map(item => {
                const filteredItem = {};
                for (const field of fieldsToLoad) {
                    if (item.hasOwnProperty(field)) {
                        filteredItem[field] = item[field];
                    }
                }
                return filteredItem;
            });
        }
        
        return items;
    } catch (error) {
        throw new Error(`加载文件失败 ${absolutePath}: ${error.message}`);
    }
}

/**
 * 从网络URL或本地文件加载数据
 */
async function loadFromUrl(url, format = 'json', fieldsToLoad = null) {
    // 支持 file:// 协议
    if (url.startsWith('file://')) {
        const filePath = parseFilePath(url);
        return loadFromFile(filePath, format, fieldsToLoad);
    }
    
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    let detectedFormat = format;
                    if (format === 'json' && url.endsWith('.jsonl')) {
                        detectedFormat = 'jsonl';
                    } else if (format === 'jsonl' && url.endsWith('.json')) {
                        detectedFormat = 'json';
                    }
                    
                    let items;
                    if (detectedFormat === 'json') {
                        items = JSON.parse(data);
                        if (!Array.isArray(items)) {
                            throw new Error(`JSON 文件应包含数组,但收到 ${typeof items}`);
                        }
                    } else if (detectedFormat === 'jsonl') {
                        items = data.trim().split('\n').map(line => JSON.parse(line));
                    } else {
                        throw new Error(`不支持的文件格式: ${detectedFormat}`);
                    }
                    
                    if (fieldsToLoad && fieldsToLoad.length > 0) {
                        items = items.map(item => {
                            const filteredItem = {};
                            for (const field of fieldsToLoad) {
                                if (item.hasOwnProperty(field)) {
                                    filteredItem[field] = item[field];
                                }
                            }
                            return filteredItem;
                        });
                    }
                    
                    resolve(items);
                } catch (error) {
                    reject(new Error(`解析URL数据失败 ${url}: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`加载URL失败 ${url}: ${error.message}`));
        });
    });
}

/**
 * 从Cafe Dataset加载数据
 */
async function loadFromDataset(datasetId, cafesdk, fieldsToLoad = null) {
    try {
        const items = await cafesdk.dataset.getData(datasetId);
        
        if (!Array.isArray(items)) {
            throw new Error(`Dataset 应包含数组,但收到 ${typeof items}`);
        }
        
        if (fieldsToLoad && fieldsToLoad.length > 0) {
            return items.map(item => {
                const filteredItem = {};
                for (const field of fieldsToLoad) {
                    if (item.hasOwnProperty(field)) {
                        filteredItem[field] = item[field];
                    }
                }
                return filteredItem;
            });
        }
        
        return items;
    } catch (error) {
        throw new Error(`加载Dataset失败 ${datasetId}: ${error.message}`);
    }
}

/**
 * 确保状态目录存在
 */
async function ensureStateDir() {
    try {
        await fs.mkdir(STATE_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * 保存状态到文件
 */
async function saveState(key, data) {
    await ensureStateDir();
    const filePath = path.join(STATE_DIR, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 从文件加载状态
 */
async function loadState(key) {
    try {
        await ensureStateDir();
        const filePath = path.join(STATE_DIR, `${key}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * 去重逻辑
 */
function dedup({ items, output, fields, dedupSet, nullAsUnique = false }) {
    if (!fields || fields.length === 0) {
        console.log('[DEDUP] 警告: fields 为空，跳过去重');
        return items;
    }

    console.log(`[DEDUP] 开始去重，字段: ${JSON.stringify(fields)}, 数据量: ${items.length}`);
    const outputItems = [];
    let processedCount = 0;

    for (const item of items) {
        const key = fields
            .map((field) => {
                const value = item[field];

                if (nullAsUnique && (value === null || value === undefined)) {
                    return `${Math.random()}`;
                }
                return typeof value === 'object' ? JSON.stringify(value) : value;
            })
            .join('');

        if (processedCount < 3) {
            console.log(`[DEDUP] 数据 #${processedCount}: key="${key}", fields=${JSON.stringify(fields)}`);
            console.log(`[DEDUP] item[${fields[0]}]=${item[fields[0]]}`);
        }
        processedCount++;

        const hasKey = dedupSet.has(key);

        if (output === 'unique-items') {
            if (!hasKey) {
                outputItems.push(item);
            }
        } else if (output === 'duplicate-items') {
            if (hasKey) {
                const enhancedItem = { duplicationKey: key, ...item };
                outputItems.push(enhancedItem);
            }
        }

        if (!hasKey) {
            dedupSet.add(key);
        }
    }

    console.log(`[DEDUP] 完成，去重集大小: ${dedupSet.size}, 输出: ${outputItems.length}`);
    return outputItems;
}

/**
 * 暂停函数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 并发控制 - 实现类似bluebird.map的并发控制
 */
async function mapWithConcurrency(items, mapper, concurrency = 10) {
    const results = [];
    const executing = [];
    
    for (const item of items) {
        const promise = mapper(item).then(result => {
            executing.splice(executing.indexOf(promise), 1);
            return result;
        });
        
        results.push(promise);
        executing.push(promise);
        
        if (executing.length >= concurrency) {
            await Promise.race(executing);
        }
    }
    
    return Promise.all(results);
}

module.exports = {
    parseFilePath,
    loadFromFile,
    loadFromUrl,
    loadFromDataset,
    saveState,
    loadState,
    dedup,
    sleep,
    mapWithConcurrency,
};
