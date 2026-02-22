 function UI(Config, Log) {
    return {
        init(callbacks) {
            this.cb = callbacks;
            this.createPanel();
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

        enableSave() {
            document.getElementById('dmexp-save-txt').disabled = false;
            document.getElementById('dmexp-save-json').disabled = false;
        }
    };
}
