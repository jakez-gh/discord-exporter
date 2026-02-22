/* eslint-env mocha */
const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const sinon = require('sinon');

const Config = require('../../core/config');
const DomFactory = require('../../core/dom');
const Scroll = require('../../slice/scroll');

describe('Scroll module', () => {
    let clock;
    let sandbox;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        clock.restore();
        sandbox.restore();
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

        // tick third time: still at top since algorithm no longer jumps to bottom
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);

        // tick again: remain at top
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);

        scroll.stop();
    });

    it('does not stop until the top is reached even if stall occurs', () => {
        // scroller ignores assignments to zero until we allow it; keeps value at 50
        let allowSetTop = false;
        const scroller = {
            _top: 50,
            get scrollTop() { return this._top; },
            set scrollTop(v) {
                if (v === 0 && !allowSetTop) return;
                this._top = v;
            },
            scrollHeight: 200,
            clientHeight: 50
        };
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => []
        };
        const uiStub = {
            showModal: () => {},
            setStatus: () => {},
            enableSave: () => {},
            hideModal: () => {}
        };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 30;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        const stopSpy = sinon.spy(scroll, 'stop');
        scroll.start();

        // advance beyond stall timeout; stop should NOT be called because top never reached
        clock.tick(100);
        expect(stopSpy.called).to.be.false;

        // now allow reaching top and trigger it; require multiple stalls
        allowSetTop = true;
        scroller.scrollTop = 0;
        // make enough ticks to satisfy consecutive stall condition
        clock.tick(50);
        expect(stopSpy.calledOnce).to.be.true;
    });

    it('calls UI.setProgress when message count increases', () => {
        let msgsCount = 0;
        const scroller = { scrollTop: 0, scrollHeight: 200, clientHeight: 50 };
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => Array.from({ length: msgsCount }).map((_, i) => ({ getAttribute: () => `m${i}` }))
        };
        const progressCalls = [];
        const uiStub = {
            showModal: () => {},
            setStatus: () => {},
            enableSave: () => {},
            hideModal: () => {},
            setProgress: v => progressCalls.push(v)
        };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 1000;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        scroll.start();

        // initially no messages
        clock.tick(10);
        expect(progressCalls).to.be.empty;

        // simulate messages
        msgsCount = 500;
        clock.tick(10);
        expect(progressCalls.length).to.equal(1);
        expect(progressCalls[0]).to.equal(500/10000);

        msgsCount = 2000;
        clock.tick(10);
        expect(progressCalls.length).to.equal(2);
        expect(progressCalls[1]).to.equal(2000/10000);

        scroll.stop();
    });

    it('keeps message count monotonic even if items decrease', () => {
        let msgsCount = 10;
        const scroller = { scrollTop: 0, scrollHeight: 200, clientHeight: 50 };
        const statuses = [];
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => Array.from({ length: msgsCount }).map((_,i)=>({getAttribute:()=>`m${i}`}))
        };
        const uiStub = {
            showModal: () => {},
            setStatus: msg => statuses.push(msg),
            enableSave: () => {},
            hideModal: () => {}
        };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 1000;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        scroll.start();

        // first tick sees 10 messages
        clock.tick(10);
        expect(statuses[statuses.length-1]).to.match(/10 messages seen/);

        // now simulate a drop to 5; status should still report 10
        msgsCount = 5;
        clock.tick(10);
        expect(statuses[statuses.length-1]).to.match(/10 messages seen/);

        // later increase above previous max
        msgsCount = 20;
        clock.tick(10);
        expect(statuses[statuses.length-1]).to.match(/20 messages seen/);

        scroll.stop();
    });

    it('maintains seen-order buffer without duplicates', () => {
        let ids = ['a','b','c'];
        const scroller = { scrollTop:0, scrollHeight:200, clientHeight:50 };
        const domHelper = {
            scroller:() => scroller,
            list:() => null,
            items:() => ids.map(id=>({getAttribute:()=>id}))
        };
        const uiStub = { showModal:()=>{}, setStatus:()=>{}, enableSave:()=>{}, hideModal:()=>{}, setProgress:()=>{} };
        const cfg = Config(); cfg.scrollIntervalMs=10; cfg.scrollStallTimeoutMs=1000;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        scroll.start();
        clock.tick(10);
        expect(scroll.getSeenOrder()).to.deep.equal(['a','b','c']);

        // overlapping window: next items include duplicates and a new one
        ids = ['b','c','d'];
        clock.tick(10);
        expect(scroll.getSeenOrder()).to.deep.equal(['a','b','c','d']);

        scroll.stop();
    });

    it('does not stop when first message ID keeps changing', () => {
        let firstId = 'a';
        const scroller = { scrollTop: 0, scrollHeight: 200, clientHeight: 50 };
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => [{ getAttribute: () => firstId }]
        };
        const uiStub = { showModal: () => {}, setStatus: () => {}, enableSave: () => {}, hideModal: () => {} };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 30;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        const stopSpy = sinon.spy(scroll, 'stop');
        scroll.start();

        // change id each interval for a while
        for (let i = 0; i < 5; i++) {
            clock.tick(10);
            firstId = String.fromCharCode(98 + i);
        }
        expect(stopSpy.called).to.be.false;

        // now freeze and allow reaching top
        scroller.scrollTop = 0;
        clock.tick(100);
        expect(stopSpy.called).to.be.true;
    });

    it('requires multiple consecutive stalls at top before auto-stop', () => {
        const scroller = { scrollTop: 0, scrollHeight: 200, clientHeight: 50 };
        const domHelper = { scroller: () => scroller, list: () => null, items: () => [] };
        const uiStub = { showModal: () => {}, setStatus: () => {}, enableSave: () => {}, hideModal: () => {} };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 30;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        const stopSpy = sinon.spy(scroll, 'stop');
        scroll.start();

        // simulate not at top then consecutive stalls
        scroller.scrollTop = 1;
        clock.tick(10);
        scroller.scrollTop = 0;
        clock.tick(10);
        clock.tick(10);
        expect(stopSpy.called).to.be.false;

        clock.tick(10);
        expect(stopSpy.calledOnce).to.be.true;
    });

    it('updates progress beyond window size when DOM slides', () => {
        let batch = 0;
        const windowSize = 3;
        const messages = [
            ['a','b','c'],
            ['d','e','f'],
            ['g','h','i'],
            ['j','k','l']
        ];
        const scroller = { scrollTop:0, scrollHeight:200, clientHeight:50 };
        const domHelper = {
            scroller:() => scroller,
            list:() => null,
            items:() => messages[batch].map(id=>({ getAttribute: ()=>id }))
        };
        const progress = [];
        const uiStub = { showModal:()=>{}, setStatus:()=>{}, enableSave:()=>{}, hideModal:()=>{}, setProgress:v=>progress.push(v) };
        const cfg = Config(); cfg.scrollIntervalMs = 10; cfg.scrollStallTimeoutMs = 1000;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        scroll.start();

        // tick through batches, bumping the window each time
        clock.tick(10); // first window
        batch = 1;
        clock.tick(10); // second window -> seen should now be 6
        batch = 2;
        clock.tick(10); // third window -> 9
        batch = 3;
        clock.tick(10); // fourth window -> 12

        expect(progress.length).to.be.greaterThan(0);
        expect(progress[progress.length-1]).to.equal(12/10000);
        scroll.stop();
    });

    it('observer mutations reset stall count and prevent premature stop', () => {
        const scroller = { scrollTop:0, scrollHeight:200, clientHeight:50 };
        let items = [{ getAttribute: ()=>'x' }];
        const domHelper = {
            scroller:() => scroller,
            list:() => ({}),
            items:() => items
        };
        const uiStub = { showModal:()=>{}, setStatus:()=>{}, enableSave:()=>{}, hideModal:()=>{}, setProgress:()=>{} };
        const cfg = Config(); cfg.scrollIntervalMs = 10; cfg.scrollStallTimeoutMs = 1000;

        // capture observer callback; handle environment without MutationObserver
        let observerCb;
        const FakeObs = function(cb){ observerCb = cb; this.observe=()=>{}; this.disconnect=()=>{}; };
        const hadMO = typeof global.MutationObserver !== 'undefined';
        const origMO = global.MutationObserver;
        global.MutationObserver = FakeObs;

        const scroll = Scroll(cfg, domHelper, uiStub, console);
        const stopSpy = sinon.spy(scroll,'stop');
        scroll.start();

        // run a few ticks with no DOM change but stay below stall threshold
        clock.tick(30);
        expect(stopSpy.called).to.be.false;

        // now simulate a mutation that adds a new id
        items = [{ getAttribute: ()=>'x' }, { getAttribute: ()=>'y' }];
        observerCb();
        // tick again and ensure we still haven't stopped
        clock.tick(50);
        expect(stopSpy.called).to.be.false;

        // restore original
        if (hadMO) {
            global.MutationObserver = origMO;
        } else {
            delete global.MutationObserver;
        }
    });
});
