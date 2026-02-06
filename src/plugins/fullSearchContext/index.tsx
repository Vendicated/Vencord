/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { NoopComponent } from "@utils/react";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { filters, findByCodeLazy, waitFor } from "@webpack";
import { ChannelStore, ContextMenuApi, UserStore } from "@webpack/common";

const useMessageMenu = findByCodeLazy(".MESSAGE,commandTargetId:");

interface CopyIdMenuItemProps {
    id: string;
    label: string;
}

let CopyIdMenuItem: (props: CopyIdMenuItemProps) => React.ReactElement | null = NoopComponent;
waitFor(filters.componentByCode('"cannot copy null text"'), m => CopyIdMenuItem = m);

function MessageMenu({ message, channel, onHeightUpdate }) {
    const canReport = message.author &&
        !(message.author.id === UserStore.getCurrentUser().id || message.author.system);

    return useMessageMenu({
        navId: "message-actions",
        ariaLabel: getIntlMessage("MESSAGE_UTILITIES_A11Y_LABEL"),

        message,
        channel,
        canReport,
        onHeightUpdate,
        onClose: () => ContextMenuApi.closeContextMenu(),

        textSelection: "",
        favoriteableType: null,
        favoriteableId: null,
        favoriteableName: null,
        itemHref: void 0,
        itemSrc: void 0,
        itemSafeSrc: void 0,
        itemTextContent: void 0,

        isFullSearchContextMenu: true
    });
}

interface MessageActionsProps {
    message: Message;
    isFullSearchContextMenu?: boolean;
}

const contextMenuPatch: NavContextMenuPatchCallback = (children, props: MessageActionsProps) => {
    if (props?.isFullSearchContextMenu == null) return;

    const group = findGroupChildrenByChildId("devmode-copy-id", children, true);
    group?.push(
        CopyIdMenuItem({ id: props.message.author.id, label: getIntlMessage("COPY_ID_AUTHOR") })
    );
};

migratePluginSettings("FullSearchContext", "SearchReply");
export default definePlugin({
    name: "FullSearchContext",
    description: "Makes the message context menu in message search results have all options you'd expect",
    authors: [Devs.Ven, Devs.Aria],

    patches: [{
        find: "onClick:this.handleMessageClick,",
        replacement: {
            match: /this(?=\.handleContextMenu\(\i,\i\))/,
            replace: "$self"
        }
    }],

    handleContextMenu(event: React.MouseEvent, message: Message) {
        const channel = ChannelStore.getChannel(message.channel_id);
        if (!channel) return;

        event.stopPropagation();

        ContextMenuApi.openContextMenu(event, contextMenuProps =>
            <MessageMenu
                message={message}
                channel={channel}
                onHeightUpdate={contextMenuProps.onHeightUpdate}
            />
        );
    },

    contextMenus: {
        "message-actions": contextMenuPatch
    }
});
