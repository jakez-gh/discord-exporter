function  Selectors() {
    return {
        messageList: '[data-list-id="chat-messages"]',
        messageItem: 'li[role="listitem"], li.messageListItem__5126c',
        messageWrapper: '[role="article"]',
        timestamp: 'time[datetime]',
        username: '[id^="message-username-"]',
        content: '[id^="message-content-"]',
    };
}
