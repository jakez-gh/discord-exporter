// horizontal/comm/index.js
// simple publish/subscribe helper for user-facing messages.  Other modules
// such as scroll and save call the notify* methods when they want to share
// progress, status updates, or log events; UI components register listeners
// so they can update the DOM accordingly without being tightly coupled.

function Comm(Log) {
    const statusListeners = [];
    const progressListeners = [];
    const logListeners = [];

    return {
        notifyStatus(msg) {
            Log && Log('Status update:', msg);
            statusListeners.forEach(fn => fn(msg));
        },
        notifyProgress(frac) {
            progressListeners.forEach(fn => fn(frac));
        },
        notifyLog(...args) {
            Log && Log(...args);
            logListeners.forEach(fn => fn(...args));
        },
        onStatus(fn) { statusListeners.push(fn); },
        onProgress(fn) { progressListeners.push(fn); },
        onLog(fn) { logListeners.push(fn); }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Comm;
}