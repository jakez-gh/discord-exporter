
// ==UserScript==
// @name         Discord DM Exporter v3.3.32 Modular Build
// @namespace    http://tampermonkey.net/
// @version      3.3.32
// @description  Built from modular source files
// @match        https://discord.com/channels/@me/*
// @run-at       document-idle
// @grant        GM_download
// ==/UserScript==

(function() {
'use strict';
console.log('Discord Exporter script loaded (version 3.3.32, built 2026-02-22T20:53:20.942Z)');
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
 * MODULE: slice/extract.js
 ************************************************************/
 function Extract(Config, Dom, Log) {
    const extractors = [];

    return {
        register(fn) {
            extractors.push(fn);
        },

        run() {
            const messages = Dom.items().map(li => {
                const base = this.base(li);
                extractors.forEach(fn => fn(li, base));
                return base;
            });

            return {
                text: messages.map(m => `[${m.timestamp}] ${m.username}: ${m.content}`).join('\n'),
                json: { messages }
            };
        },

        base(li) {
            const wrapper = li.querySelector('[role="article"]') || li;

            return {
                timestamp: wrapper.querySelector('time')?.getAttribute('datetime') || '',
                username: wrapper.querySelector('[id^="message-username"]')?.innerText.trim() || '',
                content: wrapper.querySelector('[id^="message-content"]')?.innerText.trim() || '',
                attachments: [],
                stickers: []
            };
        }
    };
}



/************************************************************
 * MODULE: slice/save.js
 ************************************************************/
 function Save(Config, Log, UI) {
    return {
        // note: returning promise as async helps tests await and logs
        async download(type, Extract) {
            console.log('Save.download invoked, type=', type);
            const { text, json } = Extract.run();
            const total = json.messages.length;
            console.log('Save.extract returned', total, 'messages');
            const config = Config || {};
            const logInterval = config.logInterval || 50;

            if (type === 'md') {
                console.log('Generating markdown output');
                let md = '# Messages\n';
                let attachIdx = 0;
                for (let i = 0; i < json.messages.length; i++) {
                    const m = json.messages[i];
                    const line = `- [${m.timestamp}] **${m.username}**: ${m.content}`;
                    md += line + '\n';
                    if (i % logInterval === 0) console.log(line);
                    if (UI && UI.setStatus) {
                        UI.setStatus(`Extracting… ${i+1}/${total}`);
                    }
                    if (m.attachments && m.attachments.length) {
                        m.attachments.forEach(url => {
                            const ext = url.split('.').pop().split('?')[0];
                            const fname = `attachment-${++attachIdx}.${ext}`;
                            md += `  [Attachment](${fname})\n`;
                            // trigger download of the binary
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fname;
                            a.click();
                        });
                    }
                }
                console.log(`Finished generating markdown for ${total} messages`);
                const blob = new Blob([md], { type: 'text/markdown' });
                const anchor = document.createElement('a');
                anchor.href = URL.createObjectURL(blob);
                anchor.download = 'discord.md';
                anchor.click();
                return;
            }
            // fallback existing behavior: log throttled, update UI
            if (UI && UI.setStatus) {
                json.messages.forEach((m, idx) => {
                    if (idx % logInterval === 0) {
                        console.log(`- [${m.timestamp}] ${m.username}: ${m.content}`);
                    }
                    UI.setStatus(`Extracting… ${idx+1}/${total}`);
                });
            }
            console.log(`Finished ${total} messages`);

            const blob = new Blob(
                [type === 'txt' ? text : JSON.stringify(json, null, 2)],
                { type: type === 'txt' ? 'text/plain' : 'application/json' }
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `discord_.${type}`;
            a.click();
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Save;
}




/************************************************************
 * MODULE: slice/scroll.js
 ************************************************************/
 function Scroll(Config, Dom, UI, Log) {
    let interval = null;
    let lastChange = 0;
    let lastCount = 0;
    // persistent buffer of seen message ids and their order.  tracked across
    // calls so tests and later extraction can consult it.
    let seenIds = new Set();
    let seenOrder = [];
    // note: we no longer keep a separate "seenCount" variable; callers
    // should use seenOrder.length when they care about the number of
    // unique messages seen.
    console.log('Scroll module initialized, file slice/scroll.js');

    return {
        start() {
            let scroller = Dom.scroller();
            console.log('scroll.start invoked, scroller=', scroller);
            if (!scroller) {
                UI.showModal('Scroller not found; cannot scroll.');
                return UI.setStatus('Scroller not found.');
            }

            // locate first ancestor that actually overflows; this is the
            // element through which Discord implements scrolling.
            let candidate = scroller;
            while (candidate && candidate.scrollHeight <= candidate.clientHeight) {
                candidate = candidate.parentElement;
            }
            if (candidate && candidate !== scroller) {
                scroller = candidate;
                console.log('using ancestor scroller', scroller);
            }

            // reset buffer each time we start scrolling so earlier runs don't
            // contaminate the counts.
            seenIds.clear();
            seenOrder.length = 0;
            lastCount = 0;

            const scanItems = () => {
                const items = Dom.items();
                for (let i = 0; i < items.length; i++) {
                    const id = items[i] && items[i].getAttribute && items[i].getAttribute('id');
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                        seenOrder.push(id);
                    }
                }
            };
            scanItems();
            lastCount = seenOrder.length;

            // helper to read first message id for stall detection/update reasons
            const getFirstId = () => {
                const first = Dom.items()[0];
                return first ? (first.getAttribute('id') || '') : null;
            };
            let lastFirstId = getFirstId();
            lastChange = Date.now();

            UI.showModal('Scrolling…');

            // build status helper including oldest message timestamp
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
                UI.setStatus(`Scrolling… ${count} messages seen (oldest ${ts})`);
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
                            if (UI.setProgress) {
                                UI.setProgress(Math.min(newSeen / 10000, 1));
                            }
                        }
                        stallCount = 0;

                        const before = scroller.scrollTop;
                        scroller.scrollTop = 0;
                        console.log('observer scroll, before=', before, 'after=', scroller.scrollTop);
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
                console.log('scroller.scrollTop set, before=', before, 'after=', scroller.scrollTop,'dirUp=',directionUp);

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
                    if (UI.setProgress) {
                        UI.setProgress(Math.min(newSeenCount / 10000, 1));
                    }
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
                    console.log('auto-stop triggered after', stallCount, 'stalls');
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
            UI.hideModal();
            UI.setStatus(auto ? 'Reached top. Extracting…' : 'Stopped.');
            UI.enableSave();
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
 function UI(Config, Log) {
    return {
        init(callbacks) {
            // allow caller to pass in a DOM helper if available so we can
            // wait for messages before marking ready
            this.cb = callbacks;
            this.dom = callbacks.dom;
            this.injectStyles();
            this.createPanel();
            this.makeDraggable();

            // start with a tentative message and poll until we see content *and* things quiet down
            let lastLog = 0;
            const origLog = console.log;
            console.log = (...args) => {
                lastLog = Date.now();
                origLog.apply(console, args);
            };

            const check = () => {
                let count = 0;
                if (this.dom) {
                    count = this.dom.items().length;
                }
                const now = Date.now();
                if (count > 0 && now - lastLog >= 500) {
                    // restore original log
                    console.log = origLog;
                    this.setStatus('Ready.');
                } else {
                    this.setStatus(`Waiting for chat messages (${count} seen)…`);
                    setTimeout(check, 500);
                }
            };
            check();
        },

        createPanel() {
            const panel = document.createElement('div');
            panel.id = Config.ui.panelId;
            panel.innerHTML = `
                <div style="font-size:12px; margin-bottom:4px;">
                    Discord chat exporter (Tampermonkey script by Ben)
                </div>
                <button id="dmexp-start">Start</button>
                <button id="dmexp-stop">Stop</button>
                <button id="dmexp-save-txt" disabled>Save TXT</button>
                <button id="dmexp-save-json" disabled>Save JSON</button>
                <div id="${Config.ui.statusId}"></div>
                <div id="${Config.ui.progressId}" style="width:100%;background:#444;margin-top:4px;">
                    <div id="${Config.ui.progressBarId}" style="width:0%;height:6px;background:#0f0;transition:width 0.2s;"></div>
                </div>
            `;
            document.body.appendChild(panel);

            document.getElementById('dmexp-start').onclick = this.cb.onStart;
            document.getElementById('dmexp-stop').onclick = this.cb.onStop;
            document.getElementById('dmexp-save-txt').onclick = this.cb.onSaveTxt;
            document.getElementById('dmexp-save-json').onclick = this.cb.onSaveJson;
        },

        setStatus(msg) {
            document.getElementById(Config.ui.statusId).textContent = msg;
            console.log('Status update:', msg);
        },
        injectStyles() {
            const css = `
#${Config.ui.panelId} {
    position: fixed;
    right: 10px;
    bottom: 10px;
    background-color: rgba(0, 123, 255, 0.9);
    color: white;
    padding: 8px;
    border-radius: 8px;
    z-index: 10000;
    font-family: Arial, sans-serif;
}
#${Config.ui.panelId} button {
    margin: 2px;
    padding: 4px 8px;
    background-color: #ffc107;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
#${Config.ui.panelId} #${Config.ui.statusId} {
    margin-top: 4px;
    font-size: 12px;
}
.dmexp-header-button {
    position: fixed;
    top: 80px;
    right: 20px;
    background-color: #28a745;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    z-index: 10001;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
}
`;
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        },
        // modal overlay for status updates
        showModal(msg) {
            let m = document.getElementById('dmexp-modal');
            if (!m) {
                m = document.createElement('div');
                m.id = 'dmexp-modal';
                m.style = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                          'background:rgba(0,0,0,0.5);display:flex;' +
                          'align-items:center;justify-content:center;z-index:10002;';
                const inner = document.createElement('div');
                inner.id = 'dmexp-modal-text';
                inner.style = 'background:white;padding:20px;border-radius:8px;max-width:80%;';
                m.appendChild(inner);
                document.body.appendChild(m);
            }
            document.getElementById('dmexp-modal-text').textContent = msg;
            m.style.display = 'flex';
        },
        hideModal() {
            const m = document.getElementById('dmexp-modal');
            if (m) m.style.display = 'none';
        },
        enableSave() {
            document.getElementById('dmexp-save-txt').disabled = false;
            document.getElementById('dmexp-save-json').disabled = false;
        },
        setProgress(frac) {
            const bar = document.getElementById(Config.ui.progressBarId);
            if (bar) {
                bar.style.width = `${Math.floor(frac * 100)}%`;
            }
        },
        makeDraggable() {
            const panel = document.getElementById(Config.ui.panelId);
            let isDown = false;
            let offset = [0,0];
            panel.addEventListener('mousedown', function(e) {
                isDown = true;
                // make dimensions explicit so the element doesn't change size when
                // we remove the anchoring rules below or while dragging around
                panel.style.width = panel.offsetWidth + 'px';
                panel.style.height = panel.offsetHeight + 'px';

                // remove right/bottom anchors so left/top moves the box instead of
                // causing it to resize due to conflicting constraints
                panel.style.right = '';
                panel.style.bottom = '';
                offset = [panel.offsetLeft - e.clientX, panel.offsetTop - e.clientY];
            }, true);
            document.addEventListener('mouseup', function() {
                isDown = false;
            }, true);
            document.addEventListener('mousemove', function(event) {
                event.preventDefault();
                if (isDown) {
                    panel.style.left = (event.clientX + offset[0]) + 'px';
                    panel.style.top  = (event.clientY + offset[1]) + 'px';
                }
            }, true);
        }
    };
}

// support CommonJS in tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}



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

    const ui = UI(cfg, log);
    const scroll = Scroll(cfg, dom, ui, log);
    const extract = Extract(cfg, dom, log);
    const save = Save(cfg, log);

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
