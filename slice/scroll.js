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

            // track number of unique message ids we've seen; Discord only keeps a
            // sliding window of ~120 items in the DOM so the raw item count
            // quickly plateaus.  Instead maintain a set of all ids encountered as
            // we scroll and use its size for progress.
            let seenIds = new Set();
            const scanItems = () => {
                const items = Dom.items();
                for (let i = 0; i < items.length; i++) {
                    const id = items[i] && items[i].getAttribute && items[i].getAttribute('id');
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                    }
                }
            };
            scanItems();
            let seenCount = seenIds.size;

            // helper to read first message id for stall detection/update reasons
            const getFirstId = () => {
                const first = Dom.items()[0];
                return first ? (first.getAttribute('id') || '') : null;
            };
            let lastFirstId = getFirstId();
            lastChange = Date.now();

            UI.showModal('Scrolling…');

            // build status helper including oldest message timestamp
            const updateStatus = () => {
                const count = seenCount; // use number of unique ids seen
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
                        // a DOM mutation occurred; scan for new ids and treat this
                        // as progress so we don't count it as a stall.  the
                        // observer usually fires shortly before or after Discord
                        // updates the list during network fetches.
                        scanItems();
                        const newSeen = seenIds.size;
                        if (newSeen !== seenCount) {
                            seenCount = newSeen;
                            lastChange = Date.now();
                            updateStatus();
                            if (UI.setProgress) {
                                UI.setProgress(Math.min(seenCount / 10000, 1));
                            }
                        }
                        stallCount = 0;

                        const before = scroller.scrollTop;
                        scroller.scrollTop = 0;
                        console.log('observer scroll, before=', before, 'after=', scroller.scrollTop);
                    }
                });
                this._observer.observe(list, { childList: true, subtree: true });
            }

            // direction flag: normally scroll upward; only go downward when stuck
            let directionUp = true;
            let stallCount = 0; // consecutive ticks at top with no progress
            interval = setInterval(() => {
                const before = scroller.scrollTop;
                // normally we always try moving upward; only attempt a downward
                // nudge if we were already moving downward and we're not at the top.
                // this prevents a back‑and‑forth once we hit scrollTop===0.
                if (directionUp || before === 0) {
                    scroller.scrollTop = 0;
                } else {
                    scroller.scrollTop = scroller.scrollHeight;
                }
                // adjust direction based on whether movement occurred
                if (scroller.scrollTop !== before) {
                    // progress occurred (likely upward), reset to upward mode
                    directionUp = true;
                } else {
                    // no change; only flip if we aren't sitting at top
                    if (before !== 0) {
                        directionUp = !directionUp;
                    }
                }
                console.log('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);

                // refresh seenIds before computing progress
                scanItems();
                const count = Dom.items().length;
                const currentFirst = getFirstId();
                const firstChanged = currentFirst && currentFirst !== lastFirstId;
                const newSeenCount = seenIds.size;
                if (newSeenCount !== seenCount || firstChanged) {
                    seenCount = newSeenCount;
                    if (currentFirst) lastFirstId = currentFirst;
                    lastChange = Date.now();
                    updateStatus();
                    if (UI.setProgress) {
                        UI.setProgress(Math.min(seenCount / 10000, 1));
                    }
                    stallCount = 0; // reset stall when progress seen
                } else {
                    // no progress this tick
                    if (Date.now() - lastChange > 10000) {
                        // been scrolling without new messages for 10s; refresh timestamp
                        updateStatus();
                    }
                    if (scroller.scrollTop === before && scroller.scrollTop === 0) {
                        stallCount++;
                    } else {
                        stallCount = 0;
                    }
                }
                if (stallCount >= 3 && Date.now() - lastChange > Config.scrollStallTimeoutMs) {
                    console.log('auto-stop triggered after', stallCount, 'stalls');
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
