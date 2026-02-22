/* eslint-env mocha */
const { expect } = require('chai');
const sinon = require('sinon');

const SaveFactory = require('../../slice/save');

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
        const statuses = [];
        const uiStub = { setStatus: msg => statuses.push(msg) };
        const save = SaveFactory({}, console, uiStub);
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
        // UI should have received at least one progress update
        expect(statuses).to.include('Extracting… 1/1');
        // final markdown string is no longer logged so we drop that assertion
        expect(clicks).to.equal(2);
    });

    it('reports progress and echoes lines during txt extraction', async () => {
        const messages = [
            { timestamp: 't1', username: 'A', content: 'x', attachments: [], stickers: [] },
            { timestamp: 't2', username: 'B', content: 'y', attachments: [], stickers: [] }
        ];
        const extract = { run: () => ({ text: '', json: { messages } }) };
        const statuses = [];
        const uiStub = { setStatus: msg => statuses.push(msg) };
        const save = SaveFactory({}, console, uiStub);
        const logSpy = sinon.spy(console, 'log');
        global.document.createElement = () => ({ href: '', download: '', click: () => {} });

        await save.download('txt', extract);

        // should have logged each message line
        expect(logSpy.calledWith('- [t1] A: x')).to.be.true;
        expect(logSpy.calledWith('- [t2] B: y')).to.be.true;
        // status updates for each message
        expect(statuses).to.include('Extracting… 1/2');
        expect(statuses).to.include('Extracting… 2/2');
        logSpy.restore();
    });
});
