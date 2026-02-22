/* eslint-env mocha */
const { expect } = require('chai');
const sinon = require('sinon');

const SaveFactory = require('../../slice/save');

describe('Save module', () => {
    let originalBlob;
    let created = [];

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

    it('produces markdown with attachment references and logs output', async () => {
        const messages = [{
            timestamp: '2020-01-01T00:00:00Z',
            username: 'Alice',
            content: 'Hi',
            attachments: ['http://example.com/a.png'],
            stickers: []
        }];
        const extract = { run: () => ({ text: '', json: { messages } }) };
        const save = SaveFactory({}, console);
        const logSpy = sinon.spy(console, 'log');
        let clicks = 0;
        global.document.createElement = () => {
            return { href: '', download: '', click: () => { clicks++; } };
        };

        await save.download('md', extract);

        expect(logSpy.calledWithMatch('Generating markdown')).to.be.true;
        const generated = logSpy.args.find(a => a[0].startsWith('# Messages'))[0];
        expect(generated).to.include('Alice');
        expect(generated).to.include('attachment-1.png');
        // one click for binary, one for markdown file
        expect(clicks).to.equal(2);
        logSpy.restore();
    });
});
