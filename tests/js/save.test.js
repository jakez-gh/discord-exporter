/* eslint-env mocha */
const { expect } = require('chai');
const sinon = require('sinon');

const SaveFactory = require('../../vertical/save');

describe('Save module', () => {
    let originalBlob;
    let created = [];
    let sandbox;

    before(() => {
        // fake Blob and URL for JSDOM environment
        originalBlob = global.Blob;
        global.Blob = class {
            constructor(parts, opts) {
                this.parts = parts;
                this.opts = opts;
            }
        };
        global.URL.createObjectURL = (obj) => `blob:${JSON.stringify(obj)}`;
        global.document = {
            createElement: () => {
                return { href: '', download: '', click: () => { created.push('clicked'); } };
            }
        };
    });
    after(() => {
        global.Blob = originalBlob;
        delete global.document;
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        sandbox.restore();
    });

    it('produces markdown with attachment references and logs output', async () => {
        const messages = [{
            timestamp: '2020-01-01T00:00:00Z',
            username: 'Alice',
            content: 'Hi',
            attachments: ['http://example.com/a.png'],
            stickers: []
        }];
        const extract = { run: () => ({ text: '', json: { messages } }) };
        // we no longer need a UI stub; status information flows over communicator
        const comm = { statuses: [], logs: [], notifyStatus(msg){this.statuses.push(msg);}, notifyLog(){}, notifyProgress(){} };
        const save = SaveFactory({}, console, null, comm);
        const logSpy = sandbox.spy(console, 'log');
        let clicks = 0;
        global.document.createElement = () => {
            return { href: '', download: '', click: () => { clicks++; } };
        };

        await save.download('md', extract);

        expect(logSpy.calledWith('Save.download invoked, type=', 'md')).to.be.true;
        expect(logSpy.calledWithMatch('Save.extract returned')).to.be.true;
        expect(logSpy.calledWithMatch('Generating markdown')).to.be.true;
        // each message line should have been logged
        expect(logSpy.calledWith("- [2020-01-01T00:00:00Z] **Alice**: Hi")).to.be.true;
        // communicator should have received at least one status update
        expect(comm.statuses).to.include('Extracting… 1/1');
        expect(clicks).to.equal(2);
    });

    it('reports progress and echoes lines during txt extraction', async () => {
        const messages = [
            { timestamp: 't1', username: 'A', content: 'x', attachments: [], stickers: [] },
            { timestamp: 't2', username: 'B', content: 'y', attachments: [], stickers: [] }
        ];
        const extract = { run: () => ({ text: '', json: { messages } }) };
        const comm = { statuses: [], logs: [], notifyStatus(msg){this.statuses.push(msg);}, notifyLog(){}, notifyProgress(){} };
        const save = SaveFactory({ logInterval: 1 }, console, null, comm);
        const logSpy = sandbox.spy(console, 'log');
        global.document.createElement = () => ({ href: '', download: '', click: () => {} });

        await save.download('txt', extract);

        // should have logged each message line because logInterval=1
        expect(logSpy.calledWith('- [t1] A: x')).to.be.true;
        expect(logSpy.calledWith('- [t2] B: y')).to.be.true;
        // status updates for each message via communicator
        expect(comm.statuses).to.include('Extracting… 1/2');
        expect(comm.statuses).to.include('Extracting… 2/2');
        logSpy.restore();
    });

    it('throttles console output when logInterval > 1', async () => {
        const messages = [];
        for (let i = 0; i < 100; i++) {
            messages.push({ timestamp: `t${i}`, username: 'U', content: 'c', attachments: [], stickers: [] });
        }
        const extract = { run: () => ({ text: '', json: { messages } }) };
        const comm = { statuses: [], logs: [], notifyStatus(msg){this.statuses.push(msg);}, notifyLog(){}, notifyProgress(){} };
        // log only every 25 messages
        const save = SaveFactory({ logInterval: 25 }, console, null, comm);
        const logSpy = sandbox.spy(console, 'log');
        global.document.createElement = () => ({ href: '', download: '', click: () => {} });

        await save.download('txt', extract);

        // expected roughly 100/25 = 4 logged lines plus summary
        const messageLines = logSpy.args.filter(a => typeof a[0] === 'string' && a[0].startsWith('- [t')).length;
        expect(messageLines).to.be.at.most(5);
        expect(comm.statuses).to.include('Extracting… 100/100');
        logSpy.restore();
    });

    it('notifies communicator when provided', async () => {
        const messages = [
            { timestamp: 't1', username: 'A', content: 'x', attachments: [], stickers: [] }
        ];
        const extract = { run: () => ({ text: '', json: { messages } }) };
        const comm = { statuses: [], logs: [], notifyStatus(msg){this.statuses.push(msg);}, notifyLog(...args){this.logs.push(args);} };
        const save = SaveFactory({}, console, null, comm);
        global.document.createElement = () => ({ href: '', download: '', click: () => {} });

        await save.download('txt', extract);

        expect(comm.statuses).to.include('Extracting… 1/1');
        expect(comm.logs.some(args=>args[0].includes('Save.download invoked'))).to.be.true;
    });
});
