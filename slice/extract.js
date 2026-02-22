 function Extract(Config, Dom, Log) {
    const extractors = [];

    return {
        register(fn) {
            extractors.push(fn);
        },

        run() {
            const messages = Dom.items().map(li => {
                const base = this.base(li);
                extractors.forEach(fn => fn(li, base));
                return base;
            });

            return {
                text: messages.map(m => `[${m.timestamp}] ${m.username}: ${m.content}`).join('\n'),
                json: { messages }
            };
        },

        base(li) {
            const wrapper = li.querySelector('[role="article"]') || li;

            return {
                timestamp: wrapper.querySelector('time')?.getAttribute('datetime') || '',
                username: wrapper.querySelector('[id^="message-username"]')?.innerText.trim() || '',
                content: wrapper.querySelector('[id^="message-content"]')?.innerText.trim() || '',
                attachments: [],
                stickers: []
            };
        }
    };
}
