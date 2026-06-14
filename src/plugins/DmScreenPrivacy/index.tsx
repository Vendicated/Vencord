import definePlugin from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";

// ─── Settings ────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    hideEntireDm: {
        type: OptionType.BOOLEAN,
        description: "Hide entire DM (including input box) instead of only messages",
        default: false
    },
    blurMode: {
        type: OptionType.BOOLEAN,
        description: "Blur content instead of completely hiding it",
        default: true
    }
});

// ─── State ────────────────────────────────────────────────────────────────────

let styleEl:       HTMLStyleElement | null = null;
let interval:      ReturnType<typeof setInterval> | null = null;
let revealBtn:     HTMLButtonElement | null = null;
let lastPath       = "";
let lastShareState = false;

const revealedDMs = new Set<string>();

// ─── Styles ───────────────────────────────────────────────────────────────────

function injectStyles() {
    if (styleEl) return;

    styleEl = document.createElement("style");
    styleEl.textContent = `
        .vc-dm-hidden {
            opacity: 0 !important;
            pointer-events: none !important;
            user-select: none !important;
        }

        .vc-dm-blur {
            filter: blur(16px) !important;
            pointer-events: none !important;
            user-select: none !important;
            transition: filter 0.3s ease;
        }

        .vc-dm-btn-wrap {
            display: inline-flex;
            align-items: center;
            margin-right: 8px;
            flex-shrink: 0;
        }

        .vc-dm-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            height: 30px;
            padding: 0 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12.5px;
            font-weight: 600;
            font-family: var(--font-primary, sans-serif);
            letter-spacing: 0.01em;
            white-space: nowrap;
            flex-shrink: 0;
            transition: background 0.15s ease, opacity 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
            outline: none;
        }

        .vc-dm-btn.vc-btn-reveal {
            background: var(--brand-experiment, #5865f2);
            color: #fff;
            box-shadow: 0 1px 4px rgba(88, 101, 242, 0.35);
        }
        .vc-dm-btn.vc-btn-reveal:hover {
            background: var(--brand-experiment-400, #4752c4);
            box-shadow: 0 2px 8px rgba(88, 101, 242, 0.45);
        }

        .vc-dm-btn.vc-btn-hide {
            background: var(--background-modifier-hover, rgba(79,84,92,0.16));
            color: var(--interactive-normal, #b5bac1);
            box-shadow: none;
        }
        .vc-dm-btn.vc-btn-hide:hover {
            background: var(--background-modifier-selected, rgba(79,84,92,0.32));
            color: var(--interactive-hover, #dbdee1);
        }

        .vc-dm-btn:active { transform: scale(0.95); }
        .vc-dm-btn:focus-visible {
            box-shadow: 0 0 0 2px var(--brand-experiment, #5865f2);
        }

        .vc-dm-btn svg {
            flex-shrink: 0;
            display: block;
        }

        /* ─── Settings page GitHub button ─── */
        .vc-gh-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            font-family: var(--font-primary, sans-serif);
            background: var(--background-secondary-alt, #1e1f22);
            color: var(--text-normal, #dbdee1);
            transition: background 0.15s ease, transform 0.1s ease;
            text-decoration: none;
        }
        .vc-gh-btn:hover {
            background: var(--background-modifier-hover, rgba(79,84,92,0.32));
        }
        .vc-gh-btn:active { transform: scale(0.97); }
    `;

    document.head.appendChild(styleEl);
}

// ─── Detection helpers ────────────────────────────────────────────────────────

function isScreenSharing(): boolean {
    return !!(
        document.querySelector('[aria-label*="Stop Streaming"]') ||
        document.querySelector('[aria-label*="Stop Sharing"]')
    );
}

function getCurrentDmId(): string | null {
    return window.location.pathname.match(/\/channels\/@me\/(\d+)/)?.[1] ?? null;
}

function isDm(): boolean {
    return (
        window.location.pathname.startsWith("/channels/@me/") &&
        getCurrentDmId() !== null
    );
}

// ─── Toolbar finder ───────────────────────────────────────────────────────────

function findChatToolbar(): HTMLElement | null {
    const byCall =
        document.querySelector('[aria-label="Start Voice Call"]')?.closest('[class*="toolbar"]') as HTMLElement | null ??
        document.querySelector('[aria-label="Start Video Call"]')?.closest('[class*="toolbar"]') as HTMLElement | null ??
        document.querySelector('[aria-label="Search"]')?.closest('[class*="toolbar"]') as HTMLElement | null;

    if (byCall) return byCall;

    const header =
        document.querySelector('[class*="chat"] [class*="toolbar"]') as HTMLElement | null ??
        document.querySelector('[class*="channelHeader"] [class*="toolbar"]') as HTMLElement | null ??
        document.querySelector('[class*="header"] [class*="toolbar"]') as HTMLElement | null;

    if (header) return header;

    const all = document.querySelectorAll<HTMLElement>('[class*="toolbar"]');
    for (const t of all) {
        if (t.children.length > 3) return t;
    }

    return all[all.length - 1] ?? null;
}

// ─── Class cleanup ────────────────────────────────────────────────────────────

function clearClasses() {
    document.querySelectorAll<HTMLElement>(".vc-dm-hidden, .vc-dm-blur").forEach(el => {
        el.classList.remove("vc-dm-hidden", "vc-dm-blur");
    });
}

// ─── Message / main area hiding ───────────────────────────────────────────────

function findChatTarget(): HTMLElement | null {
    if (settings.store.hideEntireDm) {
        return document.querySelector("main") as HTMLElement | null;
    }

    // Try multiple selectors — Discord changes class names between updates
    return (
        (document.querySelector('[data-list-id="chat-messages"]')?.parentElement as HTMLElement | null)
        ?? (document.querySelector('[class*="messagesWrapper"]') as HTMLElement | null)
        ?? (document.querySelector('[class*="chatContent"]') as HTMLElement | null)
        ?? (document.querySelector('[class*="content"] [class*="scroller"]')?.parentElement as HTMLElement | null)
        ?? (document.querySelector('main [class*="scroller"]')?.parentElement as HTMLElement | null)
    );
}

function hideCurrentDm(dmId: string) {
    if (revealedDMs.has(dmId)) return;

    const target = findChatTarget();
    if (!target) return;

    target.classList.remove("vc-dm-hidden", "vc-dm-blur");
    target.classList.add(settings.store.blurMode ? "vc-dm-blur" : "vc-dm-hidden");
}

// ─── Reveal button ────────────────────────────────────────────────────────────

const SVG_EYE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const SVG_EYE_OFF = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function syncButton(btn: HTMLButtonElement, dmId: string) {
    const revealed = revealedDMs.has(dmId);
    btn.innerHTML = `${revealed ? SVG_EYE_OFF : SVG_EYE}${revealed ? "Hide DM" : "Reveal DM"}`;
    btn.className = `vc-dm-btn ${revealed ? "vc-btn-hide" : "vc-btn-reveal"}`;
    btn.title = revealed
        ? "Click to hide this DM again"
        : "Click to temporarily reveal this DM";
    btn.setAttribute("aria-label", btn.title);
}

function injectButton(dmId: string) {
    const toolbar = findChatToolbar();
    if (!toolbar) return;

    let btn = toolbar.querySelector<HTMLButtonElement>(".vc-dm-btn");

    if (!btn) {
        const wrap = document.createElement("div");
        wrap.className = "vc-dm-btn-wrap";

        btn = document.createElement("button");
        btn.onclick = () => {
            revealedDMs.has(dmId)
                ? revealedDMs.delete(dmId)
                : revealedDMs.add(dmId);
            updatePrivacy();
        };

        wrap.appendChild(btn);
        toolbar.insertBefore(wrap, toolbar.firstChild);
    }

    syncButton(btn, dmId);
    revealBtn = btn;
}

function removeRevealButton() {
    const wrap = revealBtn?.closest(".vc-dm-btn-wrap");
    (wrap ?? revealBtn)?.remove();
    revealBtn = null;
}

// ─── Core update loop ─────────────────────────────────────────────────────────

function updatePrivacy() {
    const sharing = isScreenSharing();

    clearClasses();

    if (!sharing) {
        removeRevealButton();
        revealedDMs.clear();
        return;
    }

    if (!isDm()) {
        removeRevealButton();
        return;
    }

    const dmId = getCurrentDmId();
    if (!dmId) return;

    injectButton(dmId);
    hideCurrentDm(dmId);
}

// ─── Settings page GitHub button ──────────────────────────────────────────────

const SVG_GITHUB = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;

function SettingsAboutComponent() {
    return React.createElement(
        "div",
        { style: { marginTop: "8px" } },
        React.createElement(
            "a",
            {
                className: "vc-gh-btn",
                href: "https://github.com/fake181/DmScreenPrivacy",
                target: "_blank",
                rel: "noreferrer"
            },
            React.createElement("span", {
                dangerouslySetInnerHTML: { __html: SVG_GITHUB }
            }),
            "Source Code"
        )
    );
}

// ─── Plugin entry ─────────────────────────────────────────────────────────────

export default definePlugin({
    name: "DMScreenPrivacy",
    description: "Automatically blurs or hides your DMs while screen sharing to protect your privacy",

    authors: [
        {
            name: "crusader",
            id: 342776697105678346n
        }
    ],

    settings,

    settingsAboutComponent: SettingsAboutComponent,

    start() {
        injectStyles();

        interval = setInterval(() => {
            const shareState  = isScreenSharing();
            const currentPath = window.location.pathname;

            const changed =
                shareState !== lastShareState ||
                currentPath !== lastPath;

            if (!changed) return;

            lastShareState = shareState;
            lastPath       = currentPath;

            updatePrivacy();
        }, 500);

        updatePrivacy();
    },

    stop() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }

        clearClasses();
        removeRevealButton();
        revealedDMs.clear();

        styleEl?.remove();
        styleEl = null;

        lastPath       = "";
        lastShareState = false;
    }
});