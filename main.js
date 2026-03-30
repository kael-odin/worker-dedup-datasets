/**
 * Dedup Datasets Worker - 主入口
 *
 * 功能: 从多个 JSON/JSONL 文件加载数据,基于字段组合去重,支持自定义转换函数
 * 平台: CafeScraper
 * 版本: v1.0.0
 */

const dedupAfterLoadFn = require('./src/dedup-after-load');
const dedupAsLoadingFn = require('./src/dedup-as-loading');
const { loadState, saveState, parseFilePath } = require('./src/utils');
const { MODES } = require('./src/consts');

const { DEDUP_AFTER_LOAD, DEDUP_AS_LOADING } = MODES;

// SDK 代理 - 自动适配本地和云端环境
let cafesdk;
if (process.env.LOCAL_DEV === '1') {
    // 本地开发环境
    cafesdk = require('./sdk_local');
} else {
    // 云端环境 - 使用真实的 Cafe SDK
    cafesdk = require('./sdk');
}

async function main() {
    try {
        // 获取输入参数
        const inputJson = await cafesdk.parameter.getInputJSONObject();
        await cafesdk.log.debug('输入参数 / Input Parameters:');
        await cafesdk.log.debug(JSON.stringify(inputJson, null, 2));

        // 解析输入参数
        let {
            dataSourceType,
            inputData = '[]',
            inputUrls = [],
            inputFiles = [], // 向后兼容旧参数
            datasetIds = [],
            inputFormat = 'json',
            fields = [],
            output = 'unique-items',
            mode = DEDUP_AFTER_LOAD,
            fieldsToLoad = [],
            preDedupTransformFunction = 'async (items) => items',
            postDedupTransformFunction = 'async (items) => items',
            customInputData = '{}',
            nullAsUnique = false,
            parallelLoads = 10,
            parallelPushes = 5,
            batchSize = 5000,
            appendFileSource = false,
            verboseLog = false,
        } = inputJson;

        // 向后兼容：如果提供了 inputFiles 但没有 dataSourceType，自动推断
        if (!dataSourceType) {
            if (inputFiles && inputFiles.length > 0) {
                // 将 inputFiles 转换为 inputUrls
                inputUrls = inputFiles.map(f => ({ url: f.url || f }));
                dataSourceType = 'network-url';
                await cafesdk.log.info('检测到旧格式参数 inputFiles，已自动转换为 network-url 模式');
            } else if (parsedInputData && parsedInputData.length > 0) {
                dataSourceType = 'direct-input';
            } else {
                dataSourceType = 'direct-input';
            }
        }

        // 解析 JSON 字符串字段
        let parsedInputData;
        let parsedCustomInputData;
        
        try {
            // 处理空字符串或未定义的情况
            if (!inputData || inputData.trim() === '') {
                parsedInputData = [];
            } else {
                parsedInputData = typeof inputData === 'string' ? JSON.parse(inputData) : inputData;
                if (!Array.isArray(parsedInputData)) {
                    throw new Error('inputData 必须是 JSON 数组格式');
                }
            }
        } catch (error) {
            throw new Error(`解析 inputData 失败: ${error.message}。请确保是有效的 JSON 数组格式，例如: [{"id": 1}]`);
        }

        try {
            // 处理空字符串或未定义的情况
            if (!customInputData || customInputData.trim() === '') {
                parsedCustomInputData = {};
            } else {
                parsedCustomInputData = typeof customInputData === 'string' ? JSON.parse(customInputData) : customInputData;
                if (typeof parsedCustomInputData !== 'object' || Array.isArray(parsedCustomInputData)) {
                    throw new Error('customInputData 必须是 JSON 对象格式');
                }
            }
        } catch (error) {
            throw new Error(`解析 customInputData 失败: ${error.message}。请确保是有效的 JSON 对象格式，例如: {"minPrice": 100}`);
        }

        // 处理 stringList 字段格式(平台会将单项展开或保持对象数组)
        let parsedFields = fields;
        if (!Array.isArray(fields)) {
            // 单项展开情况：fields 字段消失，string 出现在顶层
            if (inputJson.string) {
                parsedFields = [inputJson.string];
            } else {
                parsedFields = [];
            }
        } else {
            // 正常情况：fields 是对象数组 [{ string: "id" }]
            parsedFields = fields.map(item => {
                if (typeof item === 'object' && item.string) {
                    return item.string;
                }
                return item;
            });
        }

        await cafesdk.log.debug(`解析后的去重字段: ${JSON.stringify(parsedFields)}`);

        let parsedFieldsToLoad = fieldsToLoad;
        if (!Array.isArray(fieldsToLoad)) {
            if (inputJson.string) {
                parsedFieldsToLoad = [inputJson.string];
            } else {
                parsedFieldsToLoad = [];
            }
        } else {
            parsedFieldsToLoad = fieldsToLoad.map(item => {
                if (typeof item === 'object' && item.string) {
                    return item.string;
                }
                return item;
            });
        }

        // 处理 datasetIds 的 stringList 格式
        let parsedDatasetIds = datasetIds;
        if (!Array.isArray(datasetIds)) {
            if (inputJson.string) {
                // 单项展开情况
                parsedDatasetIds = [inputJson.string];
            } else {
                parsedDatasetIds = [];
            }
        } else {
            parsedDatasetIds = datasetIds.map(item => {
                if (typeof item === 'object' && item.string) {
                    return item.string;
                }
                return item;
            });
        }

        // 验证数据源
        if (dataSourceType === 'direct-input') {
            if (!parsedInputData || parsedInputData.length === 0) {
                throw new Error('直接输入数据模式: 必须提供 inputData (JSON数组)');
            }
            await cafesdk.log.info(`数据来源: 直接输入 (${parsedInputData.length} 条数据)`);
        } else if (dataSourceType === 'network-url') {
            if (!inputUrls || inputUrls.length === 0) {
                throw new Error('网络URL模式: 必须提供至少一个 URL');
            }
            await cafesdk.log.info(`数据来源: 网络URL (${inputUrls.length} 个文件)`);
        } else if (dataSourceType === 'cafe-dataset') {
            if (!parsedDatasetIds || parsedDatasetIds.length === 0) {
                throw new Error('Cafe Dataset模式: 必须提供至少一个 Dataset ID');
            }
            await cafesdk.log.info(`数据来源: Cafe Dataset (${parsedDatasetIds.length} 个数据集)`);
        } else {
            throw new Error(`不支持的数据来源类型: ${dataSourceType}`);
        }

        // 限制参数范围
        if (batchSize > 50000) {
            await cafesdk.log.warning('batchSize 最大为 50000,已自动调整');
            batchSize = Math.min(batchSize, 50000);
        }

        if (mode === DEDUP_AS_LOADING && parallelPushes > 1) {
            await cafesdk.log.warning('边加载边去重模式下 parallelPushes 固定为 1');
            parallelPushes = 1;
        }

        // 转换函数
        const preDedupTransformFn = eval(preDedupTransformFunction);
        const postDedupTransformFn = eval(postDedupTransformFunction);

        // 加载之前的状态(用于断点续传)
        const pushState = (await loadState('PUSHED')) || {};

        // 定期保存状态
        const stateInterval = setInterval(async () => {
            await saveState('PUSHED', pushState);
        }, 15000);

        try {
            const context = {
                dataSourceType,
                inputData: parsedInputData,
                inputUrls,
                datasetIds: parsedDatasetIds,
                inputFormat,
                output,
                fields: parsedFields,
                parallelLoads,
                parallelPushes,
                batchSize,
                fieldsToLoad: parsedFieldsToLoad.length > 0 ? parsedFieldsToLoad : null,
                preDedupTransformFn,
                postDedupTransformFn,
                pushState,
                verboseLog,
                customInputData: parsedCustomInputData,
                nullAsUnique,
                appendFileSource,
                cafesdk,
            };

            // 根据模式选择处理方式
            if (mode === DEDUP_AFTER_LOAD) {
                await cafesdk.log.info('使用模式: 先加载后去重');
                await dedupAfterLoadFn(context);
            } else if (mode === DEDUP_AS_LOADING) {
                await cafesdk.log.info('使用模式: 边加载边去重');
                await dedupAsLoadingFn(context);
            } else {
                throw new Error(`不支持的模式: ${mode}`);
            }

            // 最终保存状态
            await saveState('PUSHED', pushState);
            
            await cafesdk.log.info('处理完成!');

        } finally {
            clearInterval(stateInterval);
        }

    } catch (error) {
        await cafesdk.log.error(`执行失败: ${error.message}`);
        await cafesdk.log.error(error.stack);
        throw error;
    }
}

// 执行主函数
main().catch(error => {
    console.error('Worker 执行失败:', error);
    process.exit(1);
});
