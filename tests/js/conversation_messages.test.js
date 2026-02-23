/* eslint-env mocha */
const { expect } = require('chai');
const ConversationMessages = require('../../horizontal/conversation_messages');

describe('ConversationMessages module', () => {
    it('accumulates elements and notifies on complete', () => {
        const conv = ConversationMessages();
        const fakeScroll = {
            _msgCb: null,
            _stopCb: null,
            onMessage(fn) { this._msgCb = fn; },
            onStop(fn) { this._stopCb = fn; },
            start() { /* noop */ },
            stop(auto) { if (this._stopCb) this._stopCb(auto); }
        };

        conv.attachScroll(fakeScroll);
        // simulate two discovered messages
        const e1 = { innerText: 'foo' };
        const e2 = { innerText: 'bar' };
        fakeScroll._msgCb(e1, 'id1');
        fakeScroll._msgCb(e2, 'id2');

        let completed = false;
        conv.onComplete((msgs, auto) => {
            completed = true;
            expect(msgs).to.have.property('id1', e1);
            expect(msgs).to.have.property('id2', e2);
            expect(auto).to.be.false;
        });

        fakeScroll.stop(false);
        expect(completed).to.be.true;
    });
});