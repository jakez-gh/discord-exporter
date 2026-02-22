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
    });
    afterEach(() => {
        clock.restore();
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

        // advance a few cycles to let poll notice
        clock.tick(600);
        expect(document.getElementById(Config().ui.statusId).textContent).to.equal('Ready.');
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
});