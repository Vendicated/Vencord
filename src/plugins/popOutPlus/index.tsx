/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ensurePopoutRoot } from "@plugins/popOutPlus/utils/windowInteractions";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ParticipantType } from "@vencord/discord-types/enums/misc";
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
    ensurePopoutRoot(popoutWindow, rootDiv => {
        const root = createRoot(rootDiv);
        root.render(<PopOutPlusOverlay popoutKey={popoutKey} />);
    });
};

const patch = (children: any[], userId: string, isStream: boolean) => {
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (!channelId) return;

    const p = ChannelRTCStore.getParticipants(channelId)?.find((p: any) =>
        p.user?.id === userId && (isStream ? p.type === ParticipantType.STREAM : (p.type === ParticipantType.USER && (p.streamId || p.videoStreamId)))
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

const attemptPopoutInjection = (key: string, attempt = 0) => {
    if (attempt > 20) return;

    if (PopoutWindowStore.isWindowFullyInitialized(key)) {
        const popoutWindow = PopoutWindowStore.getWindow(key);
        if (popoutWindow) {
            injectReactToPopout(popoutWindow, key);
        }
    } else {
        setTimeout(() => attemptPopoutInjection(key, attempt + 1), 100);
    }
};

const onPopoutWindowOpen = (event: any) => {
    if (!event.key?.startsWith(POPOUT_KEY_PREFIX)) {
        return;
    }

    attemptPopoutInjection(event.key);
};

export default definePlugin({
    name: "PopOut Plus",
    description: "Pop out streams and cameras with fullscreen support",
    authors: [Devs.prism, Devs.fantik],

    start() {
        FluxDispatcher.subscribe("POPOUT_WINDOW_OPEN", onPopoutWindowOpen);

        const keys = getCallTilePopoutKeys();
        keys.forEach(key => attemptPopoutInjection(key));
    },

    stop() {
        FluxDispatcher.unsubscribe("POPOUT_WINDOW_OPEN", onPopoutWindowOpen);
    },

    contextMenus: {
        "stream-context": (children, { stream }) => stream && patch(children, stream.ownerId, true),
        "user-context": (children, { user }) => user && patch(children, user.id, false)
    }
});
