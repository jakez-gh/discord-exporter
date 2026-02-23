// horizontal/panel/index.js
// Responsible for building and manipulating the floating control panel.  This
// module knows nothing about modals; it strictly deals with the panel that
// sits in the bottom right corner of the Discord UI.  Separating it out makes
// the UI module easier to reason about (modal logic remains there) and keeps
// tests for panel-specific behavior scoped.

function Panel(Config) {
    let panelEl;
    let statusEl;
    let progressBarEl;

    return {
        init(callbacks) {
            // insert styles first so measurements during drag are correct
            this.injectStyles();

            panelEl = document.createElement('div');
            panelEl.id = Config.ui.panelId;
            panelEl.innerHTML = `
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
            document.body.appendChild(panelEl);

            statusEl = document.getElementById(Config.ui.statusId);
            progressBarEl = document.getElementById(Config.ui.progressBarId);

            document.getElementById('dmexp-start').onclick = callbacks.onStart;
            document.getElementById('dmexp-stop').onclick = callbacks.onStop;
            document.getElementById('dmexp-save-txt').onclick = callbacks.onSaveTxt;
            document.getElementById('dmexp-save-json').onclick = callbacks.onSaveJson;

            this.makeDraggable();
        },

        setStatus(msg) {
            if (statusEl) statusEl.textContent = msg;
        },

        enableSave() {
            document.getElementById('dmexp-save-txt').disabled = false;
            document.getElementById('dmexp-save-json').disabled = false;
        },

        setProgress(frac) {
            if (progressBarEl) {
                progressBarEl.style.width = `${Math.floor(frac * 100)}%`;
            }
        },

        injectStyles() {
            // CSS for the control panel and related helper elements.  Each rule
            // group is annotated to make it easier to tweak the look-and-feel
            // without digging through the HTML injection code.
            const css = `
/* outer panel: fixed in bottom-right corner with semi-transparent
   blue background and rounded corners; high z-index ensures it appears
   on top of Discord UI content. */
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

/* buttons inside panel: golden background for visibility, minimal
   padding and no border to match Discord's flat aesthetic, cursor
   pointer indicates clickable area. */
#${Config.ui.panelId} button {
    margin: 2px;
    padding: 4px 8px;
    background-color: #ffc107;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* status line sits just below the buttons; small font keeps the panel
   compact. */
#${Config.ui.panelId} #${Config.ui.statusId} {
    margin-top: 4px;
    font-size: 12px;
}

/* helper header button (used by upgrades or external controls) is fixed
   near the top-right and styled green to stand out from panel. */
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

        makeDraggable() {
            if (!panelEl) return;
            let isDown = false;
            let offset = [0,0];
            panelEl.addEventListener('mousedown', function(e) {
                isDown = true;
                panelEl.style.width = panelEl.offsetWidth + 'px';
                panelEl.style.height = panelEl.offsetHeight + 'px';
                panelEl.style.right = '';
                panelEl.style.bottom = '';
                offset = [panelEl.offsetLeft - e.clientX, panelEl.offsetTop - e.clientY];
            }, true);
            document.addEventListener('mouseup', function() {
                isDown = false;
            }, true);
            document.addEventListener('mousemove', function(event) {
                event.preventDefault();
                if (isDown) {
                    panelEl.style.left = (event.clientX + offset[0]) + 'px';
                    panelEl.style.top  = (event.clientY + offset[1]) + 'px';
                }
            }, true);
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Panel;
}