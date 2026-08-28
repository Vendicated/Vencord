/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

const settings = definePluginSettings({
    showTranslate: { type: OptionType.BOOLEAN, description: "Show Translate Button", default: true, restartNeeded: false },
    showGift: { type: OptionType.BOOLEAN, description: "Show Gift Nitro Button", default: true, restartNeeded: false },
    showGif: { type: OptionType.BOOLEAN, description: "Show GIF Button", default: true, restartNeeded: false },
    showSticker: { type: OptionType.BOOLEAN, description: "Show Sticker Button", default: true, restartNeeded: false },
    showEmoji: { type: OptionType.BOOLEAN, description: "Show Emoji Button", default: true, restartNeeded: false },
    showApps: { type: OptionType.BOOLEAN, description: "Show Apps Button", default: true, restartNeeded: false },
    showSend: { type: OptionType.BOOLEAN, description: "Show Send Button", default: true, restartNeeded: false },
    showSeparator: { type: OptionType.BOOLEAN, description: "Show Separator Line", default: true, restartNeeded: false },
});

type SettingKey = keyof typeof settings.store;

function updateCSS() {
    let el = document.getElementById("vencord-hide-buttons-css") as HTMLStyleElement;
    if (!el) {
        el = document.createElement("style");
        el.id = "vencord-hide-buttons-css";
        document.head.appendChild(el);
    }

    const rules: string[] = [
        '[class*="buttons_"] { gap: 4px !important; display: flex !important; align-items: center !important; }',
        '[class*="buttons_"] > * { margin: 0 !important; }'
    ];

    if (!settings.store.showTranslate) {
        rules.push('[aria-label*="Translate"], [class*="translateButton"] { display: none !important; }');
    }
    if (!settings.store.showGift) {
        rules.push('[aria-label*="Gift Nitro"], [aria-label*="gift"], [class*="giftButton"] { display: none !important; }');
    }
    if (!settings.store.showGif) {
        rules.push('[aria-label="GIF"], [aria-label*="GIF "], [aria-label*=" GIF"] { display: none !important; }');
    }
    if (!settings.store.showSticker) {
        rules.push('[aria-label*="Sticker"], [aria-label*="sticker"] { display: none !important; }');
    }
    if (!settings.store.showEmoji) {
        rules.push('[aria-label*="Emoji"], [aria-label*="emoji"] { display: none !important; }');
    }
    if (!settings.store.showApps) {
        rules.push('[aria-label*="App"], [aria-label*="app"], [aria-label*="Command"], [aria-label*="command"] { display: none !important; }');
    }
    if (!settings.store.showSend) {
        rules.push('[aria-label*="Send message"], [aria-label*="Send Message"], [aria-label="Send"], [class*="sendButton"], button:has(svg path[d*="M2.01 21L23 12"]) { display: none !important; }');
    }
    if (!settings.store.showSeparator) {
        rules.push('[class*="separator_"], [class*="separator__"] { display: none !important; }');
    }

    el.textContent = rules.join("\n");
}

const contextMenuPatch = (children: any[]) => {
    const makeToggle = (id: string, label: string, settingKey: SettingKey) =>
        React.createElement(Menu.MenuCheckboxItem, {
            id: `toggle-${id}`,
            label,
            checked: Boolean(settings.store[settingKey]),
            action: () => {
                (settings.store as any)[settingKey] = !settings.store[settingKey];
                updateCSS();
            }
        });

    children.push(
        React.createElement(
            Menu.MenuGroup,
            null,
            React.createElement(
                Menu.MenuItem,
                { id: "chat-buttons-quick-menu", label: "Customize Buttons" },
                makeToggle("translate", "Translate Button", "showTranslate"),
                makeToggle("gift", "Gift Nitro Button", "showGift"),
                makeToggle("gif", "GIF Button", "showGif"),
                makeToggle("sticker", "Sticker Button", "showSticker"),
                makeToggle("emoji", "Emoji Button", "showEmoji"),
                makeToggle("apps", "Apps Button", "showApps"),
                makeToggle("send", "Send Button", "showSend"),
                makeToggle("separator", "Separator Line", "showSeparator")
            )
        )
    );
};

export default definePlugin({
    name: "HideChatButtons",
    description: "Allows toggling visibility of individual chat input buttons directly via context menu.",
    authors: [{ name: "User", id: 1170069375416533087n }],
    settings,

    start() {
        updateCSS();
        addContextMenuPatch("textarea-context", contextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("textarea-context", contextMenuPatch);
        const el = document.getElementById("vencord-hide-buttons-css");
        if (el) el.remove();
    }
});
