 function Scroll(Config, Dom, UI, Log) {
    let interval = null;
    let lastChange = 0;
    let lastCount = 0;

    return {
        start() {
            const scroller = Dom.scroller();
            if (!scroller) return UI.setStatus('Scroller not found.');

            lastCount = Dom.items().length;
            lastChange = Date.now();

            UI.showModal('Scrolling…');

            interval = setInterval(() => {
                const before = scroller.scrollTop;
                scroller.scrollTop = 0;

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
