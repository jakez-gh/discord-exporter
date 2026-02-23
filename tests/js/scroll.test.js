/* eslint-env mocha */
const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const sinon = require('sinon');

const Config = require('../../core/config');
const DomFactory = require('../../core/dom');
const Scroll = require('../../vertical/scroll');

// helper that returns a simple communicator stub recording messages
function makeComm() {
    return {
        statuses: [],
        progresses: [],
        logs: [],
        notifyStatus(msg) { this.statuses.push(msg); },
        notifyProgress(v) { this.progresses.push(v); },
        notifyLog(...args) { this.logs.push(args); },
        onStatus() {}, onProgress() {}, onLog() {}
    };
}

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

    it('notifies onMessage listeners for each new message id', () => {
        const elem1 = { getAttribute: () => 'm1' };
        const elem2 = { getAttribute: () => 'm2' };
        let callCount = 0;
        const domHelper = {
            scroller: () => ({ scrollHeight: 0, clientHeight: 0, parentElement: null }),
            list: () => null,
            items: () => [elem1, elem2]
        };
        const comm = makeComm();
        const scroll = Scroll(Config(), domHelper, comm, console);
        const ids = [];
        scroll.onMessage((el,id) => ids.push(id));
        scroll.start();
        expect(ids).to.include('m1');
        expect(ids).to.include('m2');
        scroll.stop();
    });

    it('chooses the first overflowing ancestor as the scroller', () => {
        const inner = { scrollHeight: 200, clientHeight: 200, parentElement: null };
        const outer = { scrollHeight: 400, clientHeight: 200, parentElement: null };
        inner.parentElement = outer;

        const domHelper = {
            scroller: () => inner,
            list: () => null,
            items: () => []
        };

        const spy = sinon.spy(console, 'log');
        const comm = makeComm();
        const scroll = Scroll(Config(), domHelper, comm, console);
        scroll.start();

        expect(spy.calledWithMatch('using ancestor scroller')).to.be.true;
        expect(comm.logs.some(a => a[0].includes('scroll.start invoked'))).to.be.true;
        console.log.restore();
        scroll.stop();
    });

    it('notifies registered listeners for each new message id', () => {
        const domHelper = {
            scroller: () => ({ scrollHeight:0, clientHeight:0 }),
            list: () => null,
            items: () => [
                { getAttribute: () => 'id1', innerText: 'first' },
                { getAttribute: () => 'id2', innerText: 'second' }
            ]
        };
        const comm = makeComm();
        const scroll = Scroll(Config(), domHelper, comm, console);
        const seen = [];
        scroll.onMessage((id, el) => seen.push({ id, text: el.innerText }));
        scroll.start();
        expect(seen).to.deep.include({ id: 'id1', text: 'first' });
        expect(seen).to.deep.include({ id: 'id2', text: 'second' });
        scroll.stop();
    });

    it('does not alternate to bottom every tick; only when stuck', () => {
        const scroller = { scrollTop: 100, scrollHeight: 200, clientHeight: 50 };
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => []
        };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 100;

        const comm = makeComm();
        const scroll = Scroll(cfg, domHelper, comm, console);
        scroll.start();

        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);
        clock.tick(10);
        expect(scroller.scrollTop).to.equal(0);

        scroll.stop();
    });

    it('does not stop until the top is reached even if stall occurs', () => {
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
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 30;

        const comm = makeComm();
        const scroll = Scroll(cfg, domHelper, comm, console);
        const stopSpy = sinon.spy(scroll, 'stop');
        scroll.start();

        clock.tick(100);
        expect(stopSpy.called).to.be.false;

        allowSetTop = true;
        scroller.scrollTop = 0;
        clock.tick(50);
        expect(stopSpy.calledOnce).to.be.true;

        scroll.stop(true);
        expect(comm.statuses).to.include('Reached top. Extracting…');
    });

    it('reports progress events when message count increases', () => {
        let msgsCount = 0;
        const scroller = { scrollTop: 0, scrollHeight: 200, clientHeight: 50 };
        const domHelper = {
            scroller: () => scroller,
            list: () => null,
            items: () => Array.from({ length: msgsCount }).map((_, i) => ({ getAttribute: () => `m${i}` }))
        };
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 1000;

        const comm = makeComm();
        const progressCalls = [];
        comm.notifyProgress = v => progressCalls.push(v);
        const scroll = Scroll(cfg, domHelper, comm, console);
        scroll.start();

        clock.tick(10);
        expect(progressCalls).to.be.empty;

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
        const cfg = Config();
        cfg.scrollIntervalMs = 10;
        cfg.scrollStallTimeoutMs = 1000;

        const comm = makeComm();
        comm.notifyStatus = msg => statuses.push(msg);
        const scroll = Scroll(cfg, domHelper, comm, console);
        scroll.start();

        clock.tick(10);
        msgsCount = 5;
        clock.tick(10);
        expect(statuses).to.include('Scrolling… 10 messages seen');

        scroll.stop();
    });
});
