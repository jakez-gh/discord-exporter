 function UI(Config, Log) {
    return {
        init(callbacks) {
            // allow caller to pass in a DOM helper if available so we can
            // wait for messages before marking ready
            this.cb = callbacks;
            this.dom = callbacks.dom;
            this.injectStyles();
            this.createPanel();
            this.makeDraggable();

            // start with a tentative message and poll until we see content *and* things quiet down
            let lastLog = 0;
            const origLog = console.log;
            console.log = (...args) => {
                lastLog = Date.now();
                origLog.apply(console, args);
            };

            const check = () => {
                let count = 0;
                if (this.dom) {
                    count = this.dom.items().length;
                }
                const now = Date.now();
                if (count > 0 && now - lastLog >= 500) {
                    // restore original log
                    console.log = origLog;
                    this.setStatus('Ready.');
                } else {
                    this.setStatus(`Waiting for chat messages (${count} seen)…`);
                    setTimeout(check, 500);
                }
            };
            check();
        },

        createPanel() {
            const panel = document.createElement('div');
            panel.id = Config.ui.panelId;
            panel.innerHTML = `
                <div style="font-size:12px; margin-bottom:4px;">
                    Discord chat exporter (Tampermonkey script by Ben)
                </div>
                <button id="dmexp-start">Start</button>
                <button id="dmexp-stop">Stop</button>
                <button id="dmexp-save-txt" disabled>Save TXT</button>
                <button id="dmexp-save-json" disabled>Save JSON</button>
                <div id="${Config.ui.statusId}"></div>
                <div id="${Config.ui.progressId}" style="width:100%;background:#444;margin-top:4px;">
                    <div id="${Config.ui.progressBarId}" style="width:0%;height:6px;background:#0f0;transition:width 0.2s;"></div>
                </div>
            `;
            document.body.appendChild(panel);

            document.getElementById('dmexp-start').onclick = this.cb.onStart;
            document.getElementById('dmexp-stop').onclick = this.cb.onStop;
            document.getElementById('dmexp-save-txt').onclick = this.cb.onSaveTxt;
            document.getElementById('dmexp-save-json').onclick = this.cb.onSaveJson;
        },

        setStatus(msg) {
            document.getElementById(Config.ui.statusId).textContent = msg;
        },
        injectStyles() {
            const css = `
#${Config.ui.panelId} {
    position: fixed;
    right: 10px;
    bottom: 10px;
    background-color: rgba(0, 123, 255, 0.9);
    color: white;
    padding: 8px;
    border-radius: 8px;
    z-index: 10000;
    font-family: Arial, sans-serif;
}
#${Config.ui.panelId} button {
    margin: 2px;
    padding: 4px 8px;
    background-color: #ffc107;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
#${Config.ui.panelId} #${Config.ui.statusId} {
    margin-top: 4px;
    font-size: 12px;
}
.dmexp-header-button {
    position: fixed;
    top: 80px;
    right: 20px;
    background-color: #28a745;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    z-index: 10001;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
}
`;
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        },
        // modal overlay for status updates
        showModal(msg) {
            let m = document.getElementById('dmexp-modal');
            if (!m) {
                m = document.createElement('div');
                m.id = 'dmexp-modal';
                m.style = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                          'background:rgba(0,0,0,0.5);display:flex;' +
                          'align-items:center;justify-content:center;z-index:10002;';
                const inner = document.createElement('div');
                inner.id = 'dmexp-modal-text';
                inner.style = 'background:white;padding:20px;border-radius:8px;max-width:80%;';
                m.appendChild(inner);
                document.body.appendChild(m);
            }
            document.getElementById('dmexp-modal-text').textContent = msg;
            m.style.display = 'flex';
        },
        hideModal() {
            const m = document.getElementById('dmexp-modal');
            if (m) m.style.display = 'none';
        },
        enableSave() {
            document.getElementById('dmexp-save-txt').disabled = false;
            document.getElementById('dmexp-save-json').disabled = false;
        },
        setProgress(frac) {
            const bar = document.getElementById(Config.ui.progressBarId);
            if (bar) {
                bar.style.width = `${Math.floor(frac * 100)}%`;
            }
        },
        makeDraggable() {
            const panel = document.getElementById(Config.ui.panelId);
            let isDown = false;
            let offset = [0,0];
            panel.addEventListener('mousedown', function(e) {
                isDown = true;
                // remove right/bottom anchors so left/top moves the box instead of
                // causing it to resize due to conflicting constraints
                panel.style.right = '';
                panel.style.bottom = '';
                offset = [panel.offsetLeft - e.clientX, panel.offsetTop - e.clientY];
            }, true);
            document.addEventListener('mouseup', function() {
                isDown = false;
            }, true);
            document.addEventListener('mousemove', function(event) {
                event.preventDefault();
                if (isDown) {
                    panel.style.left = (event.clientX + offset[0]) + 'px';
                    panel.style.top  = (event.clientY + offset[1]) + 'px';
                }
            }, true);
        }
    };
}

// support CommonJS in tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
