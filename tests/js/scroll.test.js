/* eslint-env mocha */
const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const sinon = require('sinon');

const Config = require('../../core/config');
const DomFactory = require('../../core/dom');
const Scroll = require('../../slice/scroll');

describe('Scroll module', () => {
    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
    });

    it('chooses the first overflowing ancestor as the scroller', () => {
        // create two nested plain objects to simulate elements
        const inner = { scrollHeight: 200, clientHeight: 200, parentElement: null };
        const outer = { scrollHeight: 400, clientHeight: 200, parentElement: null };
        inner.parentElement = outer;

        // dom helper returns inner as the initial scroller
        const domHelper = {
            scroller: () => inner,
            list: () => null,
            items: () => []
        };

        // spy on console so we can detect the log message
        const spy = sinon.spy(console, 'log');
        const uiStub = { showModal: () => {}, setStatus: () => {}, enableSave: () => {}, hideModal: () => {} };

        const scroll = Scroll(Config(), domHelper, uiStub, console);
        scroll.start();

        expect(spy.calledWithMatch('using ancestor scroller')).to.be.true;
        console.log.restore();
        scroll.stop();
    });

    it('does not alternate to bottom every tick; only when stuck', () => {
        const scroller = { scrollTop: 100, scrollHeight: 200, clientHeight: 50 };
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => []
        };
        const statuses = [];
        const uiStub = {
            showModal: () => {},
            setStatus: msg => statuses.push(msg),
            enableSave: () => {},
            hideModal: () => {}
        };
        const cfg = Config();
        // shorten interval so test runs fast
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 100;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        scroll.start();

        // tick once: should move to top
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);

        // tick second time: no change, should flip direction internally (nudge bottom next)
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);

        // tick third time: because stuck, should go to bottom once
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(200);

        // tick again: after seeing bottom, should try top again next
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);

        scroll.stop();
    });
});
