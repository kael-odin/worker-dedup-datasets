/**
 * 常量定义
 */

const MODES = {
    DEDUP_AFTER_LOAD: 'dedup-after-load',
    DEDUP_AS_LOADING: 'dedup-as-loading',
};

const UPLOAD_SLEEP_MS = 100; // 每次推送后暂停 100ms

const STATE_DIR = '/tmp/dedup-worker-state';

module.exports = {
    MODES,
    UPLOAD_SLEEP_MS,
    STATE_DIR,
};
