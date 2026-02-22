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
            lastChange = Date.now();

            UI.showModal('Scrolling…');

            // build status helper including oldest message timestamp
            const updateStatus = () => {
                const count = Dom.items().length;
                let ts = 'unknown';
                const first = Dom.items()[0];
                if (first) {
                    const t = first.querySelector('time');
                    if (t && t.dateTime) ts = new Date(t.dateTime).toLocaleString();
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
                if (count !== lastCount) {
                    lastCount = count;
                    lastChange = Date.now();
                    updateStatus();
                } else if (Date.now() - lastChange > 10000) {
                    // been scrolling without new messages for 10s; refresh timestamp
                    updateStatus();
                }

                if (scroller.scrollTop === before &&
                    Date.now() - lastChange > Config.scrollStallTimeoutMs) {
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
