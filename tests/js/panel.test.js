/* eslint-env mocha */
const { expect } = require('chai');
const sinon = require('sinon');

const Config = require('../../core/config');
const PanelFactory = require('../../slice/panel');

describe('Panel module', () => {
    let sandbox;
    let dom;
    let window;
    let document;

    beforeEach(() => {
        dom = new (require('jsdom').JSDOM)(`<!DOCTYPE html><html><head></head><body></body></html>`, { runScripts: 'outside-only' });
        window = dom.window;
        document = window.document;
        global.document = document;
        global.window = window;
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        sandbox.restore();
        // tidy up global pollution
        delete global.document;
        delete global.window;
        // remove any inserted elements so later tests start clean
        const panel = document.getElementById(Config().ui.panelId);
        if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
        const style = document.querySelector('style');
        if (style && style.parentNode) style.parentNode.removeChild(style);
    });

    it('creates panel elements and attaches callbacks', () => {
        const msgs = [];
        const callbacks = {
            onStart: () => msgs.push('start'),
            onStop: () => msgs.push('stop'),
            onSaveTxt: () => msgs.push('txt'),
            onSaveJson: () => msgs.push('json')
        };

        const panel = PanelFactory(Config());
        panel.init(callbacks);

        expect(document.getElementById(Config().ui.panelId)).to.exist;
        document.getElementById('dmexp-start').click();
        document.getElementById('dmexp-stop').click();
        document.getElementById('dmexp-save-txt').click();
        document.getElementById('dmexp-save-json').click();
        expect(msgs).to.deep.equal(['start','stop','txt','json']);
    });

    it('setStatus updates status text', () => {
        const panel = PanelFactory(Config());
        panel.init({ onStart:() =>{}, onStop:() =>{}, onSaveTxt:() =>{}, onSaveJson:() =>{} });
        panel.setStatus('hello');
        const statusEl = document.getElementById(Config().ui.statusId);
        expect(statusEl.textContent).to.equal('hello');
    });

    it('enableSave toggles buttons off and on', () => {
        const panel = PanelFactory(Config());
        panel.init({ onStart:() =>{}, onStop:() =>{}, onSaveTxt:() =>{}, onSaveJson:() =>{} });
        expect(document.getElementById('dmexp-save-txt').disabled).to.be.true;
        expect(document.getElementById('dmexp-save-json').disabled).to.be.true;
        panel.enableSave();
        expect(document.getElementById('dmexp-save-txt').disabled).to.be.false;
        expect(document.getElementById('dmexp-save-json').disabled).to.be.false;
    });

    it('setProgress adjusts width correctly', () => {
        const panel = PanelFactory(Config());
        panel.init({ onStart:() =>{}, onStop:() =>{}, onSaveTxt:() =>{}, onSaveJson:() =>{} });
        panel.setProgress(0.3);
        const bar = document.getElementById(Config().ui.progressBarId);
        expect(bar.style.width).to.equal('30%');
        panel.setProgress(1);
        expect(bar.style.width).to.equal('100%');
    });

    it('panel can be dragged via mouse events', () => {
        const panel = PanelFactory(Config());
        panel.init({ onStart:() =>{}, onStop:() =>{}, onSaveTxt:() =>{}, onSaveJson:() =>{} });
        const el = document.getElementById(Config().ui.panelId);
        // fake measurements
        Object.defineProperty(el, 'offsetWidth', { value: 123, configurable: true });
        Object.defineProperty(el, 'offsetHeight', { value: 45, configurable: true });

        const mouseDown = new window.MouseEvent('mousedown', { clientX: 10, clientY: 20, bubbles: true });
        el.dispatchEvent(mouseDown);
        expect(el.style.width).to.equal('123px');
        expect(el.style.height).to.equal('45px');

        const move = new window.MouseEvent('mousemove', { clientX: 20, clientY: 30, bubbles: true });
        document.dispatchEvent(move);
        expect(el.style.left).to.match(/px$/);
        expect(el.style.top).to.match(/px$/);
    });
});
