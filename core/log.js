function Log() {
    return {
        info: (...a) => console.log('[DMEXP]', ...a),
        warn: (...a) => console.warn('[DMEXP]', ...a),
        error: (...a) => console.error('[DMEXP]', ...a),
    };
}
