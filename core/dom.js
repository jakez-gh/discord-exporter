function Dom(Selectors) {
    return {
        list() {
            return document.querySelector(Selectors.messageList);
        },
        scroller() {
            // return the message list; the correct scrollable parent will be
            // determined by Scroll.start since Discord wraps the list in
            // several divs and the class names change often.
            return this.list() || null;
        },
        items() {
            const list = this.list();
            return list ? Array.from(list.querySelectorAll(Selectors.messageItem)) : [];
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dom;
}
