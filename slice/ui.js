 function UI(Config, Log) {
    return {
        init(callbacks) {
            this.cb = callbacks;
            this.injectStyles();
            this.createPanel();
            this.addHeaderButton();
            this.setStatus('Ready.');
        },

        createPanel() {
            const panel = document.createElement('div');
            panel.id = Config.ui.panelId;
            panel.innerHTML = `
                <button id="dmexp-start">Start</button>
                <button id="dmexp-stop">Stop</button>
                <button id="dmexp-save-txt" disabled>Save TXT</button>
                <button id="dmexp-save-json" disabled>Save JSON</button>
                <div id="${Config.ui.statusId}"></div>
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
        addHeaderButton() {
            const btn = document.createElement('div');
            btn.className = 'dmexp-header-button';
            btn.textContent = 'Export Discord';
            btn.onclick = this.cb.onStart;
            document.body.appendChild(btn);
        },
        enableSave() {
            document.getElementById('dmexp-save-txt').disabled = false;
            document.getElementById('dmexp-save-json').disabled = false;
        }
    };
}
