/* eslint-env mocha */
const { expect } = require('chai');
const ConversationMessageList = require('../../vertical/conversation-message-list');
const Scroll = require('../../vertical/scroll');
const Config = require('../../core/config');

// simple communicator stub (not used here but required by Scroll signature)
function makeComm() {
    return { notifyStatus() {}, notifyProgress() {}, notifyLog() {} };
}

describe('ConversationMessageList', () => {
    it('collects id/text pairs when attached to a Scroll', () => {
        const domHelper = {
            scroller: () => ({ scrollHeight:0, clientHeight:0 }),
            list: () => null,
            items: () => [
                { getAttribute: () => 'm1', innerText: 'hello' },
                { getAttribute: () => 'm2', innerText: 'world' }
            ]
        };
        const comm = makeComm();
        const scroll = Scroll(Config(), domHelper, comm, console);
        const list = ConversationMessageList();
        list.attach(scroll);
        scroll.start();
        const all = list.getAll();
        expect(all).to.have.property('m1', 'hello');
        expect(all).to.have.property('m2', 'world');
        scroll.stop();
    });

    it('ignores non-function listeners and does not throw', () => {
        const domHelper = {
            scroller: () => ({ scrollHeight:0, clientHeight:0 }),
            list: () => null,
            items: () => []
        };
        const scroll = Scroll(Config(), domHelper, makeComm(), console);
        const list = ConversationMessageList();
        // deliberately pass wrong types
        scroll.onMessage(null);
        list.attach(scroll); // should not throw
    });
});