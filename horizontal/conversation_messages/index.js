// horizontal/conversation_messages/index.js
// Stores messages discovered during scrolling and notifies interested
// parties when the full conversation has been collected.  This is a
// cross-cutting concern used by Extract and other consumers.

function ConversationMessages(Log) {
    const msgs = {}; // id -> element
    const completeListeners = [];

    return {
        // attach to a Scroll instance; starts scrolling immediately and
        // listens for discovered message events.  When the scroll stops the
        // conversation is considered complete and listeners are notified.
        attachScroll(scroll) {
            if (!scroll) return;
            scroll.onMessage((elem, id) => {
                msgs[id] = elem;
            });
            scroll.onStop(auto => {
                completeListeners.forEach(fn => fn(msgs, auto));
            });
            // kick off scrolling so caller doesn't have to remember
            if (typeof scroll.start === 'function') scroll.start();
        },

        // register a callback for when collection finishes
        onComplete(fn) { completeListeners.push(fn); },

        // get a shallow copy of collected elements
        getAll() { return Object.assign({}, msgs); }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationMessages;
}