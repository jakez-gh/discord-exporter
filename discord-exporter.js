// ==UserScript==
// @name         Discord DM Exporter v3 Modular
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Modular Discord DM exporter with upgrade packs
// @match        https://discord.com/channels/@me/*
// @run-at       document-idle
// @grant        GM_download
// ==/UserScript==

/* eslint-disable */
(function() {
    'use strict';

    // Module implementations are concatenated above by the build script.
    // The functions Config, Selectors, Dom, Log, UI, Scroll, Extract, Save,
    // UpgradeStickers and UpgradeAttachments are defined earlier in the IIFE
    // when `npm run build` is executed.

    // INIT
    const cfg = Config();
    const sel = Selectors();
    const dom = Dom(sel);
    const log = Log();

    // if the communication module is present it will have defined a global
    // `Comm` function; call it to get an instance.  In tests we may not
    // include the module so guard against undefined.
    const comm = (typeof Comm !== 'undefined') ? Comm(log) : null;

    const ui = UI(cfg, log, comm);
    const scroll = Scroll(cfg, dom, ui, log, comm);
    // conversation message storage sits cross-cutting and attaches to scroll
    const conv = (typeof ConversationMessages !== 'undefined') ? ConversationMessages(log) : null;
    if (conv) conv.attachScroll(scroll);

    const extract = Extract(cfg, dom, log, conv);
    if (conv && extract && typeof extract.attachConversation === 'function') {
        extract.attachConversation(conv);
    }
    const save = Save(cfg, log, comm);

    UpgradeStickers(extract);
    UpgradeAttachments(extract);

    setTimeout(() => {
        // pass dom helper so UI can watch for message load before declaring
        // itself "Ready"; keeps panel status in sync with actual content.
        ui.init({
            dom,
            onStart: () => scroll.start(),
            onStop: () => scroll.stop(false),
            onSaveTxt: () => save.download('txt', extract),
            onSaveJson: () => save.download('json', extract),
        });
    }, 2000);
})();
