 function Scroll(Config, Dom, UI, Log) {
    let interval = null;
    let lastChange = 0;
    let lastCount = 0;
    console.log('Scroll module initialized, file slice/scroll.js');

    return {
        start() {
            const scroller = Dom.scroller();
            console.log('scroll.start invoked, scroller=', scroller);
            if (!scroller) {
                UI.showModal('Scroller not found; cannot scroll.');
                return UI.setStatus('Scroller not found.');
            }

            lastCount = Dom.items().length;
            lastChange = Date.now();

            UI.showModal('Scrolling…');

            interval = setInterval(() => {
                const before = scroller.scrollTop;
                scroller.scrollTop = 0;
                console.log('scroller.scrollTop set to 0, before=', before, 'after=', scroller.scrollTop);

                const count = Dom.items().length;
                if (count !== lastCount) {
                    lastCount = count;
                    lastChange = Date.now();
                    UI.showModal(`Scrolling… ${count} messages seen`);
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
