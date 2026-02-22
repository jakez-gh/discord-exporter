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

            let flip = false;
            interval = setInterval(() => {
                const before = scroller.scrollTop;
                if (flip) {
                    scroller.scrollTop = scroller.scrollHeight;
                } else {
                    scroller.scrollTop = 0;
                }
                flip = !flip;
                console.log('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop);

                const count = Dom.items().length;
                if (count !== lastCount) {
                    lastCount = count;
                    lastChange = Date.now();
                    UI.showModal(`Scrolling… ${count} messages seen`);
                    UI.setStatus(`Scrolling… ${count} messages seen`);
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
            UI.hideModal();
            UI.setStatus(auto ? 'Reached top. Extracting…' : 'Stopped.');
            UI.enableSave();
        }
    };
}
