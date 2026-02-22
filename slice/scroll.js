 function Scroll(Config, Dom, UI, Log) {
    let interval = null;
    let lastChange = 0;
    let lastCount = 0;
    console.log('Scroll module initialized, file slice/scroll.js');

    return {
        start() {
            let scroller = Dom.scroller();
            console.log('scroll.start invoked, scroller=', scroller);
            if (!scroller) {
                UI.showModal('Scroller not found; cannot scroll.');
                return UI.setStatus('Scroller not found.');
            }

            // locate first ancestor that actually overflows; this is the
            // element through which Discord implements scrolling.
            let candidate = scroller;
            while (candidate && candidate.scrollHeight <= candidate.clientHeight) {
                candidate = candidate.parentElement;
            }
            if (candidate && candidate !== scroller) {
                scroller = candidate;
                console.log('using ancestor scroller', scroller);
            }

            lastCount = Dom.items().length;
            // helper to read first message id
            const getFirstId = () => {
                const first = Dom.items()[0];
                return first ? (first.getAttribute('id') || '') : null;
            };
            // initialize maxCount with current value
            let maxCount = lastCount;
            // track id of first message so we can detect real progress
            let lastFirstId = getFirstId();
            lastChange = Date.now();

            UI.showModal('Scrolling…');

            // build status helper including oldest message timestamp
            const updateStatus = () => {
                const count = maxCount; // use monotonic highest seen
                let ts = 'unknown';
                const first = Dom.items()[0];
                if (first) {
                    if (typeof first.querySelector === 'function') {
                        const t = first.querySelector('time');
                        if (t && t.dateTime) ts = new Date(t.dateTime).toLocaleString();
                    } else if (first.getAttribute) {
                        // try to read a datetime attribute if present
                        const dt = first.getAttribute('datetime') || first.getAttribute('data-datetime');
                        if (dt) ts = new Date(dt).toLocaleString();
                    }
                }
                UI.setStatus(`Scrolling… ${count} messages seen (oldest ${ts})`);
            };

            // show the first status immediately so the panel isn't blank
            updateStatus();

            // use an observer to trigger immediate scrolling when new items arrive
            const list = Dom.list();
            if (list) {
                this._observer = new MutationObserver(muts => {
                    if (interval) {
                        // when messages appear, try scrolling up again immediately
                        const before = scroller.scrollTop;
                        scroller.scrollTop = 0;
                        console.log('observer scroll, before=', before, 'after=', scroller.scrollTop);
                    }
                });
                this._observer.observe(list, { childList: true, subtree: true });
            }

            // direction flag: normally scroll upward; only go downward when stuck
            let directionUp = true;
            interval = setInterval(() => {
                const before = scroller.scrollTop;
                if (directionUp) {
                    scroller.scrollTop = 0;
                } else {
                    scroller.scrollTop = scroller.scrollHeight;
                }
                // adjust direction based on whether movement occurred
                if (scroller.scrollTop !== before) {
                    // resumed progress toward top
                    directionUp = true;
                } else {
                    // no change; flip direction for next tick so we nudge bottom
                    directionUp = !directionUp;
                }
                console.log('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);

                const count = Dom.items().length;
                const currentFirst = getFirstId();
                const firstChanged = currentFirst && currentFirst !== lastFirstId;
                if (count !== lastCount || firstChanged) {
                    lastCount = count;
                    if (count > maxCount) maxCount = count;
                    if (currentFirst) lastFirstId = currentFirst;
                    lastChange = Date.now();
                    updateStatus();
                    if (UI.setProgress) {
                        UI.setProgress(Math.min(maxCount / 10000, 1));
                    }
                } else if (Date.now() - lastChange > 10000) {
                    // been scrolling without new messages for 10s; refresh timestamp
                    updateStatus();
                }

                // only consider ourselves done when the scrollTop has not
                // changed _and_ we are already at the top of the container, and
                // the first message hasn't shifted in a while.
                if (scroller.scrollTop === before &&
                    Date.now() - lastChange > Config.scrollStallTimeoutMs &&
                    scroller.scrollTop === 0) {
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
            UI.hideModal();
            UI.setStatus(auto ? 'Reached top. Extracting…' : 'Stopped.');
            UI.enableSave();
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scroll;
}
