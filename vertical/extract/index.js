// vertical/extract/index.js
// Core extraction logic; already UI-free so just relocated into its own
// vertical slice folder for better organization.

function Extract(Config, Dom, Log, conv) {
    const extractors = [];
    let _conv = conv;

    return {
        register(fn) {
            extractors.push(fn);
        },

        attachConversation(conversation) {
            _conv = conversation;
            if (conversation && typeof conversation.onComplete === 'function') {
                conversation.onComplete(() => {
                    Log && Log('Conversation collection complete');
                });
            }
        },

        run() {
            const source = _conv ? Object.values(_conv.getAll()) : Dom.items();
            const messages = source.map(li => {
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Extract;
}