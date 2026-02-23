// horizontal/ui/index.js
// High-level UI glue that wires panel and modal features together and
// subscribes to the communicator.  This file contains all DOM-related
// behavior so vertical slices remain UI-agnostic.

const Panel = require('../panel');

function UI(Config, Log, comm) {
    // panel instance created during init; stores DOM references internally
    let panel;

    return {
        init(callbacks) {
            // allow caller to pass in a DOM helper if available so we can
            // wait for messages before declaring ready
            this.cb = callbacks;
            this.dom = callbacks.dom;

            // delegate panel responsibilities to a dedicated module
            panel = Panel(Config);
            panel.init(callbacks);

            // subscribe to communicator for updates; UI merely relays to panel and
            // modal—no other code needs to know about DOM details.
            if (comm) {
                comm.onStatus(msg => {
                    if (panel) panel.setStatus(msg);
                    // ensure modal sync as before
                    const modalText = document.getElementById('dmexp-modal-text');
                    const modal = document.getElementById('dmexp-modal');
                    if (modal && modal.style.display !== 'none' && modalText) {
                        modalText.textContent = msg;
                    }
                });
                comm.onProgress(frac => {
                    if (panel) panel.setProgress(frac);
                });
                comm.onLog((...args) => {
                    // echo logs to console as previously
                    console.log(...args);
                });
            }

            // start with a tentative message and poll until we see content *and* things quiet down
            // (old log-wrapping check removed since communicator handles logging)
            const check = () => {
                let count = 0;
                if (this.dom) {
                    count = this.dom.items().length;
                }
                if (count > 0) {
                    this.setStatus('Ready.');
                } else {
                    this.setStatus(`Waiting for chat messages (${count} seen)…`);
                    setTimeout(check, 500);
                }
            };
            check();
        },

        setStatus(msg) {
            if (panel) panel.setStatus(msg);
            if (comm) comm.notifyLog('Status update:', msg);
            else console.log('Status update:', msg);
            // if the modal overlay is present and visible, mirror status there too
            const modalText = document.getElementById('dmexp-modal-text');
            const modal = document.getElementById('dmexp-modal');
            if (modal && modal.style.display !== 'none' && modalText) {
                modalText.textContent = msg;
            }
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
        // an overlay that sits above everything and is intended to display
        // transient informational messages during long-running operations like
        // scrolling/extraction.  It is created lazily on first use and cached
        // via its DOM ID so subsequent calls simply update the text.
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
        // simply hides the overlay; content is preserved so a subsequent
        // showModal() call can reuse the same element without rebuilding it.
        hideModal() {
            const m = document.getElementById('dmexp-modal');
            if (m) m.style.display = 'none';
        },

        enableSave() {
            if (panel) panel.enableSave();
        },

        setProgress(frac) {
            if (panel) panel.setProgress(frac);
        }
    };
}

// support CommonJS in tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}