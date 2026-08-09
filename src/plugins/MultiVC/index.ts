/*
 * MultiVC
 *
 * Opens additional Discord windows using a named PERSISTENT
 * Electron profile.
 *
 * The default profile is:
 *
 *     persist:multivc-discord
 *
 * First-time setup:
 *   1. Open a MultiVC window.
 *   2. Log into Discord normally in that window.
 *   3. Close Discord completely.
 *   4. Start Discord again.
 *   5. Open MultiVC again.
 *
 * The MultiVC profile remains stored on disk, so the login
 * should remain available after restarting Discord.
 */


import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    partition: {
        type: OptionType.STRING,

        description:
            "Persistent profile used by all MultiVC windows",

        default:
            "persist:multivc-discord",

        placeholder:
            "persist:multivc-discord",
    },
});

const Native =
    VencordNative.pluginHelpers.MultiVC as PluginNative<
        typeof import("./native")
    >;

let button: HTMLDivElement | null = null;

let styleEl: HTMLStyleElement | null = null;

let onKeyDown:
    | ((event: KeyboardEvent) => void)
    | null = null;

const CSS = `
#multivc-btn {
    position: fixed;
    bottom: 18px;
    right: 18px;
    z-index: 9999;

    display: flex;
    align-items: center;
    gap: 8px;

    padding: 10px 16px;
    border-radius: 14px;

    background: linear-gradient(
        135deg,
        rgba(0, 240, 255, .35),
        rgba(112, 0, 255, .35)
    );

    backdrop-filter: blur(10px);

    border: 1px solid rgba(255, 255, 255, .15);

    color: #fff;
    font-weight: 600;
    font-size: 13px;

    cursor: pointer;
    user-select: none;

    box-shadow:
        0 0 18px rgba(0, 240, 255, .25);

    transition:
        transform 200ms cubic-bezier(.34, 1.56, .64, 1),
        box-shadow 250ms ease;
}

#multivc-btn:hover {
    transform: scale(1.08) translateY(-2px);

    box-shadow:
        0 0 26px rgba(0, 240, 255, .5);
}

#multivc-btn:active {
    transform: scale(.94);
}

#multivc-count {
    background:
        rgba(0, 0, 0, .35);

    border-radius: 8px;

    padding: 2px 8px;

    font-size: 12px;
}
`;

async function openTab() {
    try {
        /*
         * Vencord injects the IPC event automatically.
         *
         * Native function parameters exposed to the renderer are:
         *     url, partition
         *
         * We leave URL undefined and pass the configured partition.
         */
        const count =
            await Native.openDiscordTab(
                undefined,
                settings.store.partition,
            );

        const counter =
            document.getElementById(
                "multivc-count",
            );

        if (counter) {
            counter.textContent =
                String(count);
        }
    } catch (error) {
        console.error(
            "[MultiVC] Failed to open Discord tab:",
            error,
        );
    }
}

export default definePlugin({
    name: "MultiVC",

    description:
        "Open multiple Discord tabs to join VCs in different servers, stay in calls while using DMs, and use Discord more like you do in a browser.",

    authors: [
        {
            name: "_baka_baka",
            id: 876618279609843724n,
        },
    ],

    settings,

    start() {
        styleEl =
            document.createElement("style");

        styleEl.textContent = CSS;

        document.head.appendChild(
            styleEl,
        );

        button =
            document.createElement("div");

        button.id =
            "multivc-btn";

        button.innerHTML = `
            <span>+ New Discord Tab</span>
            <span id="multivc-count">0</span>
        `;

        button.onclick = () => {
            void openTab();
        };

        document.body.appendChild(
            button,
        );

        onKeyDown =
            (event: KeyboardEvent) => {
                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.key.toLowerCase() === "t"
                ) {
                    event.preventDefault();

                    void openTab();
                }
            };

        window.addEventListener(
            "keydown",
            onKeyDown,
        );
    },

    stop() {
        Native.closeAllTabs();

        button?.remove();
        button = null;

        styleEl?.remove();
        styleEl = null;

        if (onKeyDown) {
            window.removeEventListener(
                "keydown",
                onKeyDown,
            );
        }

        onKeyDown = null;
    },
});
