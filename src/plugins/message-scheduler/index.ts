import definePlugin from "@utils/types";
import { MessageActions, SelectedChannelStore } from "@webpack/common";

interface ScheduledMessage {
    id: string;
    channelId: string;
    content: string;
    sendAt: number;
}

let memoryQueue: ScheduledMessage[] = [];
let observer: MutationObserver | null = null;
let styleTag: HTMLStyleElement | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

function saveQueueSafe(queue: ScheduledMessage[]) {
    memoryQueue = queue;
    try { window.localStorage.setItem('vencord_scheduled_msgs_final', JSON.stringify(queue)); } catch(e) {}
}

function loadQueueSafe(): ScheduledMessage[] {
    try {
        const stored = window.localStorage.getItem('vencord_scheduled_msgs_final');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return memoryQueue;
}

export default definePlugin({
    name: "MessageScheduler",
    description: "Plan messages to be sent at specific times. Fully client-side, zero-injection, DM-safe scheduler.",
    authors: [{ name: "1400hertz", id: 1n }],

    start() {
        injectStyles();
        setupObserver();
        startHeartbeat();
        // Request notification permission on startup
        if (window.Notification && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    },

    stop() {
        if (observer) observer.disconnect();
        if (styleTag) styleTag.remove();
        if (schedulerInterval) clearInterval(schedulerInterval);
        document.getElementById('vencord-scheduler-btn')?.remove();
        document.getElementById('scheduler-modal-root')?.remove();
    }
});

function startHeartbeat() {
    schedulerInterval = setInterval(() => {
        const now = Date.now();
        let queue = loadQueueSafe();
        let pendingQueue: ScheduledMessage[] = [];
        let modified = false;

        for (let msg of queue) {
            if (now >= msg.sendAt) {
                modified = true;
                
                try {
                    // Send message safely using raw MessageActions
                    // @ts-ignore
                    MessageActions.sendMessage(
                        msg.channelId, 
                        { content: msg.content.trim(), invalidEmojis: [], validNonShortcutEmojis: [], tts: false }, 
                        undefined, 
                        {}
                    ).then(() => {
                        if (window.Notification && Notification.permission === "granted") {
                            new Notification("Message Scheduler (1400hertz)", {
                                body: "Your scheduled message has been successfully sent!",
                                icon: "https://cdn.discordapp.com/embed/avatars/0.png"
                            });
                        }
                    }).catch(console.error);

                } catch (e) {
                    console.error("[MessageScheduler] Error sending message:", e);
                }
            } else {
                pendingQueue.push(msg);
            }
        }

        if (modified) {
            saveQueueSafe(pendingQueue);
            refreshListUI();
        }
    }, 2000);
}

function setupObserver() {
    observer = new MutationObserver(() => {
        if (document.getElementById('vencord-scheduler-btn')) return;

        const buttonsContainer = document.querySelector('[class*="channelTextArea"] [class*="buttons_"]');
        if (buttonsContainer) {
            const btn = document.createElement('button');
            btn.id = 'vencord-scheduler-btn';
            btn.className = 'custom-sched-btn';
            btn.innerHTML = `
                <div class="sched-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm-.5-16a.5.5 0 0 0-.5.5V12a1 1 0 0 0 .29.71l3 3a.5.5 0 0 0 .71-.71l-2.5-2.5V7.5a.5.5 0 0 0-.5-.5Z" clip-rule="evenodd"></path>
                    </svg>
                </div>
            `;
            btn.onclick = openSchedulerUI;

            // KUSURSUZ JS TOOLTIP (Discord sınırlarını delip geçer)
            let tooltipEl: HTMLDivElement | null = null;
            btn.onmouseenter = () => {
                const rect = btn.getBoundingClientRect();
                tooltipEl = document.createElement('div');
                tooltipEl.className = 'sched-tooltip-js';
                tooltipEl.textContent = 'Schedule Message';
                document.body.appendChild(tooltipEl);
                
                const tooltipRect = tooltipEl.getBoundingClientRect();
                tooltipEl.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
                tooltipEl.style.top = `${rect.top - tooltipRect.height - 8}px`;
                
                requestAnimationFrame(() => tooltipEl!.style.opacity = '1');
            };
            
            btn.onmouseleave = () => {
                if (tooltipEl) {
                    tooltipEl.remove();
                    tooltipEl = null;
                }
            };

            buttonsContainer.insertBefore(btn, buttonsContainer.firstChild);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function openSchedulerUI() {
    if (document.getElementById('scheduler-modal-root')) return;

    const modalRoot = document.createElement('div');
    modalRoot.id = 'scheduler-modal-root';
    modalRoot.innerHTML = `
        <div class="sched-overlay" id="sched-overlay-bg">
            <div class="sched-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: var(--header-primary); font-size: 20px; font-weight: bold;">Schedule Message</h2>
                    <button id="sched-btn-view-list" class="sched-btn-secondary">📋 View Queue</button>
                </div>
                
                <div id="sched-main-view">
                    <label class="sched-label">DATE AND TIME</label>
                    <input type="datetime-local" id="sched-time-input" class="sched-input" />
                    
                    <label class="sched-label">YOUR MESSAGE</label>
                    <textarea id="sched-text-input" class="sched-input sched-textarea" placeholder="Type your message (Markdown supported)"></textarea>
                    
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 15px; padding: 8px; background: var(--background-secondary, #2b2d31); border-radius: 6px; border: 1px solid var(--background-tertiary, #1e1f22);">
                        💡 <b>To ping, use ID:</b> <code>&lt;@User_ID&gt;</code> or <code>&lt;@&amp;Role_ID&gt;</code>
                    </div>

                    <div id="sched-status" style="margin-bottom: 15px; font-weight: bold; text-align: center; display: none;"></div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px;">
                        <button id="sched-btn-cancel" class="sched-btn-secondary">Cancel</button>
                        <button id="sched-btn-confirm" class="sched-btn-primary">Schedule</button>
                    </div>
                </div>

                <div id="sched-list-view" style="display: none;">
                    <div id="sched-list-container" style="max-height: 250px; overflow-y: auto;"></div>
                    <div style="display: flex; justify-content: center; margin-top: 15px;">
                        <button id="sched-btn-back-main" class="sched-btn-secondary">⬅ Back</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalRoot);

    // Event Listeners for UI interaction
    document.getElementById('sched-overlay-bg')?.addEventListener('click', (e) => { if (e.target === document.getElementById('sched-overlay-bg')) modalRoot.remove(); });
    document.getElementById('sched-btn-cancel')?.addEventListener('click', () => modalRoot.remove());
    
    document.getElementById('sched-btn-view-list')?.addEventListener('click', () => {
        document.getElementById('sched-main-view')!.style.display = 'none';
        document.getElementById('sched-list-view')!.style.display = 'block';
        document.getElementById('sched-btn-view-list')!.style.display = 'none';
        refreshListUI();
    });

    document.getElementById('sched-btn-back-main')?.addEventListener('click', () => {
        document.getElementById('sched-list-view')!.style.display = 'none';
        document.getElementById('sched-main-view')!.style.display = 'block';
        document.getElementById('sched-btn-view-list')!.style.display = 'block';
    });

    document.getElementById('sched-btn-confirm')?.addEventListener('click', () => {
        const timeInput = (document.getElementById('sched-time-input') as HTMLInputElement).value;
        const textInput = (document.getElementById('sched-text-input') as HTMLTextAreaElement).value;
        const statusBox = document.getElementById('sched-status') as HTMLDivElement;

        if (!timeInput || !textInput.trim()) {
            statusBox.innerHTML = "❌ Fill in date and message.";
            statusBox.style.color = "#da373c";
            statusBox.style.display = 'block';
            return;
        }

        const targetTime = new Date(timeInput).getTime();
        if (targetTime <= Date.now()) {
            statusBox.innerHTML = "❌ Cannot schedule in the past.";
            statusBox.style.color = "#da373c";
            statusBox.style.display = 'block';
            return;
        }

        // Fetch Channel ID
        let channelId = "";
        try {
            // @ts-ignore
            channelId = SelectedChannelStore?.getChannelId();
        } catch(e) {}
        if (!channelId) channelId = window.location.pathname.split('/').pop() || "";

        if (!channelId) {
            statusBox.innerHTML = "❌ Channel not found!";
            statusBox.style.color = "#da373c";
            statusBox.style.display = 'block';
            return;
        }

        let queue = loadQueueSafe();
        queue.push({
            id: Date.now().toString(),
            channelId: channelId,
            content: textInput,
            sendAt: targetTime
        });
        saveQueueSafe(queue);

        const btn = document.getElementById('sched-btn-confirm') as HTMLButtonElement;
        btn.textContent = "Scheduled!";
        btn.style.backgroundColor = "#23a559";
        
        setTimeout(() => modalRoot.remove(), 400);
    });
}

function refreshListUI() {
    const listContainer = document.getElementById('sched-list-container');
    if (!listContainer) return;

    const queue = loadQueueSafe();
    listContainer.innerHTML = '';

    if (queue.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No scheduled messages.</div>`;
        return;
    }

    queue.forEach(msg => {
        const dateStr = new Date(msg.sendAt).toLocaleString();
        const itemDiv = document.createElement('div');
        itemDiv.className = 'sched-list-item';
        itemDiv.innerHTML = `
            <div style="flex: 1; overflow: hidden;">
                <div style="font-size: 12px; font-weight: bold; color: var(--text-muted); margin-bottom: 4px;">📅 ${dateStr}</div>
                <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-normal);">${msg.content}</div>
            </div>
            <button class="sched-btn-danger" data-id="${msg.id}">❌</button>
        `;
        listContainer.appendChild(itemDiv);
    });

    listContainer.querySelectorAll('.sched-btn-danger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idToRemove = (e.currentTarget as HTMLButtonElement).getAttribute('data-id');
            if (idToRemove) {
                let currentQueue = loadQueueSafe();
                saveQueueSafe(currentQueue.filter(m => m.id !== idToRemove));
                refreshListUI();
            }
        });
    });
}

function injectStyles() {
    styleTag = document.createElement("style");
    styleTag.textContent = `
        /* Main Button Integration */
        .custom-sched-btn { background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; height: 44px; width: 40px; position: relative; overflow: visible; }
        .sched-icon-wrapper { color: var(--interactive-normal, #b5bac1); transition: color 0.15s ease-out; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .custom-sched-btn:hover .sched-icon-wrapper { color: var(--interactive-hover, #dbdee1); }
        
        /* JS Tooltip Styling (Sayfanın En Üst Katmanı) */
        .sched-tooltip-js {
            position: fixed;
            background-color: var(--background-floating, #111214); color: var(--text-normal, #dbdee1);
            padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: 600; white-space: nowrap;
            box-shadow: var(--elevation-high, 0 8px 16px rgba(0,0,0,0.24));
            pointer-events: none; z-index: 999999; opacity: 0; transition: opacity 0.1s ease;
        }
        .sched-tooltip-js::after {
            content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px;
            border-width: 5px; border-style: solid; border-color: var(--background-floating, #111214) transparent transparent transparent;
        }
        
        /* Modal Overlay & Styling */
        .sched-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .sched-content { background: var(--background-primary, #313338); padding: 24px; border-radius: 12px; width: 460px; color: var(--text-normal, #dbdee1); font-family: 'gg sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); border: 1px solid var(--background-tertiary, #1e1f22); }
        
        .sched-label { color: var(--header-secondary, #b5bac1); font-size: 12px; font-weight: 800; margin-bottom: 8px; display: block; text-transform: uppercase; }
        .sched-input { width: 100%; background: var(--background-tertiary, #1e1f22); color: var(--text-normal, #dbdee1); border: 1px solid var(--background-secondary-alt, #2b2d31); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-family: inherit; font-size: 15px; box-sizing: border-box; }
        .sched-input:focus { outline: none; border-color: #5865F2; }
        .sched-textarea { height: 100px; resize: none; }
        
        /* Buttons */
        .sched-btn-primary { background: #5865F2; color: white; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s; }
        .sched-btn-primary:hover { background: #4752C4; }
        .sched-btn-secondary { background: transparent; color: white; border: none; padding: 10px 24px; cursor: pointer; opacity: 0.7; font-weight: 500; font-size: 14px; transition: opacity 0.2s; }
        .sched-btn-secondary:hover { opacity: 1; text-decoration: underline; }
        
        /* List Items */
        .sched-list-item { display: flex; align-items: center; justify-content: space-between; background: var(--background-secondary, #2b2d31); padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--background-tertiary, #1e1f22); }
        .sched-btn-danger { background: transparent; color: #da373c; border: none; cursor: pointer; font-size: 16px; padding: 8px; border-radius: 4px; transition: background 0.2s; }
        .sched-btn-danger:hover { background: rgba(218, 55, 60, 0.1); }
    `;
    document.head.appendChild(styleTag);
}