function Dom(Selectors) {
    return {
        list() {
            return document.querySelector(Selectors.messageList);
        },
        scroller() {
            const list = this.list();
            return list?.closest('[class*="scroller"]') || null;
        },
        items() {
            const list = this.list();
            return list ? Array.from(list.querySelectorAll(Selectors.messageItem)) : [];
        }
    };
}
