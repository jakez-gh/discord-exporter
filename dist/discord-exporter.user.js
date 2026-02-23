
// ==UserScript==
// @name         Discord DM Exporter v3.3.35 Modular Build
// @namespace    http://tampermonkey.net/
// @version      3.3.35
// @description  Built from modular source files
// @match        https://discord.com/channels/@me/*
// @run-at       document-idle
// @grant        GM_download
// ==/UserScript==

(function() {
'use strict';
console.log('Discord Exporter script loaded (version 3.3.35, built 2026-02-23T15:46:20.454Z)');
// ------------------------------------------------------------
// BEGIN CONCATENATED MODULES
// ------------------------------------------------------------


/************************************************************
 * MODULE: core/config.js
 ************************************************************/
function Config() {
    return {
        scrollIntervalMs: 900,
        scrollStallTimeoutMs: 8000,
        ui: {
            panelId: 'dmexp-panel',
            statusId: 'dmexp-status',
            progressId: 'dmexp-progress',
            progressBarId: 'dmexp-progress-bar',
        }
    };
}

// support CommonJS require for tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}



/************************************************************
 * MODULE: core/dom.js
 ************************************************************/
function Dom(Selectors) {
    return {
        list() {
            return document.querySelector(Selectors.messageList);
        },
        scroller() {
            // return the message list; the correct scrollable parent will be
            // determined by Scroll.start since Discord wraps the list in
            // several divs and the class names change often.
            return this.list() || null;
        },
        items() {
            const list = this.list();
            return list ? Array.from(list.querySelectorAll(Selectors.messageItem)) : [];
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dom;
}



/************************************************************
 * MODULE: core/log.js
 ************************************************************/
function Log() {
    return {
        info: (...a) => console.log('[DMEXP]', ...a),
        warn: (...a) => console.warn('[DMEXP]', ...a),
        error: (...a) => console.error('[DMEXP]', ...a),
    };
}



/************************************************************
 * MODULE: core/selectors.js
 ************************************************************/
function  Selectors() {
    return {
        messageList: '[data-list-id="chat-messages"]',
        messageItem: 'li[role="listitem"], li.messageListItem__5126c',
        messageWrapper: '[role="article"]',
        timestamp: 'time[datetime]',
        username: '[id^="message-username-"]',
        content: '[id^="message-content-"]',
    };
}



/************************************************************
 * MODULE: slice/comm.js
 ************************************************************/
// wrapper proxying to horizontal/comm implementation
module.exports = require('../horizontal/comm');



/************************************************************
 * MODULE: slice/conversation-message-list.js
 ************************************************************/
// wrapper for compatibility; real implementation lives in vertical/conversation-message-list
module.exports = require('../vertical/conversation-message-list');


/************************************************************
 * MODULE: slice/conversation_messages.js
 ************************************************************/
// wrapper proxying to horizontal/conversation_messages
module.exports = require('../horizontal/conversation_messages');


/************************************************************
 * MODULE: slice/extract.js
 ************************************************************/
// wrapper pointing at vertical/extract implementation
module.exports = require('../vertical/extract');




/************************************************************
 * MODULE: slice/panel.js
 ************************************************************/
// wrapper proxying to horizontal/panel implementation
module.exports = require('../horizontal/panel');




/************************************************************
 * MODULE: slice/save.js
 ************************************************************/
// wrapper to keep original `slice/save` path working; implementation
// moved to vertical/save
module.exports = require('../vertical/save');




/************************************************************
 * MODULE: slice/scroll.js
 ************************************************************/
// compatibility shim: real implementation lives in vertical/scroll
module.exports = require('../vertical/scroll');

            // helper to read first message id for stall detection/update reasons
            const getFirstId = () => {
                const first = Dom.items()[0];
                return first ? (first.getAttribute('id') || '') : null;
            };
            let lastFirstId = getFirstId();
            lastChange = Date.now();

            // use communicator if available so UI updates happen via subscription
            const initialMsg = 'Scrolling…';
            if (comm) comm.notifyStatus(initialMsg);
            else console.log(initialMsg);

            // build status helper including oldest message timestamp
            //
            // During scrolling we prefer to put the text in the modal overlay
            // (which sits above the panel) so that users watching the progress can
            // see it even though the panel floats behind a translucent cover.  The
            // helper will fall back to `UI.setStatus` when a modal function isn't
            // available (such as in tests, or prior to the panel being created).
            const updateStatus = () => {
                const count = seenOrder.length; // use number of unique ids seen
                let ts = 'unknown';
                const first = Dom.items()[0];
                if (first) {
                    if (typeof first.querySelector === 'function') {
                        const t = first.querySelector('time');
                        if (t && t.dateTime) ts = new Date(t.dateTime).toLocaleString();
                    } else if (first.getAttribute) {
                        // try to read a datetime attribute if present
                        const dt = first.getAttribute('datetime') || first.getAttribute('data-datetime');
                        if (dt) ts = new Date(dt).toLocaleString();
                    }
                }
                const msg = `Scrolling… ${count} messages seen (oldest ${ts})`;
                // status belongs in the modal overlay during scroll rather than
                // the panel behind the glass pane
                if (comm) {
                    comm.notifyStatus(msg);
                } else if (UI.showModal) {
                    UI.showModal(msg);
                } else if (UI.setStatus) {
                    UI.setStatus(msg);
                }
            };

            // show the first status immediately so the panel isn't blank
            updateStatus();

            // use an observer to trigger immediate scrolling when new items arrive
            const list = Dom.list();
            if (list) {
                this._observer = new MutationObserver(muts => {
                    if (interval) {
                                // a DOM mutation occurred; scan for new ids and treat this
                        // as progress so we don't count it as a stall.  the
                        // observer usually fires shortly before or after Discord
                        // updates the list during network fetches.
                        scanItems();
                        const newSeen = seenOrder.length;
                        if (newSeen !== lastCount) {
                            lastCount = newSeen;
                            lastChange = Date.now();
                            updateStatus();
                            const prog = Math.min(newSeen / 10000, 1);
                            if (comm) comm.notifyProgress(prog);
                            else if (UI.setProgress) UI.setProgress(prog);
                        }
                        stallCount = 0;

                        const before = scroller.scrollTop;
                        scroller.scrollTop = 0;
                        if (comm) comm.notifyLog('observer scroll, before=', before, 'after=', scroller.scrollTop);
                        else console.log('observer scroll, before=', before, 'after=', scroller.scrollTop);
                    }
                });
                this._observer.observe(list, { childList: true, subtree: true });
            }

            // direction flag: normally scroll upward; only go downward when stuck
            let directionUp = true;
            let stallCount = 0; // consecutive ticks at top with no progress
            interval = setInterval(() => {
                const before = scroller.scrollTop;
                // normally we always try moving upward; only attempt a downward
                // nudge if we were already moving downward and we're not at the top.
                // this prevents a back‑and‑forth once we hit scrollTop===0.
                if (directionUp || before === 0) {
                    scroller.scrollTop = 0;
                } else {
                    scroller.scrollTop = scroller.scrollHeight;
                }
                // adjust direction based on whether movement occurred
                if (scroller.scrollTop !== before) {
                    // progress occurred (likely upward), reset to upward mode
                    directionUp = true;
                } else {
                    // no change; only flip if we aren't sitting at top
                    if (before !== 0) {
                        directionUp = !directionUp;
                    }
                }
                if (comm) comm.notifyLog('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);
                else console.log('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);

                // refresh seenIds before computing progress
                scanItems();
                const count = Dom.items().length;
                const currentFirst = getFirstId();
                const firstChanged = currentFirst && currentFirst !== lastFirstId;
                const newSeenCount = seenOrder.length;
                if (newSeenCount !== lastCount || firstChanged) {
                    lastCount = newSeenCount;
                    if (currentFirst) lastFirstId = currentFirst;
                    lastChange = Date.now();
                    updateStatus();
                    const prog = Math.min(newSeenCount / 10000, 1);
                    if (comm) comm.notifyProgress(prog);
                    else console.log('progress', prog);
                    stallCount = 0; // reset stall when progress seen
                } else {
                    // no progress this tick
                    if (Date.now() - lastChange > 10000) {
                        // been scrolling without new messages for 10s; refresh timestamp
                        updateStatus();
                    }
                    if (scroller.scrollTop === before && scroller.scrollTop === 0) {
                        stallCount++;
                    } else {
                        stallCount = 0;
                    }
                }
                if (stallCount >= 3 && Date.now() - lastChange > Config.scrollStallTimeoutMs) {
                    if (comm) comm.notifyLog('auto-stop triggered after', stallCount, 'stalls');
                    else console.log('auto-stop triggered after', stallCount, 'stalls');
                    this.stop(true);
                }
            }, Config.scrollIntervalMs);
        },

        stop(auto) {
            clearInterval(interval);
            interval = null;
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
            const finalMsg = auto ? 'Reached top. Extracting…' : 'Stopped.';
            if (comm) comm.notifyStatus(finalMsg);
            else console.log(finalMsg);
            // note: enabling save and hiding modal are UI concerns; communicator
            // clients (e.g. the UI layer) should implement those responses.
        },

        getSeenOrder() {
            // return a copy so callers can't mutate our internal buffer
            return seenOrder.slice();
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scroll;
}



/************************************************************
 * MODULE: slice/ui.js
 ************************************************************/
// shim that proxies to horizontal/ui implementation
module.exports = require('../horizontal/ui');




/************************************************************
 * MODULE: upgrade/attachments.js
 ************************************************************/
 function UpgradeAttachments(Extract) {
    Extract.register((li, msg) => {
        msg.attachments = [...li.querySelectorAll('a[href*="cdn.discordapp.com"]')]
            .map(a => a.href);
    });
}



/************************************************************
 * MODULE: upgrade/stickers.js
 ************************************************************/
 function UpgradeStickers(Extract) {
    Extract.register((li, msg) => {
        const nodes = li.querySelectorAll('[data-type="sticker"]');
        msg.stickers = [...nodes].map(n => ({
            id: n.getAttribute('data-id'),
            name: n.getAttribute('data-name')
        }));
    });
}



/************************************************************
 * MODULE: discord-exporter.js
 ************************************************************/
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



// ------------------------------------------------------------
// END CONCATENATED MODULES
// ------------------------------------------------------------

})(); // end userscript wrapper
