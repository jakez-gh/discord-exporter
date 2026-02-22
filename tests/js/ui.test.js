/* eslint-env mocha */
const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const sinon = require('sinon');

const Config = require('../../core/config');
const UIFactory = require('../../slice/ui');

describe('UI module', () => {
    let dom;
    let window;
    let document;
    let clock;

    beforeEach(() => {
        dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, { runScripts: 'outside-only' });
        window = dom.window;
        document = window.document;
        global.document = document;
        global.window = window;
        clock = sinon.useFakeTimers();
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        clock.restore();
        sandbox.restore();
        delete global.document;
        delete global.window;
    });

    it('polls until messages appear before declaring ready', () => {
        const selectors = { messageList: '#msgs', messageItem: 'li' };
        const domHelper = {
            items: () => {
                const list = document.querySelector(selectors.messageList);
                if (!list) return [];
                return Array.from(list.querySelectorAll(selectors.messageItem));
            }
        };

        const statuses = [];
        const ui = UIFactory(Config(), console);
        ui.init({ dom: domHelper, onStart: () => {}, onStop: () => {}, onSaveTxt:() => {}, onSaveJson:() => {} });

        // initially there is no list, so status should show waiting message
        expect(document.getElementById(Config().ui.statusId).textContent).to.match(/Waiting for chat messages/);

        // add the list after one tick
        const list = document.createElement('div');
        list.id = 'msgs';
        document.body.appendChild(list);
        const li = document.createElement('li');
        list.appendChild(li);

        // advance enough time to pass 500ms threshold
        clock.tick(700);
        expect(document.getElementById(Config().ui.statusId).textContent).to.equal('Ready.');
    });

    it('does not mark ready until console quiets', () => {
        const selectors = { messageList: '#msgs', messageItem: 'li' };
        const domHelper = {
            items: () => [document.createElement('li')]
        };
        const ui = UIFactory(Config(), console);
        ui.init({ dom: domHelper, onStart: () => {}, onStop: () => {}, onSaveTxt:() => {}, onSaveJson:() => {} });

        // immediately after init, status may still be waiting because of log override
        expect(document.getElementById(Config().ui.statusId).textContent).to.match(/Waiting/);
        // simulate console noise
        console.log('noisy');
        clock.tick(300);
        // still waiting because less than 500ms since last log
        expect(document.getElementById(Config().ui.statusId).textContent).to.match(/Waiting/);

        // now allow quiet
        clock.tick(300);
        expect(document.getElementById(Config().ui.statusId).textContent).to.equal('Ready.');
    });

    it('logs status updates to console', () => {
        // ensure status element exists so setStatus writes to it
        const el = document.createElement('div');
        el.id = Config().ui.statusId;
        document.body.appendChild(el);

        const logSpy = sinon.spy(console, 'log');
        const ui = UIFactory(Config(), console);
        ui.setStatus('foo');
        ui.setStatus('bar');
        expect(logSpy.calledWith('Status update:', 'foo')).to.be.true;
        expect(logSpy.calledWith('Status update:', 'bar')).to.be.true;
        logSpy.restore();
    });
    it('creates a progress bar and setProgress adjusts width', () => {
        const selectors = { messageList: '#msgs', messageItem: 'li' };
        const domHelper = { items: () => [] };
        const ui = UIFactory(Config(), console);
        ui.init({ dom: domHelper, onStart: () => {}, onStop: () => {}, onSaveTxt:() => {}, onSaveJson:() => {} });
        const bar = document.getElementById(Config().ui.progressBarId);
        expect(bar).to.exist;
        ui.setProgress(0.3);
        expect(bar.style.width).to.equal('30%');
        ui.setProgress(1);
        expect(bar.style.width).to.equal('100%');
    });

    it('locks panel dimensions when dragging so it moves rather than resizes', () => {
        const ui = UIFactory(Config(), console);
        ui.init({ dom: { items: () => [] }, onStart: () => {}, onStop: () => {}, onSaveTxt:() => {}, onSaveJson:() => {} });
        const panel = document.getElementById(Config().ui.panelId);

        // simulate a measured panel by faking offsetWidth/offsetHeight
        Object.defineProperty(panel, 'offsetWidth', { value: 123, configurable: true });
        Object.defineProperty(panel, 'offsetHeight', { value: 45, configurable: true });

        // dispatch mousedown on interior of panel
        const down = new window.MouseEvent('mousedown', { clientX: 10, clientY: 20, bubbles: true });
        panel.dispatchEvent(down);

        // after mousedown dimensions should be explicitly set
        expect(panel.style.width).to.equal('123px');
        expect(panel.style.height).to.equal('45px');

        // simulate a move; size should remain unchanged
        const move = new window.MouseEvent('mousemove', { clientX: 20, clientY: 30, bubbles: true });
        document.dispatchEvent(move);
        expect(panel.style.width).to.equal('123px');
        expect(panel.style.height).to.equal('45px');
        // left/top should have been updated, which indicates move happened
        expect(panel.style.left).to.match(/px$/);
        expect(panel.style.top).to.match(/px$/);
    });
});