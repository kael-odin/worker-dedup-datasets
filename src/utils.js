const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const { STATE_DIR } = require('./consts');

// Allow insecure HTTPS connections (required for Cafe proxy environment)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Get proxy configuration
 * Supports Cafe cloud environment (PROXY_AUTH) and standard proxy env vars
 */
function getProxyConfig(targetUrl) {
    // Check Cafe-specific PROXY_AUTH (for cloud environment)
    if (process.env.PROXY_AUTH) {
        return {
            type: 'cafe',
            host: 'proxy-inner.cafescraper.com',
            port: 6000,
            auth: process.env.PROXY_AUTH,
        };
    }

    // Check standard proxy environment variables
    const isHttps = targetUrl.startsWith('https:');
    const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy ||
                     process.env.HTTP_PROXY || process.env.http_proxy ||
                     process.env.ALL_PROXY || process.env.all_proxy;

    if (proxyUrl) {
        try {
            const proxyParsed = new URL(proxyUrl);
            return {
                type: 'standard',
                host: proxyParsed.hostname,
                port: proxyParsed.port || (proxyParsed.protocol === 'https:' ? 443 : 80),
                auth: proxyParsed.username && proxyParsed.password
                    ? `${proxyParsed.username}:${proxyParsed.password}`
                    : null,
            };
        } catch (e) {
            console.warn(`Invalid proxy URL: ${proxyUrl}`);
        }
    }

    return null;
}

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
    
    try {
        const data = await fetchUrl(url);
        
        // 自动检测格式
        let detectedFormat = format;
        if (format === 'json' && url.endsWith('.jsonl')) {
            detectedFormat = 'jsonl';
        } else if (format === 'jsonl' && url.endsWith('.json')) {
            detectedFormat = 'json';
        }
        
        let items;
        if (detectedFormat === 'json') {
            items = typeof data === 'string' ? JSON.parse(data) : data;
            if (!Array.isArray(items)) {
                throw new Error(`JSON 文件应包含数组,但收到 ${typeof items}`);
            }
        } else if (detectedFormat === 'jsonl') {
            const text = typeof data === 'string' ? data : JSON.stringify(data);
            items = text.trim().split('\n').map(line => JSON.parse(line));
        } else {
            throw new Error(`不支持的文件格式: ${detectedFormat}`);
        }
        
        // 仅加载指定字段
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
        throw new Error(`加载URL失败 ${url}: ${error.message}`);
    }
}

/**
 * Fetch URL with proxy support (using HTTP CONNECT for HTTPS)
 */
async function fetchUrl(url, timeout = 30000) {
    const zlib = require('zlib');
    const { promisify } = require('util');
    const tls = require('tls');
    const net = require('net');
    const gunzip = promisify(zlib.gunzip);
    const inflate = promisify(zlib.inflate);
    const brotliDecompress = promisify(zlib.brotliDecompress);

    return new Promise((resolve, reject) => {
        const proxyConfig = getProxyConfig(url);

        const requestHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
        };

        const timeoutId = setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);

        const decompressResponse = async (buffer, encoding) => {
            try {
                switch (encoding) {
                    case 'gzip':
                        return await gunzip(buffer);
                    case 'deflate':
                        return await inflate(buffer);
                    case 'br':
                        return await brotliDecompress(buffer);
                    default:
                        return buffer;
                }
            } catch (err) {
                console.warn(`Decompression failed (${encoding}): ${err.message}`);
                return buffer;
            }
        };

        const handleResponse = async (response) => {
            clearTimeout(timeoutId);
            const chunks = [];

            response.on('data', (chunk) => {
                chunks.push(chunk);
            });

            response.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const encoding = response.headers['content-encoding'];
                    const decompressed = await decompressResponse(buffer, encoding);
                    const data = decompressed.toString('utf8');

                    resolve(data);
                } catch (e) {
                    reject(new Error(`Error processing response: ${e.message}`));
                }
            });

            response.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        };

        const handleError = (err) => {
            clearTimeout(timeoutId);
            reject(err);
        };

        if (proxyConfig) {
            const { type, host, port, auth } = proxyConfig;
            
            console.log(`[PROXY] Using proxy ${host}:${port} (${type}) for ${url}`);

            const targetUrl = new URL(url);
            const isHttps = targetUrl.protocol === 'https:';

            const proxyReq = http.request({
                host: host,
                port: port,
                method: 'CONNECT',
                path: `${targetUrl.hostname}:${targetUrl.port || (isHttps ? 443 : 80)}`,
                headers: auth ? {
                    'Proxy-Authorization': `Basic ${Buffer.from(auth).toString('base64')}`,
                } : {},
            });

            proxyReq.on('connect', (proxyRes, socket) => {
                if (proxyRes.statusCode !== 200) {
                    clearTimeout(timeoutId);
                    reject(new Error(`Proxy CONNECT failed with status ${proxyRes.statusCode}`));
                    return;
                }

                console.log(`[PROXY] CONNECT successful for ${targetUrl.hostname}`);

                if (isHttps) {
                    const tlsOptions = {
                        socket: socket,
                        servername: targetUrl.hostname,
                        rejectUnauthorized: false,
                        ALPNProtocols: ['http/1.1'],
                    };

                    const tlsSocket = tls.connect(tlsOptions);

                    const tlsTimeout = setTimeout(() => {
                        tlsSocket.destroy();
                        handleError(new Error('TLS handshake timeout'));
                    }, 10000);

                    tlsSocket.on('secureConnect', () => {
                        clearTimeout(tlsTimeout);
                        console.log(`[PROXY] TLS handshake successful`);

                        const request = https.get({
                            hostname: targetUrl.hostname,
                            port: targetUrl.port || 443,
                            path: `${targetUrl.pathname}${targetUrl.search}`,
                            headers: requestHeaders,
                            createConnection: () => tlsSocket,
                        }, handleResponse);

                        request.on('error', handleError);
                    });

                    tlsSocket.on('error', (err) => {
                        clearTimeout(tlsTimeout);
                        handleError(err);
                    });
                } else {
                    const request = http.get({
                        hostname: targetUrl.hostname,
                        port: targetUrl.port || 80,
                        path: `${targetUrl.pathname}${targetUrl.search}`,
                        headers: requestHeaders,
                        createConnection: () => socket,
                    }, handleResponse);

                    request.on('error', handleError);
                }
            });

            proxyReq.on('error', (err) => {
                console.error(`[PROXY] CONNECT error: ${err.message}`);
                handleError(err);
            });

            proxyReq.end();
        } else {
            console.log('[PROXY] No proxy configured, direct request');
            const protocol = url.startsWith('https:') ? https : http;
            const req = protocol.get(
                url,
                {
                    headers: requestHeaders,
                    timeout: timeout,
                },
                handleResponse
            );
            req.on('error', handleError);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        }
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
