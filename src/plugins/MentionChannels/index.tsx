/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId,NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import { Channel } from "discord-types/general";

export default definePlugin({
    name: "MentionChannels",
    description: "Adds a context menu button to send a hyperlink to a channel in the message bar.",
    authors:
    [
        Devs.Samwich
    ],
    start()
    {
        addContextMenuPatch("channel-context", Patch);
    },
    stop()
    {
        removeContextMenuPatch("channel-context", Patch);
    }
});


const Patch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => () => {
    const group = findGroupChildrenByChildId("channel-copy-link", children);
    group?.push(
        <Menu.MenuItem id="hyperlinkchannel" label="Mention" action={() => insertTextIntoChatInputBox(` <#${channel.id}> `)}></Menu.MenuItem>
    );
};
