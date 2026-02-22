 function Save(Config, Log) {
    return {
        // note: returning promise as async helps tests await and logs
        async download(type, Extract) {
            const { text, json } = Extract.run();
            if (type === 'md') {
                console.log('Generating markdown output');
                let md = '# Messages\n';
                let attachIdx = 0;
                json.messages.forEach(m => {
                    md += `- [${m.timestamp}] **${m.username}**: ${m.content}\n`;
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
                });
                console.log(md);
                const blob = new Blob([md], { type: 'text/markdown' });
                const anchor = document.createElement('a');
                anchor.href = URL.createObjectURL(blob);
                anchor.download = 'discord.md';
                anchor.click();
                return;
            }
            // fallback existing behavior
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

