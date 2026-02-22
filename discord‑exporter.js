// ==UserScript==
// @name         Discord DM Exporter v3 Modular
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Modular Discord DM exporter with upgrade packs
// @match        https://discord.com/channels/@me/*
// @run-at       document-idle
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    // IMPORT ALL MODULES (copy/paste from your folders)
    // -------------------
    // core/
    const Config = (/* paste config.js here */).Config;
    const Selectors = (/* paste selectors.js here */).Selectors;
    const Dom = (/* paste dom.js here */).Dom;
    const Log = (/* paste log.js here */).Log;

    // slice/
    const UI = (/* paste ui.js here */).UI;
    const Scroll = (/* paste scroll.js here */).Scroll;
    const Extract = (/* paste extract.js here */).Extract;
    const Save = (/* paste save.js here */).Save;

    // upgrade/
    const UpgradeStickers = (/* paste stickers.js here */).UpgradeStickers;
    const UpgradeAttachments = (/* paste attachments.js here */).UpgradeAttachments;

    // INIT
    const cfg = Config();
    const sel = Selectors();
    const dom = Dom(sel);
    const log = Log();

    const ui = UI(cfg, log);
    const scroll = Scroll(cfg, dom, ui, log);
    const extract = Extract(cfg, dom, log);
    const save = Save(cfg, log);

    UpgradeStickers(extract);
    UpgradeAttachments(extract);

    setTimeout(() => {
        ui.init({
            onStart: () => scroll.start(),
            onStop: () => scroll.stop(false),
            onSaveTxt: () => save.download('txt', extract),
            onSaveJson: () => save.download('json', extract),
        });
    }, 2000);
})();
