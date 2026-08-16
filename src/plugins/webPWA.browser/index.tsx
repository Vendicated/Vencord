/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addThemeChangeListener, removeThemeChangeListener } from "@api/Themes";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin from "@utils/types";
import { FluxStore } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { NotificationSettingsStore, RelationshipStore, ThemeStore } from "@webpack/common";

import managedStyle from "./styles.css?managed";

const GuildReadStateStore: FluxStore & { getTotalMentionCount: () => number; hasAnyUnread: () => boolean; } = findStoreLazy("GuildReadStateStore");

let _keybinds: Record<string, { onTrigger: () => any; }>;

function colorToHex(color: string) {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return "#000000"; // no GPU, you'll have bigger issues than a miscolored title bar
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return "#" + [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)].map(n => n.toString(16).padStart(2, "0")).join("");
}

let linkEl: HTMLLinkElement | undefined;
async function setManifest() {
    // need to wait for CSS changes to flush
    await sleep(20);

    if (linkEl) {
        URL.revokeObjectURL(linkEl.href);
        linkEl.remove();
    }

    const endpoint = "https:" + window.GLOBAL_ENV.WEBAPP_ENDPOINT;
    const appUrl = endpoint + "/app"; // URL when PWA launches
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href;
    const styles = getComputedStyle(document.body);
    const manifest = {
        id: appUrl,
        name: "Discord",
        short_name: "Discord",
        start_url: appUrl,
        display: "fullscreen",
        display_override: ["window-controls-overlay"],
        dir: "ltr",
        lang: "en-US",
        background_color: colorToHex(styles.getPropertyValue("--background-base-lower")),
        theme_color: colorToHex(styles.getPropertyValue("--background-base-lowest")),
        scope: endpoint + "/", // scope of all possible URL"s
        description: "Imagine a place...",
        orientation: "any",
        categories: ["social"],
        shortcuts: [
            {
                name: "Friends",
                url: appUrl,
                icons: [{ src: icon, sizes: "256x256" }]
            }
        ],
        protocol_handlers: [{ protocol: "web+discord", url: endpoint + "/%s" }],
        launch_handler: { client_mode: "navigate-existing" },
        // Strange CDN but these links are straight from discord.com
        screenshots: [
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/664723dbe91e5ee8db15cfe7_Discord_Website_Refresh_Activities.webp", sizes: "691x720", type: "image/webp", label: "Activities", form_factor: "wide" },
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/664723da372be4a12a3dc9df_Discord_Website_Refresh_Hop-In.webp", sizes: "939x639", type: "image/webp", label: "Hop In", form_factor: "wide" },
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/664723da94dd30e64e74357a_Discord_Website_Refresh_StatusHover.webp", sizes: "904x708", type: "image/webp", label: "Status", form_factor: "wide" },
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/664723da0a2e6be98fa5216b_Discord_Website_Refresh_Emojis%2BSoundboard-p-1080.webp", sizes: "1080x918", type: "image/webp", label: "Emojis", form_factor: "wide" },
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/6638bdbd1150b7c8509fb2be_Discord_Website_Refresh_SameRoom.webp", sizes: "796x593", type: "image/webp", label: "Rooms", form_factor: "wide" },
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/68407334ccf9aeca71903bab_home-new.webp", sizes: "1716×1606", type: "image/webp", label: "Discord", form_factor: "wide" },
            { src: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/6638bcb99c2b8dc14e6f67fd_Discord_Website_Refresh_Platforms.webp", sizes: "760x580", type: "image/webp", label: "Platforms", form_factor: "wide" }
        ],
        icons: [
            {
                src: icon,
                sizes: "256x256",
                type: "image/png"
            },
            {
                src: icon,
                sizes: "256x256",
                type: "image/png",
                purpose: "maskable"
            }
        ]
    };

    linkEl = document.createElement("link");
    linkEl.rel = "manifest";
    linkEl.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/json" }));
    document.head.appendChild(linkEl);
}

export default definePlugin({
    name: "WebPWA",
    description: "Makes Discord installable as an App (PWA). Enables notification badges, global key-binds and Discord's custom title bar.",
    authors: [Devs.ThaUnknown],
    tags: ["Utility"],
    managedStyle,
    enabledByDefault: true,

    flux: {
        KEYBINDS_REGISTER_GLOBAL_KEYBIND_ACTIONS: ({ keybinds }: { keybinds: Record<string, { onTrigger: () => any; }>; }) => {
            _keybinds = keybinds;
        }
    },

    ctrl: new AbortController(),
    start() {

        // installability
        setManifest();
        // user might change theme before installing the PWA
        ThemeStore.addChangeListener(setManifest);
        addThemeChangeListener(setManifest);

        // notifications
        NotificationSettingsStore.addChangeListener(this.setBadge);
        GuildReadStateStore.addChangeListener(this.setBadge);
        RelationshipStore.addChangeListener(this.setBadge);

        if (!IS_USERSCRIPT) {
            // keybinds
            this.ctrl.abort();
            this.ctrl = new AbortController();
            window.addEventListener("message", ({ data }) => {
                if (data?.type === "vencord:keybinds" && _keybinds) {
                    const { meta } = data;
                    if (meta in _keybinds) _keybinds[meta].onTrigger();
                }
            }, this.ctrl);
        }
    },
    stop() {
        navigator.setAppBadge(0);
        this.ctrl.abort();

        if (linkEl) {
            URL.revokeObjectURL(linkEl.href);
            linkEl.remove();
        }
        ThemeStore.removeChangeListener(setManifest);
        removeThemeChangeListener(setManifest);

        NotificationSettingsStore.removeChangeListener(this.setBadge);
        GuildReadStateStore.removeChangeListener(this.setBadge);
        RelationshipStore.removeChangeListener(this.setBadge);
    },

    patches: [
        // Vesktop/src/renderer/patches/hideDownloadAppsButton.ts
        {
            find: '"app-download-button"',
            replacement: {
                match: /return(?=.{0,50}id:"app-download-button")/,
                replace: "return null;return"
            }
        },
        // Vesktop/blob/main/src/renderer/patches/enableNotificationsByDefault.ts
        {
            find: '"NotificationSettingsStore',
            replacement: {
                match: /\.isPlatformEmbedded(?=\?\i\.\i\.ALL)/g,
                replace: "$&||true"
            }
        },
        // Vesktop/src/renderer/patches/keybindButton.tsx
        {
            find: "#{intl::KEYBIND_IN_BROSWER_NOTICE}",
            replacement: {
                match: /,{type:"info",children:(?=.{0,50}?#{intl::KEYBIND_IN_BROSWER_NOTICE})/,
                replace: ',{type:"info",children:$self.renderKeybindsButton(),_children:',
                predicate: () => !IS_USERSCRIPT
            }
        }
    ],

    renderKeybindsButton: () => (
        <div>
            Custom global Push To X keybinds are supported. Navigate to <a onClick={() => { window.postMessage({ type: "OPEN_SHORTCUTS" }, "*"); }}>about://extensions/shortcuts</a> to change them. Hold To X keybinds are not supported.
        </div>
    ),

    // Vesktop/src/renderer/appBadge.ts
    setBadge: () => {
        try {
            const mentionCount = GuildReadStateStore.getTotalMentionCount();
            const pendingRequests = RelationshipStore.getPendingCount();
            const hasUnread = GuildReadStateStore.hasAnyUnread();
            const disableUnreadBadge = NotificationSettingsStore.getDisableUnreadBadge();

            let totalCount = mentionCount + pendingRequests;
            if (!totalCount && hasUnread && !disableUnreadBadge) totalCount = -1;

            navigator.setAppBadge(totalCount);
        } catch (e) {
            console.error(e);
        }
    }
});
