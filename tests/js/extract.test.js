/* eslint-env mocha */
const { expect } = require('chai');
const ExtractFactory = require('../../vertical/extract');

// dummy DOM element generator helper
function makeElem(id, time, user, content) {
    const li = {
        getAttribute: () => id,
        querySelector: selector => {
            if (selector === '[role="article"]') return null;
            if (selector === 'time') return { getAttribute: () => time };
            if (/^\[id\^="message-username"\]/.test(selector)) return { innerText: user };
            if (/^\[id\^="message-content"\]/.test(selector)) return { innerText: content };
            return null;
        }
    };
    return li;
}

describe('Extract module', () => {
    it('falls back to DOM items when no conversation provided', () => {
        const items = [makeElem('a','t','U','x')];
        const dom = { items: () => items };
        const ext = ExtractFactory({}, dom, console);
        const result = ext.run();
        expect(result.json.messages[0].username).to.equal('U');
    });

    it('uses attached conversation messages instead of DOM', () => {
        const conv = { getAll: () => ({ 'm1': makeElem('m1','t1','A','hi') }) };
        const ext = ExtractFactory({}, null, console, conv);
        const result = ext.run();
        expect(result.json.messages.length).to.equal(1);
        expect(result.json.messages[0].content).to.equal('hi');
    });
});