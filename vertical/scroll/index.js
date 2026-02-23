// vertical/scroll/index.js
// core scrolling logic divorced from any UI concerns.
// notifies progress/status/log via communicator.

function Scroll(Config, Dom, comm, Log) {
    // same implementation as before but ensure no UI references remain.
    let interval = null;
    let lastChange = 0;
    let lastCount = 0;
    let seenIds = new Set();
    let seenOrder = [];
    // listeners for each message id encountered
    const messageListeners = [];
    if (comm) comm.notifyLog('Scroll module initialized, file vertical/scroll/index.js');
    else console.log('Scroll module initialized, file vertical/scroll/index.js');

    return {
        // register a listener invoked with (id, element)
        onMessage(fn) {
            if (typeof fn === 'function') messageListeners.push(fn);
        },
        start() {
            let scroller = Dom.scroller();
            if (comm) comm.notifyLog('scroll.start invoked, scroller=', scroller);
            else console.log('scroll.start invoked, scroller=', scroller);
            if (!scroller) {
                const err = 'Scroller not found; cannot scroll.';
                if (comm) comm.notifyStatus(err);
                else console.error(err);
                return;
            }

            let candidate = scroller;
            while (candidate && candidate.scrollHeight <= candidate.clientHeight) {
                candidate = candidate.parentElement;
            }
            if (candidate && candidate !== scroller) {
                scroller = candidate;
                if (comm) comm.notifyLog('using ancestor scroller', scroller);
                else console.log('using ancestor scroller', scroller);
            }

            seenIds.clear();
            seenOrder.length = 0;
            lastCount = 0;

            const scanItems = () => {
                const items = Dom.items();
                for (let i = 0; i < items.length; i++) {
                    const id = items[i] && items[i].getAttribute && items[i].getAttribute('id');
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                        seenOrder.push(id);
                        // notify listeners about the new message
                        messageListeners.forEach(fn => {
                            try { fn(id, items[i]); } catch (e) { /* swallow listener errors */ }
                        });
                    }
                }
            };
            scanItems();
            lastCount = seenOrder.length;

            const getFirstId = () => {
                const first = Dom.items()[0];
                return first ? (first.getAttribute('id') || '') : null;
            };
            let lastFirstId = getFirstId();
            lastChange = Date.now();

            const initialMsg = 'Scrolling…';
            if (comm) comm.notifyStatus(initialMsg);
            else console.log(initialMsg);

            const updateStatus = () => {
                const count = seenOrder.length;
                let ts = 'unknown';
                const first = Dom.items()[0];
                if (first) {
                    if (typeof first.querySelector === 'function') {
                        const t = first.querySelector('time');
                        if (t && t.dateTime) ts = new Date(t.dateTime).toLocaleString();
                    } else if (first.getAttribute) {
                        const dt = first.getAttribute('datetime') || first.getAttribute('data-datetime');
                        if (dt) ts = new Date(dt).toLocaleString();
                    }
                }
                const msg = `Scrolling… ${count} messages seen (oldest ${ts})`;
                if (comm) comm.notifyStatus(msg);
                else console.log(msg);
            };
            updateStatus();

            const list = Dom.list();
            if (list) {
                this._observer = new MutationObserver(muts => {
                    if (interval) {
                        scanItems();
                        const newSeen = seenOrder.length;
                        if (newSeen !== lastCount) {
                            lastCount = newSeen;
                            lastChange = Date.now();
                            updateStatus();
                            const prog = Math.min(newSeen / 10000, 1);
                            if (comm) comm.notifyProgress(prog);
                            else console.log('progress', prog);
                        }
                        stallCount = 0;

                        const before = scroller.scrollTop;
                        scroller.scrollTop = 0;
                        if (comm) comm.notifyLog('observer scroll, before=', before, 'after=', scroller.scrollTop);
                        else console.log('observer scroll, before=', before, 'after=', scroller.scrollTop);
                    }
                });
                this._observer.observe(list, { childList: true, subtree: true });
            }

            let directionUp = true;
            let stallCount = 0;
            interval = setInterval(() => {
                const before = scroller.scrollTop;
                if (directionUp || before === 0) {
                    scroller.scrollTop = 0;
                } else {
                    scroller.scrollTop = scroller.scrollHeight;
                }
                if (scroller.scrollTop !== before) {
                    directionUp = true;
                } else {
                    if (before !== 0) directionUp = !directionUp;
                }
                if (comm) comm.notifyLog('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);
                else console.log('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);

                scanItems();
                const currentFirst = getFirstId();
                const firstChanged = currentFirst && currentFirst !== lastFirstId;
                const newSeenCount = seenOrder.length;
                if (newSeenCount !== lastCount || firstChanged) {
                    lastCount = newSeenCount;
                    if (currentFirst) lastFirstId = currentFirst;
                    lastChange = Date.now();
                    updateStatus();
                    const prog = Math.min(newSeenCount / 10000, 1);
                    if (comm) comm.notifyProgress(prog);
                    else console.log('progress', prog);
                    stallCount = 0;
                } else {
                    if (Date.now() - lastChange > 10000) {
                        updateStatus();
                    }
                    if (scroller.scrollTop === before && scroller.scrollTop === 0) {
                        stallCount++;
                    } else {
                        stallCount = 0;
                    }
                }
                if (stallCount >= 3 && Date.now() - lastChange > Config.scrollStallTimeoutMs) {
                    if (comm) comm.notifyLog('auto-stop triggered after', stallCount, 'stalls');
                    else console.log('auto-stop triggered after', stallCount, 'stalls');
                    this.stop(true);
                }
            }, Config.scrollIntervalMs);
        },

        stop(auto) {
            clearInterval(interval);
            interval = null;
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
            const finalMsg = auto ? 'Reached top. Extracting…' : 'Stopped.';
            if (comm) comm.notifyStatus(finalMsg);
            else console.log(finalMsg);
            // notify any stop listeners
            _stopListeners.forEach(fn => fn(auto));
            // note: enabling save and hiding modal are UI concerns; communicator
            // clients (e.g. the UI layer) should implement those responses.
        },

        getSeenOrder() {
            return seenOrder.slice();
        },

        // observers for external code
        onMessage(fn) { _messageListeners.push(fn); },
        onStop(fn) { _stopListeners.push(fn); }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scroll;
}