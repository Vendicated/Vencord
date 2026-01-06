/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { ChannelRTCStore, FluxDispatcher, Menu, PopoutWindowStore, React, SelectedChannelStore } from "@webpack/common";
import { createRoot } from "@webpack/common/react";

import { PopOutPlusOverlay } from "./components/PopOutPlusOverlay";

const POPOUT_KEY_PREFIX = "DISCORD_CALL_TILE_POPOUT";

const getCallTilePopoutKeys = (): string[] => {
    const keys = PopoutWindowStore?.getWindowKeys() ?? [];
    return keys.filter(k => k.startsWith(POPOUT_KEY_PREFIX));
};

const injectReactToPopout = (popoutWindow: Window, popoutKey: string) => {
    const doc = popoutWindow.document;

    if (doc.getElementById("vc-popout-plus-root")) {
        return;
    }

    // Wait for app-mount to be available
    const waitForAppMount = setInterval(() => {
        const appMount = doc.getElementById("app-mount");
        if (appMount) {
            clearInterval(waitForAppMount);

            const rootDiv = doc.createElement("div");
            rootDiv.id = "vc-popout-plus-root";
            appMount.appendChild(rootDiv);

            const root = createRoot(rootDiv);
            root.render(<PopOutPlusOverlay popoutKey={popoutKey} />);
        }
    }, 100);

    setTimeout(() => clearInterval(waitForAppMount), 5000);
};

const patch = (children: any[], userId: string, isStream: boolean) => {
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (!channelId) return;

    const p = ChannelRTCStore.getParticipants(channelId)?.find((p: any) =>
        p.user?.id === userId && (isStream ? p.type === 0 : (p.type === 2 && (p.streamId || p.videoStreamId)))
    );

    if (p) {
        children.push(
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id={isStream ? "popout-stream" : "popout-camera"}
                    label={isStream ? "Pop Out Stream" : "Pop Out Camera"}
                    action={() => {
                        const popoutModule = findByProps("openCallTilePopout");
                        popoutModule?.openCallTilePopout(channelId, p.id);
                    }}
                />
            </Menu.MenuGroup>
        );
    }
};

const onPopoutWindowOpen = (event: any) => {
    if (!event.key?.startsWith(POPOUT_KEY_PREFIX)) {
        return;
    }

    setTimeout(() => {
        const popoutWindow = PopoutWindowStore?.getWindow(event.key);
        if (popoutWindow) {
            injectReactToPopout(popoutWindow, event.key);
        }
    }, 500);
};

export default definePlugin({
    name: "PopOut Plus",
    description: "Pop out streams and cameras with fullscreen support (press F or F11 in popout)",
    authors: [Devs.Ven, Devs.fantik],

    start() {
        FluxDispatcher.subscribe("POPOUT_WINDOW_OPEN", onPopoutWindowOpen);

        // Inject into any already-open popouts
        setTimeout(() => {
            const keys = getCallTilePopoutKeys();
            keys.forEach(key => {
                const popoutWindow = PopoutWindowStore?.getWindow(key);
                if (popoutWindow) {
                    injectReactToPopout(popoutWindow, key);
                }
            });
        }, 100);
    },

    stop() {
        FluxDispatcher.unsubscribe("POPOUT_WINDOW_OPEN", onPopoutWindowOpen);

        // Cleanup: Removing roots from windows is optional as they will be closed eventually,
        // but for a clean "stop" we could iterate open popouts if needed.
    },

    contextMenus: {
        "stream-context": (children, { stream }) => stream && patch(children, stream.ownerId, true),
        "user-context": (children, { user }) => user && patch(children, user.id, false)
    }
});
