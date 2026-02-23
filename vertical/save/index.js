// vertical/save/index.js
// Core saving logic – generates Markdown/JSON/TXT output from extracted
// messages and triggers downloads.  This module is UI-agnostic; callers may
// pass a communicator for status/log notifications, but no DOM operations are
// performed here.

function Save(Config, Log, /*UI (optional)*/ unusedUI, comm) {
    // callers historically passed UI as third argument; we accept it but ignore
    // it to keep compatibility.  The variable name `unusedUI` documents this.
    return {
        // note: returning promise as async helps tests await and logs
        async download(type, Extract) {
            if (comm) comm.notifyLog('Save.download invoked, type=', type);
            else Log && Log('Save.download invoked, type=', type);

            const { text, json } = Extract.run();
            const total = json.messages.length;
            if (comm) comm.notifyLog('Save.extract returned', total, 'messages');
            else Log && Log('Save.extract returned', total, 'messages');

            const config = Config || {};
            const logInterval = config.logInterval || 50;

            const notifyStatus = msg => {
                if (comm) comm.notifyStatus(msg);
                else Log && Log('Status update:', msg);
            };

            if (type === 'md') {
                if (comm) comm.notifyLog('Generating markdown output');
                else Log && Log('Generating markdown output');
                let md = '# Messages\n';
                let attachIdx = 0;
                for (let i = 0; i < json.messages.length; i++) {
                    const m = json.messages[i];
                    const line = `- [${m.timestamp}] **${m.username}**: ${m.content}`;
                    md += line + '\n';
                    if (i % logInterval === 0) {
                        if (comm) comm.notifyLog(line);
                        else Log && Log(line);
                    }
                    notifyStatus(`Extracting… ${i+1}/${total}`);
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
                if (comm) comm.notifyLog(`Finished generating markdown for ${total} messages`);
                else Log && Log(`Finished generating markdown for ${total} messages`);
                const blob = new Blob([md], { type: 'text/markdown' });
                const anchor = document.createElement('a');
                anchor.href = URL.createObjectURL(blob);
                anchor.download = 'discord.md';
                anchor.click();
                return;
            }

            // fallback existing behavior: log throttled
            json.messages.forEach((m, idx) => {
                if (idx % logInterval === 0) {
                    if (comm) comm.notifyLog(`- [${m.timestamp}] ${m.username}: ${m.content}`);
                    else Log && Log(`- [${m.timestamp}] ${m.username}: ${m.content}`);
                }
                notifyStatus(`Extracting… ${idx+1}/${total}`);
            });

            if (comm) comm.notifyLog(`Finished ${total} messages`);
            else Log && Log(`Finished ${total} messages`);

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