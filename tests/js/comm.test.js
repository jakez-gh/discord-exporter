/* eslint-env mocha */
const { expect } = require('chai');
const Comm = require('../../slice/comm');

describe('Comm module', () => {
    it('calls registered listeners when notified', () => {
        const log = [];
        const comm = Comm(msg => log.push(msg));
        let statusVal, progVal, logArgs;
        comm.onStatus(v => statusVal = v);
        comm.onProgress(v => progVal = v);
        comm.onLog((...args) => logArgs = args);

        comm.notifyStatus('s');
        comm.notifyProgress(0.5);
        comm.notifyLog('a','b');

        expect(statusVal).to.equal('s');
        expect(progVal).to.equal(0.5);
        expect(logArgs).to.deep.equal(['a','b']);
        // also original log function received call
        expect(log[0]).to.equal('a');
    });
});
