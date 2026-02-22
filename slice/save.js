 function Save(Config, Log, UI) {
    return {
        // note: returning promise as async helps tests await and logs
        async download(type, Extract) {
            console.log('Save.download invoked, type=', type);
            const { text, json } = Extract.run();
            console.log('Save.extract returned', json.messages.length, 'messages');
            const total = json.messages.length;
            if (type === 'md') {
                console.log('Generating markdown output');
                let md = '# Messages\n';
                let attachIdx = 0;
                for (let i = 0; i < json.messages.length; i++) {
                    const m = json.messages[i];
                    const line = `- [${m.timestamp}] **${m.username}**: ${m.content}`;
                    md += line + '\n';
                    console.log(line); // echo as it's created
                    if (UI && UI.setStatus) {
                        UI.setStatus(`Extracting… ${i+1}/${total}`);
                    }
                    if (m.attachments && m.attachments.length) {
                        m.attachments.forEach(url => {
                            const ext = url.split('.').pop().split('?')[0];
                            const fname = `attachment-${++attachIdx}.${ext}`;
                            md += `  [Attachment](${fname})\n`;
                            // trigger download of the binary
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fname;
                            a.click();
                        });
                    }
                }
                const blob = new Blob([md], { type: 'text/markdown' });
                const anchor = document.createElement('a');
                anchor.href = URL.createObjectURL(blob);
                anchor.download = 'discord.md';
                anchor.click();
                return;
            }
            // fallback existing behavior: still log each message for console
            if (UI && UI.setStatus) {
                json.messages.forEach((m, idx) => {
                    console.log(`- [${m.timestamp}] ${m.username}: ${m.content}`);
                    UI.setStatus(`Extracting… ${idx+1}/${total}`);
                });
            }

            const blob = new Blob(
                [type === 'txt' ? text : JSON.stringify(json, null, 2)],
                { type: type === 'txt' ? 'text/plain' : 'application/json' }
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `discord_.${type}`;
            a.click();
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Save;
}

