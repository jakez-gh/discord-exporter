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

            // if the element we grabbed isn't actually scrollable yet try to
            // find a deeper container that is.
            if (scroller.scrollHeight <= scroller.clientHeight) {
                const deeper = scroller.querySelector('[class*="scroller"]');
                if (deeper && deeper.scrollHeight > deeper.clientHeight) {
                    scroller = deeper;
                    console.log('using deeper scroller', scroller);
                }
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
