/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ClearViewStore } from "@plugins/popOutPlus/store";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { ParticipantType } from "@vencord/discord-types/enums/misc";
import { findByProps } from "@webpack";
import { ChannelRTCStore, Menu, React, SelectedChannelStore } from "@webpack/common";

import { PopOutPlusOverlay } from "./components/PopOutPlusOverlay";

export default definePlugin({
    name: "PopOut Plus",
    description: "Pop out streams and cameras with fullscreen support",
    authors: [Devs.prism, Devs.fantik],

    PopOutPlusOverlay,
    React,
    ClearViewStore,
    classes,

    start() { },
    stop() { },

    contextMenus: {
        "stream-context": (children, { stream }) => {
            const userId = stream?.ownerId;
            if (!userId) return;
            const channelId = SelectedChannelStore.getVoiceChannelId();
            if (!channelId) return;

            const p = ChannelRTCStore.getParticipants(channelId)?.find((p: any) =>
                p.user?.id === userId && p.type === ParticipantType.STREAM
            );

            if (p) {
                children.push(
                    <Menu.MenuGroup>
                        <Menu.MenuItem
                            id="popout-stream"
                            label="Pop Out Stream"
                            action={() => {
                                const popoutModule = findByProps("openCallTilePopout");
                                popoutModule?.openCallTilePopout(channelId, p.id);
                            }}
                        />
                    </Menu.MenuGroup>
                );
            }
        },
        "user-context": (children, { user }) => {
            const userId = user?.id;
            if (!userId) return;
            const channelId = SelectedChannelStore.getVoiceChannelId();
            if (!channelId) return;

            const p = ChannelRTCStore.getParticipants(channelId)?.find((p: any) =>
                p.user?.id === userId && p.type === ParticipantType.USER && (p.streamId || p.videoStreamId)
            );

            if (p) {
                children.push(
                    <Menu.MenuGroup>
                        <Menu.MenuItem
                            id="popout-camera"
                            label="Pop Out Camera"
                            action={() => {
                                const popoutModule = findByProps("openCallTilePopout");
                                popoutModule?.openCallTilePopout(channelId, p.id);
                            }}
                        />
                    </Menu.MenuGroup>
                );
            }
        }
    },

    patches: [
        {
            find: "data-popout-root",
            replacement: [
                {
                    match: /constructor\(\.\.\.(\i)\)\{super\(\.\.\.\1\),/,
                    replace: "$& $self.ClearViewStore.subscribe(() => this.forceUpdate()),"
                },
                {
                    match: /\(0,(\i)\.jsxs\)\("div",\{className:(\i)\.(\i),children:\[/,
                    replace: '(0,$1.jsxs)("div",{className:$self.classes($2.$3, $self.ClearViewStore.isClearView(this.props.windowKey) && "vc-popout-clear-view"),children:[(0,$1.jsx)($self.PopOutPlusOverlay, { popoutKey: this.props.windowKey }),'
                }
            ]
        }
    ]
});
