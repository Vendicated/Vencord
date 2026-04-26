/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { EyeIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, FluxDispatcher, Menu } from "@webpack/common";

const hideMessage = (messageId: string, channelId: string) => {
    FluxDispatcher.dispatch({
        type: "MESSAGE_DELETE",
        id: messageId,
        channelId,
        mlDeleted: true,
    });
};

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-hidemessages"
            label="Hide"
            icon={EyeIcon}
            action={() => hideMessage(message.id, message.channel_id)}
        />
    ));
};

const settings = definePluginSettings({
    hidePopoverButton: {
        type: OptionType.BOOLEAN,
        description: "Hide the hide button in the message popover.",
        default: false
    }
});

export default definePlugin({
    name: "HideMessages",
    description: "A plugin to temporarily hide messages until you restart.",
    dependencies: ["MessagePopoverAPI"],
    tags: ["Chat", "Utility"],
    authors: [EquicordDevs.yash],
    contextMenus: {
        "message": messageCtxPatch
    },
    settings,
    messagePopoverButton: {
        icon: EyeIcon,
        render(message: Message) {
            if (settings.store.hidePopoverButton) return null;
            return {
                label: "Hide",
                icon: EyeIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => hideMessage(message.id, message.channel_id)
            };
        }
    }
});
