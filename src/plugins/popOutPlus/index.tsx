/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { ChannelRTCStore, Menu, SelectedChannelStore } from "@webpack/common";

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
                    action={() => findByProps("openCallTilePopout")?.openCallTilePopout(channelId, p.id)}
                />
            </Menu.MenuGroup>
        );
    }
};

export default definePlugin({
    name: "PopOut Plus",
    description: "Pop out streams and cameras",
    authors: [Devs.Ven, Devs.fantik],

    contextMenus: {
        "stream-context": (children, { stream }) => stream && patch(children, stream.ownerId, true),
        "user-context": (children, { user }) => user && patch(children, user.id, false)
    }
});
