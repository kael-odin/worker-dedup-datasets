/**
 * Cafe SDK 本地模拟器
 * 用于本地开发和测试
 */

const fs = require('fs').promises;
const path = require('path');

class MockSDK {
    constructor() {
        this.outputFile = path.join(__dirname, 'outputs', 'results.json');
        this.logFile = path.join(__dirname, 'outputs', 'logs.txt');
        this.init();
    }

    async init() {
        const outputDir = path.dirname(this.outputFile);
        await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
    }

    parameter = {
        async getInputJSONObject() {
            // 从环境变量或测试文件读取
            const inputFile = process.env.INPUT_FILE || path.join(__dirname, 'test-input.json');
            try {
                const content = await fs.readFile(inputFile, 'utf-8');
                return JSON.parse(content);
            } catch (error) {
                console.warn(`无法读取输入文件 ${inputFile},使用空对象`);
                return {};
            }
        }
    };

    result = {
        pushData: async (item) => {
            await this.init();
            
            // 读取现有数据
            let results = [];
            try {
                const content = await fs.readFile(this.outputFile, 'utf-8');
                results = JSON.parse(content);
            } catch (error) {
                // 文件不存在,创建新数组
            }

            // 添加新数据
            results.push(item);

            // 保存
            await fs.writeFile(this.outputFile, JSON.stringify(results, null, 2), 'utf-8');
        },

        setTableHeader: async (headers) => {
            console.log('[Table Header]', JSON.stringify(headers, null, 2));
        }
    };

    log = {
        debug: async (message) => {
            console.log(`[DEBUG] ${message}`);
            await this._writeLog('DEBUG', message);
        },

        info: async (message) => {
            console.log(`[INFO] ${message}`);
            await this._writeLog('INFO', message);
        },

        warning: async (message) => {
            console.warn(`[WARNING] ${message}`);
            await this._writeLog('WARNING', message);
        },

        error: async (message) => {
            console.error(`[ERROR] ${message}`);
            await this._writeLog('ERROR', message);
        }
    };

    async _writeLog(level, message) {
        await this.init();
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level}] ${message}\n`;
        await fs.appendFile(this.logFile, logLine, 'utf-8').catch(() => {});
    }
}

module.exports = new MockSDK();
