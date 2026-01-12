/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { PopoutStore } from "@plugins/popOutPlus/store";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { ParticipantType } from "@vencord/discord-types/enums/misc";
import { findByProps } from "@webpack";
import { ChannelRTCStore, Menu, React, SelectedChannelStore } from "@webpack/common";

import { PopOutPlusOverlay } from "./components/PopOutPlusOverlay";


function addPopoutMenuItem(
    children: React.ReactNode[],
    userId: string | undefined,
    participantType: number,
    menuId: string,
    label: string,
    extraCheck?: (p: any) => boolean
) {
    if (!userId) return;
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (!channelId) return;

    const participant = ChannelRTCStore.getParticipants(channelId)?.find((p: any) =>
        p.user?.id === userId && p.type === participantType && (extraCheck?.(p) ?? true)
    );

    if (participant) {
        children.push(
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id={menuId}
                    label={label}
                    action={() => {
                        const popoutModule = findByProps("openCallTilePopout");
                        popoutModule?.openCallTilePopout(channelId, participant.id);
                    }}
                />
            </Menu.MenuGroup>
        );
    }
}

export default definePlugin({
    name: "PopOut Plus",
    description: "Pop out streams and cameras with fullscreen support",
    authors: [Devs.prism, Devs.fantik],

    PopOutPlusOverlay,
    React,
    PopoutStore,
    classes,

    start() { },
    stop() { },

    contextMenus: {
        "stream-context"(children, { stream }) {
            addPopoutMenuItem(children, stream?.ownerId, ParticipantType.STREAM, "popout-stream", "Pop Out Stream");
        },
        "user-context"(children, { user }) {
            addPopoutMenuItem(children, user?.id, ParticipantType.USER, "popout-camera", "Pop Out Camera", p => !!(p.streamId || p.videoStreamId));
        }
    },

    patches: [
        {
            find: "data-popout-root",
            replacement: [
                {
                    match: /constructor\(\.\.\.(\i)\)\{super\(\.\.\.\1\),/,
                    replace: "$& $self.PopoutStore.subscribe(() => this.forceUpdate()),"
                },
                {
                    match: /\(0,(\i)\.jsxs\)\("div",\{className:(\i)\.(\i),children:\[/,
                    replace: '(0,$1.jsxs)("div",{className:$self.classes($2.$3, $self.PopoutStore.isClearView(this.props.windowKey) && "vc-popoutplus-clear-view", $self.PopoutStore.isDragging(this.props.windowKey) && "vc-popoutplus-dragging"),children:[(0,$1.jsx)($self.PopOutPlusOverlay, { popoutKey: this.props.windowKey }),'
                }
            ]
        },
        // Patch DirectVideo to expose video element for auto-fit functionality
        {
            find: '"DirectVideo"',
            replacement: {
                // Match: container.appendChild(videoElement)
                match: /\.appendChild\((\i)\),/,
                // Store video on its own window (popout) via ownerDocument.defaultView
                replace: ".appendChild($1),($1.ownerDocument.defaultView.__vc_popout_video=$1),"
            }
        }
    ]
});
