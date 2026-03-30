const BigSet = require('big-set');
const bluebird = require('bluebird');
const { loadFromFile, dedup, sleep, saveState, loadState } = require('./utils');
const { UPLOAD_SLEEP_MS } = require('./consts');

/**
 * 边加载边去重模式
 */
module.exports = async ({
    inputFiles,
    inputFormat,
    output,
    fields,
    parallelLoads,
    batchSize,
    fieldsToLoad,
    preDedupTransformFn,
    postDedupTransformFn,
    pushState,
    verboseLog,
    customInputData,
    nullAsUnique,
    appendFileSource,
    cafesdk,
}) => {
    const dedupSet = new BigSet();

    // 初始化文件级推送状态
    if (!pushState.files) {
        pushState.files = {};
    }

    let totalLoaded = 0;
    let totalUnique = 0;
    let totalDuplicates = 0;
    let totalPushed = 0;

    const loadStart = Date.now();

    // 并行处理所有文件
    await bluebird.map(inputFiles, async (fileObj) => {
        const filePath = fileObj.url || fileObj;
        const fileKey = filePath.replace(/[^a-zA-Z0-9]/g, '_');

        // 初始化该文件的状态
        if (!pushState.files[fileKey]) {
            pushState.files[fileKey] = { processed: false, pushedCount: 0 };
        }

        // 如果该文件已处理过,跳过
        if (pushState.files[fileKey].processed) {
            if (verboseLog) {
                await cafesdk.log.debug(`文件已处理过,跳过: ${filePath}`);
            }
            return;
        }

        if (verboseLog) {
            await cafesdk.log.debug(`正在加载文件: ${filePath}`);
        }

        let items = await loadFromFile(filePath, inputFormat, fieldsToLoad);

        // 附加文件来源
        if (appendFileSource) {
            items = items.map(item => ({
                ...item,
                __fileSource__: filePath,
            }));
        }

        totalLoaded += items.length;

        // 去重前转换
        items = await preDedupTransformFn(items, { customInputData, fileSource: filePath });

        // 去重
        const outputItems = dedup({ items, output, fields, dedupSet, nullAsUnique });

        // 去重后转换
        const finalItems = await postDedupTransformFn(outputItems, { customInputData, fileSource: filePath });

        totalUnique += dedupSet.size;
        totalDuplicates += (items.length - outputItems.length);

        // 推送数据
        if (output !== 'nothing' && finalItems.length > 0) {
            // 从上次推送的位置继续
            const startIdx = pushState.files[fileKey].pushedCount;
            
            for (let i = startIdx; i < finalItems.length; i += batchSize) {
                const batch = finalItems.slice(i, i + batchSize);

                for (const item of batch) {
                    await cafesdk.result.pushData(item);
                }

                pushState.files[fileKey].pushedCount = i + batch.length;
                totalPushed += batch.length;

                // 保存状态
                await saveState('PUSHED', pushState);

                if (verboseLog) {
                    await cafesdk.log.debug(`[文件 ${filePath}] 已推送 ${i + batch.length}/${finalItems.length} 条`);
                }

                await sleep(UPLOAD_SLEEP_MS);
            }
        }

        // 标记该文件已处理完成
        pushState.files[fileKey].processed = true;
        await saveState('PUSHED', pushState);

        if (verboseLog) {
            await cafesdk.log.info(`文件处理完成: ${filePath} - 加载 ${items.length} 条,输出 ${finalItems.length} 条`);
        }

    }, { concurrency: parallelLoads });

    const loadTime = Math.round((Date.now() - loadStart) / 1000);

    // 统计结果
    await cafesdk.log.info(`处理完成,耗时 ${loadTime} 秒`);
    await cafesdk.log.info(`统计结果:`);
    await cafesdk.log.info(`  - 总计加载: ${totalLoaded} 条`);
    await cafesdk.log.info(`  - 唯一项: ${totalUnique} 条`);
    await cafesdk.log.info(`  - 重复项: ${totalDuplicates} 条`);
    await cafesdk.log.info(`  - 已推送: ${totalPushed} 条`);
};
