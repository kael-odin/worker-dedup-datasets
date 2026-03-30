const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { STATE_DIR } = require('./consts');

/**
 * 解析输入文件路径
 */
function parseFilePath(urlOrPath) {
    // 支持 file:/// 协议
    if (urlOrPath.startsWith('file:///')) {
        // Windows: file:///C:/path -> C:/path
        // Unix: file:///path -> /path
        let path = urlOrPath.replace('file:///', '');
        
        // Windows特殊处理: 检查是否是盘符路径 (如 d:/ 或 C:/)
        if (process.platform === 'win32' && /^[a-zA-Z]:/.test(path)) {
            return path; // 返回 d:/path 或 C:/path
        }
        
        // Unix系统或其他情况
        return '/' + path;
    }
    // 支持相对路径和绝对路径
    return urlOrPath;
}

/**
 * 从文件加载数据
 */
async function loadFromFile(filePath, format = 'json', fieldsToLoad = null) {
    const absolutePath = parseFilePath(filePath);
    
    try {
        const content = await fs.readFile(absolutePath, 'utf-8');
        
        // 自动检测格式(基于文件扩展名)
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
        
        // 如果指定了要加载的字段,则过滤
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
 * 从网络URL加载数据
 */
async function loadFromUrl(url, format = 'json', fieldsToLoad = null) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    // 自动检测格式(基于URL扩展名)
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
                    
                    // 如果指定了要加载的字段,则过滤
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
        // 使用Cafe SDK从Dataset加载数据
        const items = await cafesdk.dataset.getData(datasetId);
        
        if (!Array.isArray(items)) {
            throw new Error(`Dataset 应包含数组,但收到 ${typeof items}`);
        }
        
        // 如果指定了要加载的字段,则过滤
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
        // 目录已存在,忽略错误
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
            // 文件不存在,返回 null
            return null;
        }
        throw error;
    }
}

/**
 * 去重逻辑
 */
function dedup({ items, output, fields, dedupSet, nullAsUnique = false }) {
    // 如果没有提供字段,不进行去重
    if (!fields || fields.length === 0) {
        return items;
    }

    const outputItems = [];
    for (const item of items) {
        const key = fields
            .map((field) => {
                const value = item[field];

                if (nullAsUnique && (value === null || value === undefined)) {
                    return `${Math.random()}`; // null 值视为唯一
                }
                // 深度比较对象和数组
                return typeof value === 'object' ? JSON.stringify(value) : value;
            })
            .join('');
        
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

    return outputItems;
}

/**
 * 暂停函数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
};
