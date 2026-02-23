// vertical/conversation-message-list/index.js
// Tracks every message ID and associated text that the scroller encounters.
// Designed as a standalone object so tests can exercise the behaviour
// independently and producers can hook it up whenever a Scroll instance is
// available.

function ConversationMessageList() {
    const map = {};

    return {
        // attach to a Scroll instance; will be called with (id, element)
        // whenever the scroller discovers a new message.
        attach(scroll) {
            if (scroll && typeof scroll.onMessage === 'function') {
                scroll.onMessage((id, el) => {
                    // store text or empty string if not available
                    map[id] = el && el.innerText ? el.innerText : '';
                });
            }
        },
        // expose a read-only copy of the collected messages
        getAll() {
            return { ...map };
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationMessageList;
}