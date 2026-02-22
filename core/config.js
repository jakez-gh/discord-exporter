function Config() {
    return {
        scrollIntervalMs: 900,
        scrollStallTimeoutMs: 8000,
        ui: {
            panelId: 'dmexp-panel',
            statusId: 'dmexp-status',
            progressId: 'dmexp-progress',
            progressBarId: 'dmexp-progress-bar',
        }
    };
}

// support CommonJS require for tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
